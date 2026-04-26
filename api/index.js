const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer"); // 1. Import nodemailer

const app = express();

const cuponSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  phone: String,
});

const Cupon = mongoose.model("Cupon", cuponSchema);

app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Nodemailer Auth Error:", error);
  } else {
    console.log("✅ Server is ready to take our messages");
  }
});

app.use(async (req, res, next) => {
  // check if mongoose connection is already established
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  // if not, try to connect to the database
  try {
    console.log("Waking up database connection...");
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB Atlas");
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({ error: "Database connection failed" });
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
      console.log(
        `Cupon saved to MongoDB: ${process.env.BASE_URL}/api/cupon?id=${cupon._id}`,
      );
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: cupon.email,
          subject: "Your Gratzia Coupon is Ready!\\n",
          text: `View it here: https://gratziacuponsapp.vercel.app/api/cupon?id=${cupon._id}`,
        };

        transporter
          .sendMail(mailOptions)
          .then(() => {
            console.log(`Email sent to ${cupon.email}`);
            res.json({
              message: `/api/cupon?id=${cupon._id}`,
            });
          })
          .catch((err) => {
            console.error(`Error sending email to ${cupon.email}:`, err);
          });
      } catch (err) {
        console.error("Error sending email:", err);
      }
    })
    .catch((err) => console.error("Error saving cupon to MongoDB", err));
  console.log(
    `Received cupon: Name=${name}, Email=${cupon.email}, Amount=${amount}, Phone=${phone}`,
  );
});

app.get("/api", (req, res) => {
  res.send("✅ The Express backend is officially awake!");
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
