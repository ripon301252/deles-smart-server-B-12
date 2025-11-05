const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());


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

    const db = client.db('deals_smart_db');
    const productsCollection = db.collection('products');
    const bidsCollection = db.collection('bids')
    const usersCollection = db.collection('users')


    app.post('/users', async(req, res)=>{
      const newUser = req.body;

      const email = req.body.email;
      const query = { email: email }
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        res.send({message: 'User already exits. do not need to insert again'})
      }
      else{
        const result = await usersCollection.insertOne(newUser)
        res.send(result);
      }

      // const result = await usersCollection.insertOne(newUser)
      // res.send(result);
    })


    // all get
    app.get('/products', async(req, res)=>{
        // const projectFields = {_id: 0, title: 1, price_min: 1, price_max: 1, location: 1, status: 1 }
        // const cursor = productsCollection.find().sort({price_min: -1}).skip(2).limit(2).project(projectFields);
        console.log(req.query)
        const email = req.query.email;
        const query = {}
        if(email){
          query.email = email;
        }

        const cursor = productsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result)
    })

    
    app.get('/latest-products', async(req, res)=>{
      const cursor = productsCollection.find().sort({created_at: -1}).limit(6);
      const result = await cursor.toArray();
      res.send(result)
    })

    // single get
    app.get('/products/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await productsCollection.findOne(query)
        res.send(result)
    })



    // create (send)
    app.post('/products', async(req, res)=>{
        const newProduct = req.body;
        const result = await productsCollection.insertOne(newProduct);
        res.send(result)
    })


    // all update 
    app.patch('/products/:id', async(req, res)=>{
        const id = req.params.id
        const updatedProduct = req.body;
        const query = { _id: new ObjectId(id)}
        const update = {
            $set: {
                // updatedProduct
                name: updatedProduct.name,
                price: updatedProduct.price,
            }
        }
        const result = await productsCollection.updateOne(query, update)
        res.send(result)
    })

    // delete
    app.delete('/products/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id)}
        const result = await productsCollection.deleteOne(query)
        res.send(result)
    })

    // all-bids related api
    app.get('/bids', async(req, res)=>{

      const email = req.query.email
      const query = {}
      if(email){
        query.buyer_email = email
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    // single-bids
    app.get('/bids/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bidsCollection.findOne(query)
      res.send(result)
    })

    // bids-post
    app.post('/bids', async(req,res)=>{
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    })

    // bids-delete
    app.delete('/bids/:id', async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    })


    // ping
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Deals Smart Server listening on port ${port}`)
})


// client.connect()
// .then(() => {
//   app.listen(port, () => {
//     console.log(`Deals Smart Server listening on port: ${port}`);
//   })
// })
// .catch(console.dir)
