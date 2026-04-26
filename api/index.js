const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

const cuponSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  phone: String,
});

const Cupon = mongoose.model("Cupon", cuponSchema);

// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => console.error("Could not connect to MongoDB", err));

// app.use(express.static("public"));
app.use(express.json());

app.use(async (req, res, next) => {
  // 1. Check if we already have a live, healthy connection
  // readyState 1 means "connected"
  if (mongoose.connection.readyState === 1) {
    return next(); // The connection is good, proceed to the route!
  }

  // 2. If not, establish a new connection
  try {
    console.log('🔌 Waking up database connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      // This tells Mongoose to crash after 5 seconds instead of waiting forever
      serverSelectionTimeoutMS: 5000 
    });
    console.log('✅ Connected to MongoDB Atlas');
    next(); // Proceed to the route
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Send an immediate error back to the frontend instead of timing out
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/api/submit", (req, res) => {
  const { name, email, amount, phone } = req.body;
  const cupon = new Cupon({ name, email, amount, phone });
  cupon
    .save()
    .then(() => {
      res.json({
        message: `/api/cupon?id=${cupon._id}`,
      });

      console.log(
        `Cupon saved to MongoDB: ${process.env.BASE_URL}/api/cupon?id=${cupon._id}`,
      );
    })
    .catch((err) => console.error("Error saving cupon to MongoDB", err));
  console.log(
    `Received cupon: Name=${name}, Email=${email}, Amount=${amount}, Phone=${phone}`,
  );
});

app.get('/api', (req, res) => {
  res.send('✅ The Express backend is officially awake!');
});

app.get("/api/cupon", async (req, res) => {
  const cuponId = req.query.id;
  console.log(`Received request for cupon with ID: ${cuponId}`);
  const cupon = await Cupon.findById(cuponId);
  if (!cupon) {
    console.log(`Cupon with ID ${cuponId} not found`);
    return res.status(404).send("Cupon not found");
  } else {
    console.log(
      `Received cupon: Name=${cupon.name}, Email=${cupon.email}, Amount=${cupon.amount}, Phone=${cupon.phone}`,
    );
    res.send(
      `${cupon.name} - ${cupon.email} - ${cupon.amount} - ${cupon.phone}`,
    );
  }
});

// app.listen(port, () => {
//   console.log(`App listening on port ${port}`);
// });
module.exports = app;
