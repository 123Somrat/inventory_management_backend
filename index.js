require("dotenv").config();
const express = require("express");
const app = express ();
const cors = require("cors");
// middleware
app.use(express.json())
app.use(cors())
const PORT = process.env.PORT || 3000;


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME }:${process.env.DB_PASSWORD}@cluster0.6bozc1k.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

     // create db
    const database = client.db("inventory_management");
    // create users collection
    const users = database.collection("users");


    // all post method here
    app.post("/users",async(req,res)=>{
       const userInfo = req.body;
       const user =await users.insertOne(userInfo)
       res.status(201).send(user)

    })






// health check route
    app.get("/health",(req,res)=>{
        res.send("everzthing is oke")
  })










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);



app.listen(PORT,()=>{
     console.log("app is listenting on port",PORT)
})








