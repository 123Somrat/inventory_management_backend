require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY });
// middleware
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const products = database.collection("product");
    // create productCart collections
    const carts = database.collection("carts");
    // create sales Collections
    const salescollections = database.collection("salescollection");

    // all get methods
     
    app.get("/users",async(req,res)=>{
         const query = req.query;
         const user =await users.findOne(query);
      
        res.status(200).send(user)

    })


    // checking user have store or not
    app.get("/shops", async (req, res) => {
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
    app.get("/productcount", async (req, res) => {
      const useremail = req.query.email;
      const query = { useremail };
      const count = await products.find(query).toArray();
      res.send(count);
    });

    // get all product
    app.get("/products", async (req, res) => {
      const useremail = req.query.email;
      const query = { useremail };
      const productList = await products.find(query).toArray();
      res.status(200).send(productList);
    });

    // get a single product from product collection
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await products.findOne(query);
      res.status(200).send(product);
    });
    // get all cart product from carts
    app.get("/carts", async (req, res) => {
      const query = req.query;
      const cart = await carts.find(query).toArray();
      const productId = cart.map(
        (cartItem) => new ObjectId(cartItem.productId)
      );

      // get the product from product collectionn useing aggregator
      const cartProduct = await products
        .aggregate([
          {
            $match: {
              _id: { $in: productId },
            },
          },
        ])
        .toArray();

      res.send(cartProduct);
    });

    // get sales summary

    app.get("/salessummary", async (req, res) => {
     
      const query = req.query;
      const salesDetails = await salescollections.findOne(query);
      const saledProductId = salesDetails?.saledproductId;
      const productId = saledProductId?.map(
        (productsids) => new ObjectId(productsids)
      );

      const salesProductCount = await products
        .aggregate([
          {
            $match: {
              _id: { $in: productId },
            },
          },
        ])
        .toArray();

      //const saledProductsId =  saledProductData.map(products=>(products.saledproductId))
      // Calculate production cost for those selling items
      const totalInvest = salesProductCount.reduce((int, cur) => {
        return int + cur.productioncost * cur.saleCount;
      }, 0);

      // Total sales
      const totalSales = salesProductCount.reduce((int, cur) => {
        return int + cur.sellingPrice * cur.saleCount;
      }, 0);

      // Total profit
      const totalprofit = totalSales - totalInvest;

      res.status(200).send({ totalInvest, totalSales, totalprofit });
    });

    // sales History route

    app.get("/saleshistory", async (req, res) => {
      const query = req.query;
      const salesHistory = await salescollections.findOne(query);

      const salesProductid = salesHistory?.saledproductId?.map(
        (productId) => new ObjectId(productId)
      );
      const saledproductId = salesHistory?.saledproductId;

      /*
    const result = await salescollections.aggregate([
        {
           $unwind : "$saledproductId"
        },
        {
          $lookup: {
            from: 'products',
            localField: 'saledproductId',
            foreignField: '_id',
            as: 'joinedData'
          }
        },
  



    ]).toArray()

*/

      const salesProductHistory = await products
        .aggregate([
          {
            $match: {
              _id: { $in: salesProductid },
            },
          },
        ])
        .toArray();

      const salesDate = salesHistory.salesDate;

      // console.log(salesProductHistory)
      res.status(200).send(salesProductHistory);

      const totalInvest = salesProductHistory.reduce((int, cur) => {
        return int + cur.productioncost * cur.saleCount;
      }, 0);

      const totalSales = salesProductHistory.reduce((int, cur) => {
        return int + cur.sellingPrice * cur.saleCount;
      }, 0);

      // Total profit
      const totalprofit = totalSales - totalInvest;
    });


// admin gets routes

// permission check middleware
const haspermission = (req,_res,next)=>{
    const email = req.query.useremail;
   if(email==="mdjafaruddin738@gmail.com"){
       next()
   }else{
       req.status(403).send({msg : "Opps something wrong"})
   }
}
// get all users for admins
app.get("/allusers",haspermission,async(req,res)=>{

   const allusers =await users.find().toArray();
   res.status(200).send(allusers)
})

// get all shops for admin

