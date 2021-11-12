const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
var cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;

//firebase jwt token 

var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

async function varifyToken(req,res,next) {
    if(req?.headers.authorization?.startsWith("Bearer ")){
        const token = req.headers.authorization.split(" ")[1];

        try{
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }   
        catch{

        }
    }
    next();
}


//DB Connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w2qch.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//node mongodb connect
async function run() {
    try{
        await client.connect();
        // console.log("Database connect successfully");

        //create database collection
        const database = client.db("doctors_portal");
        const appointmentCollection = database.collection("appointments");
        const userCollection = database.collection("users");

        //api post 
        app.post("/appointments",async(req,res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            console.log(appointment,result);
            res.json(result);
        })

        //api post for users
        app.post("/users",async(req,res)=>{
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.json(result);
        })

        //api update or add for user
        app.put("/users",async(req,res)=>{
            const user = req.body;
            console.log(user);
            const filter = {email: user.email};
            const options = {upsert: true};
            const updateDoc = {
                $set:user
            };
            const result = await userCollection.updateOne(filter,updateDoc,options);
            res.json(result);
        })

        //api update only for role set 
        app.put("/users/admin",varifyToken,async(req, res)=>{
            const user = req.body;
            // console.log("put",req.decodedEmail);
            const requester = req.decodedEmail;
            if(requester){
                const requesterAccount = await userCollection.findOne({email:requester})
                if(requesterAccount.role === "admin"){
                    const filter = {email: user.email}
                    const updateDoc = {
                        $set:{role:"admin"}
                    };
                    const result = await userCollection.updateOne(filter,updateDoc);
                    res.send(result);
                }
                else{
                    res.status(403).json({message:"you do not have access to make admin"});
                }
            }
       
        })

        //api get for admin only
        app.get("/users/:email", async(req,res)=>{
            const email = req.params.email;
            const query = {email: email};
            const user = await userCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === "admin"){
               isAdmin = true;
            }
            res.json({admin: isAdmin});

        })

        //api get 
        app.get("/appointments",async(req,res)=>{
            const email = req.query.email;
            const date = req.query.date;
            console.log(date);
            const query = {email:email,date:date};
            // console.log(query);
            const cursor = appointmentCollection.find(query);
            const result = await cursor.toArray();
            res.json(result);
            console.log(result);
        })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Hello Doctors Portal!");
})

app.listen(port,()=>{
    console.log("listening on port",port);
})