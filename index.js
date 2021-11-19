const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
require('dotenv').config()
const port = process.env.PORT || 5000

// middle wire
app.use(cors())
app.use(express.json())

// racer-edge-firebase-adminsdk.json




const serviceAccount = require('./racer-edge-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_pass}@cluster0.ffgwy.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
  if(req.headers?.authorization?.startsWith('Bearer')){
    const token=req.headers.authorization.split(' ')[1]
    try{
         const decodedUser= await admin.auth().verifyIdToken(token)
         req.decodedEmail=decodedUser.email
    }catch{

    }
}
next()
  }

  async function run() {
    try {
      await client.connect();
      const database = client.db("Racer_Edge");
      const bikesCollection = database.collection("bikes");
      const ordersCollection = database.collection('orders')
      const reviewsCollection = database.collection('reviews')
      const usersCollection = database.collection('users')
      const newsCollection=database.collection('news')
      // query for movies that have a runtime less than 15 minutes
      app.get('/bikes', async (req, res) => {
        const cursor = bikesCollection.find({})

        const bikes = await cursor.toArray();
        res.send(bikes)
      })
      // get each bike by id
      app.get('/bikes/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await bikesCollection.findOne(query);
        res.send(result);
      })

      // insert a bike api
      app.post('/bikes', async (req, res) => {
        const bike = req.body;
        const result = await bikesCollection.insertOne(bike)
        res.json(result)
      })
      // deleteBikesAPi
      app.delete('/bikes/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await bikesCollection.deleteOne(query)
        res.json(result)
      })

      // getting reviews api
      app.get('/reviews', async (req, res) => {
        const cursor = reviewsCollection.find({})

        const reviews = await cursor.toArray();
        res.send(reviews)
      })

      // inserting reviews api
      app.post('/reviews', async (req, res) => {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.json(result)
      })

      // getiing all order api
      app.get('/orders', async (req, res) => {
        const cursor = ordersCollection.find({})
        const orders = await cursor.toArray()
        res.send(orders)
      })

      // oders by emaail
      app.get('/order', async (req, res) => {
        const email = req.query.email;
        console.log(email)
        const filter = { email: email }
        const cursor = ordersCollection.find(filter);
        const orders = await cursor.toArray();
        console.log(orders)

        res.send(orders)
      })

      // updating order status api
      app.put('/orders/:id', async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const doc = req.body
        const updateDoc = { $set: doc }
        const result = await ordersCollection.updateOne(filter, updateDoc)
        console.log(result)
      })

      app.delete('/orders/:id',verifyToken, async (req, res) => {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }

        const result = await ordersCollection.deleteOne(filter)
        console.log(result)
      })


      app.post('/orders', async (req, res) => {
        const order = req.body
        const result = await ordersCollection.insertOne(order)
        res.json(result)
        console.log(order)
      })


      // insert users  api
      app.post('/users', async (req, res) => {
        const user = req.body
        const result = await usersCollection.insertOne(user)

        res.json(result)

      })



      app.put('/users', async (req, res) => {
        const user = req.body;
        
        const filter = { email: user.email }
        const options = { upsert: true }
        const updateDoc = { $set: user }
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.send(result);
      })

      app.put('/users/admin', verifyToken, async (req, res) => {
        const email = req.body
        const filter = { email: email.email };
        const requester=(req.decodedEmail)
        if(requester){
          const requesterAccount= await usersCollection.findOne({email:requester})
          if(requesterAccount?.role=='admin'){
            const updateDoc={
              $set:{
                role:'admin'
              }
            }
            const result= await usersCollection.updateOne(filter,updateDoc)
            res.json(result)
          }
        }else{
          res.status(403).send({message:'your do not access to make admin'})
        }
        
        
      })

      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const filter = { email }
        const result = await usersCollection.findOne(filter)
        let isAdmin = false;
        if (result?.role == 'admin') {
          isAdmin = true
        }
        res.json({ admin: isAdmin })
      })

      // getting new api
      app.get('/news',async(req,res)=>{
        const cursor=newsCollection.find({})
        const news=await cursor.toArray()
        res.send(news)
      })

    } finally {
      //   await client.close();
    }
  }
  run().catch(console.dir);

  app.get('/', (req, res) => {
    res.send('Racer edge is activated')
  })

  app.listen(port, () => {
    console.log('server running on', port)
  })