app.get("/allshops",haspermission,async(req,res)=>{
 
     const allShops = await shops.find().toArray()
      res.status(200).send(allShops)
})










    // all post method here

    // add user in db
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      // set user status when first user created in our db
      userInfo.status="pending";
      // set user role when first user is created in db
      userInfo.role = "user"
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
      console.log(haveStore);
      if (haveStore) {
        res.status(409).send({ error: "already have store" });
      } else {
        const shop = await shops.insertOne(shopInfo);
        res.status(201).send(shop);
      }
    });

    app.post("/products", async (req, res) => {
      // gether productInfo from request body
      const productInfo = req.body;
      const {
        useremail,
        productname,
        imageUrl,
        productlocation,
        profitmargin,
        productquantity,
        productioncost,
        discount,
        productdescription,
      } = productInfo;
      const findShopQuery = { useremail };
      const date = new Date();
      const day = date.getDay();
      const month = date.getMonth();
      const year = date.getFullYear();
      const productAddingDate = `${day}:${month}:${year}`;
      // get the shop details for current user
      const {
        _id: shop_id,
        shopname,
        productLimit,
      } = await shops.findOne(findShopQuery);

      // calculate product selling price depends on users data;
      const tax = 7.5;
      const sellingPrice =
        productioncost +
        (productioncost * tax) / 100 +
        (productioncost * profitmargin) / 100;

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
        saleCount: 0,
      };
      // query for how many product user already addes in db
      const query = { useremail };
      const createdShopCount = await products.find(query).toArray();
      const createStore = createdShopCount.length;
      console.log(createStore);
      if (createStore < productLimit) {
        const productCreateInfo = await products.insertOne(product);
        res.status(201).send(productCreateInfo);
      } else {
        res.status(403).send("opps your product create limit exceed");
      }
    });

    // add product in cart
    app.post("/carts", async (req, res) => {
      const productData = req.body;
      // checking item alredy in cart or not
      const query = productData.productId;
      const itemExeist = await carts.findOne({ productId: query });

      // if product not in cart then we add this product on cart collections else we not
      if (!itemExeist) {
        const cart = await carts.insertOne(productData);
        res.status(201).send(cart);
      } else {
        res.status(409).send({ msg: "peoduct already in cart" });
      }
    });

    app.post("/salescollections", async (req, res) => {
      const saledProduct = req.body;
      const salesProductId = saledProduct.saledproductId.map(
        (salesproduct) => new ObjectId(salesproduct)
      );
      // insert the product on salesCollection
      const salesInfo = salescollections.insertOne(saledProduct);

      /*
    const incrementSalesProductCount =await products.aggregate([
         {
          $match : {
            _id : {$in : salesProductId}
          }

         }

    ]).toArray()
    */
      // find the product useing id and then increment the salesCount and decrement the product quantity
      const incrementSalesProductCount = await products.updateMany(
        { _id: { $in: salesProductId } },
        {
          $inc: {
            saleCount: 1,
            productquantity: -1,
          },
        }
      );

      // delete cart items for this specific user after
      const query = { useremail: saledProduct?.useremail };
      const deletedAllCartItems = await carts.deleteMany(query);
      if (deletedAllCartItems.deletedCount > 0) {
        res.status(200).send(deletedAllCartItems);
      } else {
        res.status(500).send({ msg: "Internal server error" });
      }
    });

// send Promotional email
 // create reusable transporter object using the default SMTP transport
app.post("/sendemail",async(req,res)=>{
    const email = req.query.adminEmail;
    const query = {email};
    const useremail = req.body
    //  find user it is admin or not by email
     const user = await users.findOne(query);
     const isAdmin = user.role==="admin";


     if(isAdmin){
      mg.messages.create(process.env.MAILGUN_DOMAIN , {
        from: "Excited User <mailgun@sandbox-123.mailgun.org>",
        to: ["mdjafaruddinsomrat@gmail.com"],
        subject: "Hello",
        text: "Testing some Mailgun awesomness!",
        html: "<h1>Testing some Mailgun awesomness!</h1>"
      })
      .then(msg =>{
           res.status(200).send(msg)
      }
        ) // logs response data
      .catch(err => {
           res.status(510).send(err)
      })



     }
     

    
    
     /*
    
    */
})










    // patch mathod is here

    app.patch("/products/:id", async (req, res) => {
      const id = req.params;
      const updatedProductInfos = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedProductInfo = {
        $set: {
          productname: updatedProductInfos.productname,
          imageUrl: updatedProductInfos.imageUrl,
          productlocation: updatedProductInfos.productlocation,
          profitmargin: updatedProductInfos.profitmargin,
          productquantity: updatedProductInfos.productquantity,
          productioncost: updatedProductInfos.productioncost,
          discount: updatedProductInfos.discount,
          productdescription: updatedProductInfos.productdescription,
        },
      };
      const updatedProduct = await products.updateOne(
        query,
        updatedProductInfo
      );

      if (updatedProduct.modifiedCount > 0) {
        res.status(200).send(updatedProduct);
      } else {
        res.status(500).send("Opps something is wrong");
      }
    });

    // change user status
    app.patch("/changeuserstatus",async(req,res)=>{
         const query = req.query;
         const updatedUserInfo = {
            $set : {
               status : "accepted"
            }
         }
    const infoUserStatusChanged =await users.updateOne(query,updatedUserInfo);
       res.status(204).send(infoUserStatusChanged)
    })

    // all delete Method is here

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const deletetedProduct = await products.deleteOne(query);
      res.status(200).send(deletetedProduct);
    });

    // health check route
    app.get("/health", (req, res) => {
      res.send("everzthing is oke")
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
  console.log("app is listenting on port", PORT)
});
