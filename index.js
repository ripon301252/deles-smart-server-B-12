require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// firebase admin
const admin = require("firebase-admin");
const serviceAccount = require("./deals-smart-firebase-admin-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());
const verifyFireBaseToken = async (req, res, next) => {
  console.log("in the verify middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    // do not allow to go
    return res.status(401).send({ message: "unauthorized access headers" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access token" });
  }

  // verify id token
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log("token validation", userInfo);
    next();
  } catch {
    console.log("Invalid token");
    return res
      .status(401)
      .send({ message: "unauthorized access token not verified" });
  }
};
const verifyJWTToken = (req, res, next)=>{
  // console.log('in middleware', req.headers)
  const authorization = req.headers.authorization;
  if(!authorization){
     return res.status(401).send({ message: "unauthorized access headers" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access token" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
    if(err){
       return res.status(401).send({ message: "unauthorized access token" });
    }
    console.log('after decoded', decoded)
    req.token_email = decoded.email
    next()
  })
  
}

// mongodb part
const uri =
  "mongodb+srv://deals-smart-db:KqWKPEvtfKN1sHLB@cluster0.w0nmtjl.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Deals Smart server is Running");
});

app.get("/private", (req, res) => {
  res.send("Private deals smart running");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("deals_smart_db");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const usersCollection = db.collection("users");

    // jwt related api
    app.post("/getJwtToken", (req, res) => {
      const loggedUser = req.body;
      const jwtToken = jwt.sign(loggedUser, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token: jwtToken });
    });

    // users api
    app.post("/users", async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({
          message: "User already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }

      // const result = await usersCollection.insertOne(newUser)
      // res.send(result);
    });

    // all get
    app.get("/products", async (req, res) => {
      // const projectFields = {_id: 0, title: 1, price_min: 1, price_max: 1, location: 1, status: 1 }
      // const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(2).project(projectFields);
      console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // single get
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // create (send)
    app.post("/products", verifyFireBaseToken, async (req, res) => {
      console.log('headers in the post', req.headers)
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // all update
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          // updatedProduct
          name: updatedProduct.name,
          price: updatedProduct.price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    // delete
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // bids
    // app.get("/bids", verifyJWTToken,  async (req, res) => {
    //   // console.log("headers", req.headers);
    //   const email = req.query.email;
    //   const query = {};
    //   if (email) {
    //     query.buyer_email = email;
    //   }
    //   // verify user have access to see this data
    //   if(email !== req.token_email){
    //      return res.status(403).send({message: 'forbidden access'})
    //   }

    //   const cursor = bidsCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });


    // all-bids related api with firebase token verify
    app.get("/bids", verifyFireBaseToken, async (req, res) => {
      // console.log('headers', req.headers)
      console.log('headers', req)
      const email = req.query.email;
      const query = {};
      if (email){
        if(email !== req.token_email){
          return res.status(403).send({message: 'forbidden access'})
        }
        query.buyer_email = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


    // single-bids
    app.get(
      "/products/bids/:productId",
      verifyFireBaseToken,
      async (req, res) => {
        const productId = req.params.productId;
        const query = { product: productId };
        const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
        const result = await cursor.toArray();
        res.send(result);
      }
    );

    // bids-post
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    // bids-delete
    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    // ping
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Deals Smart Server listening on port ${port}`);
});

// client.connect()
// .then(() => {
//   app.listen(port, () => {
//     console.log(`Deals Smart Server listening on port: ${port}`);
//   })
// })
// .catch(console.dir)
