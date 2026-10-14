const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors')
const app = express()
app.use(cors())
app.use(express.json())
require('dotenv').config()
const port = 5000

app.get('/', (req, res) => {
  res.send('Hello World!')
})



const uri = process.env.MONGODB_URI;

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

    const database = client.db("hire_loop");
    const jobsCollection= database.collection("jobs");
    const companyCollection= database.collection("company");
    const applicantionsCollection= database.collection("applicantions");
    const plansCollection= database.collection("plansCollection");
    const subscriptionCollection= database.collection("subscriptionCollection");
    const userCollection= database.collection("user");
    const sessionCollection = database.collection("session")

     const verifyToken = async (req,res,next)=>{
         
          console.log("verify token e at least dhuktese")
          if(!req.headers?.authorization){
            return res.status(401).send({message:"Unauthorized access"})
          }

          const token = req.headers?.authorization.split(' ')[1]
        console.log("authorization paise")
         

          if(!token){
             return res.status(401).send({message:"Unauthorized access"})
          }

            console.log("token o paise paise")

          const query = {token :token}

          const session = await sessionCollection.findOne(query)

          console.log("recruiter er session",session)

          const userId = session.userId

          const userQuery = {
            _id:userId
          }

          const user = await userCollection.findOne(userQuery)
         console.log("Recruiter er baccha kam kor")
         req.user = user;

         next()
    }


    const verifySeeker = async(req,res,next)=>{
      if(req.user?.role!== 'seeker'){
          return res.status(403).send({message:'forbidden access'})
      }

      next()
    }

     const verifyRecruiter = async(req,res,next)=>{
      if(req.user?.role!== 'recruiter'){
        console.log("Ki kos esob")
          return res.status(403).send({message:'forbidden access'})
      }

      next()
    }


    
    app.get('/api/jobs',async(req,res)=>{
      const query ={}
      //job filter related query

       if (req.query.search) {
        query.$or = [
            { jobTitle: { $regex: req.query.search, $options: 'i' } },
            { companyName: { $regex: req.query.search, $options: 'i' } }
        ]
    }

    if (req.query.jobType) {
        query.jobType = req.query.jobType
    }
    if (req.query.jobCategory) {
        query.jobCategory = req.query.jobCategory
    }
    if (req.query.isRemote) {
        query.isRemote = req.query.isRemote
    }

      //company related query
      if(req.query.companyId){
        query.companyId=req.query.companyId
       
      }
      if(req.query.status){
        query.status=req.query.status
      }
      if (req.query.page) {
        const page = req.query.page;
        const perPage = req.query.perPage || 12;
        const skipItems = (page - 1) * perPage

        const total = await jobsCollection.countDocuments(query);
        const cursor = jobsCollection.find(query).skip(skipItems).limit(perPage);
        const jobs = await cursor.toArray();
        return res.send({ total, jobs });
    }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/api/jobs/:id',verifyToken,verifySeeker,async(req,res)=>{

      
      const id = req.params.id;
      const query ={_id: new ObjectId(id)};
      const result = await jobsCollection.findOne(query);
      res.send(result || {})
    })




    app.post('/api/jobs',verifyToken,verifyRecruiter,async(req,res)=>{
      const job = req.body;
      const newJob ={
        ...job,
        createdAt: new Date()
      }
      const result = await jobsCollection.insertOne(newJob);
     
      res.send(result)
        
    })
    // applicantions related api

    app.get('/api/applications',verifyToken,verifySeeker,async(req,res)=>{
      const query ={}

      
      if(req.query.applicantId){
        query.applicantId=req.query.applicantId

        if(req.user._id.toString() !== req.query.applicantId){
          return res.status(403).send({message:'forbidden access'})
        }
      }
      if(req.query.jobId){
        query.jobId=req.query.jobId
      }

      const cursor = applicantionsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })
    app.post('/api/applications',verifyToken,verifySeeker,async(req,res)=>{
      const application = req.body;
      const newApplication ={
        ...application,
        createdAt: new Date()
      }
      const result = await applicantionsCollection.insertOne(newApplication);
      res.send(result)
    })

 // plan related api
    app.get('/api/plans',async(req,res)=>{
      const query ={}

      console.log(req.query)
      if(req.query.planId){
        query.planId=req.query.planId
      }
      const result = await plansCollection.findOne(query);
      res.send(result || {})
    })
    // subscription related api
    app.post('/api/subscription',async(req,res)=>{
      const data = req.body;
      const newSubscription ={
        ...data,
        createdAt: new Date()
      }
      const result = await subscriptionCollection.insertOne(newSubscription);

      // update the company subscription status

      const filter ={email: data.email}

      const updateDoc = {
        $set: {
         
          plan: data.planId,
          
        },
      };
      const updateResult = await userCollection.updateOne(filter,updateDoc)
     res.send({ subscriptionResult: result, updateResult });
       
    })
 // company related api
    app.get('/api/my/company',verifyToken,verifyRecruiter,async(req,res)=>{
      const query ={}
      if(req.query.recruiterId){
        query.recruiterId=req.query.recruiterId
      }
      const result = await companyCollection.findOne(query);

      res.send(result || {})
    })
    app.post('/api/company',verifyToken,verifySeeker,async(req,res)=>{
      const company = req.body;
      const newCompany ={
        ...company,
        createdAt: new Date()
      }
      const result = await companyCollection.insertOne(newCompany);
      res.send(result)  
    })

   const  verifyAdmin = async(req,res,next)=>{
      
      if(req.user?.role !== 'admin'){
        return res.status(403).send({message :'Forbidden Access'})
      }
    console.log("Admin verify er moddhe dhukse")
      next()

    }

    app.get('/api/companies',verifyToken,verifyAdmin, async(req,res)=>{
       
      
      
      const cursor = await companyCollection.find()

       const result = await cursor.toArray()

       res.send(result)
    })

    

    app.patch('/api/company/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id

      

      const updatedCompany = req.body

      const filter = {_id:new ObjectId(id)}

      const updatedDoc = {
        $set :{
          status : updatedCompany.status
        }
      }

      const result = await companyCollection.updateOne(filter,updatedDoc)
      res.send(result)
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


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})