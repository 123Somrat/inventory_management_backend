require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
// middleware
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion } = require("mongodb");
const { Carousel } = require("flowbite-react");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.6bozc1k.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // create db
    const database = client.db("inventory_management");
    // create users collection
    const users = database.collection("users");
    // create shops collection
    const shops = database.collection("shops");
    // create product collections
    const products = database.collection("product")



    // all get methods

    // checking user have store or not
    app.get("/users", async (req, res) => {
      const useremail = req?.query?.email;
      const query = { useremail };
      // checking user have store or not
      const hasStore = await shops.findOne(query);
     // if user have to store then we send the store data
      if (hasStore) {
        res.send(hasStore);
      } 
      // else send an emty array
      else {
        res.send([]);
      }
    });


    // get product count means how many prooduct i have in products collection
    app.get("/productcount",async(req,res)=>{
       const useremail = req.query.email
        const query = {useremail}
        const count = await products.find(query).toArray()
        res.send(count)
    })


    // get all product
    app.get("/products",async(req,res)=>{
      const useremail = req.query.email;
      const query = {useremail};
      const productList  =await products.find(query).toArray()
       res.status(200).send(productList)


    })






    // all post method here

    // add user in db
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const user = await users.insertOne(userInfo);
      res.status(201).send(user);
    });

    // add shop in db
    app.post("/createshop", async (req, res) => {
      // store limit

      const shopInfo = req.body;
      shopInfo.productLimit = 3;
      const { useremail } = shopInfo;
      const query = { useremail };
      const haveStore = await shops.findOne(query);
      if (haveStore) {
        res.status(409).send({ error: "already have store" });
      } else {
        const shop = await shops.insertOne(shopInfo);
        res.status(201).send(shop);
      }
    });

   app.post("/products",async(req,res)=>{
    // gether productInfo from request body
       const productInfo = req.body;
       const {useremail,productname,imageUrl,productlocation,profitmargin,productquantity,productioncost,discount,productdescription,} = productInfo;
        const findShopQuery = {useremail}
        const date= new Date();
        const day = date.getDay();
        const month = date.getMonth();
        const year = date.getFullYear();
        const productAddingDate = `${day}:${month}:${year}`;
        // get the shop details for current user
        const {_id:shop_id,shopname,productLimit} = await shops.findOne(findShopQuery);
        
         // calculate product selling price depends on users data;
         const tax = 7.5;
         const sellingPrice = productioncost + (productioncost*tax/100) + (productioncost*profitmargin/100)
          

         // create product object 
         const product = {
             shop_id,
             shopname,
             useremail,
             productname,
             imageUrl,
             productlocation,
             profitmargin,
             productquantity,
             productioncost,
             discount,
             productdescription,
             productAddingDate,
             sellingPrice,
             saleCount:0
         }
         // query for how many product user already addes in db
         const query = {useremail}
         const createdShopCount = await products.find(query).toArray();
         const createStore = createdShopCount.length;

         if(createStore<productLimit){
           const productCreateInfo = await products.insertOne(product);
           res.status(201).send(productCreateInfo)
         }else{
            res.status(403).send("opps your product create limit exceed")
         }
          
   })



    // health check route
    app.get("/health", (req, res) => {
      res.send("everzthing is oke");
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log("app is listenting on port", PORT);
});
