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
          subject: "Your Gratzia Coupon is Ready!",
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
      `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הקופון שלך</title>
    <style>
        body {
            background-color: #fefff7;
            color: #254728;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100dvh;
            margin: 0;
        }
        .coupon-card {
          background: white;
          width: 90%;
          max-width: 450px;
          padding: 50px 30px 30px 30px; /* Added more top padding to make room for the logo */
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(37, 71, 40, 0.1);
          border: 2px dashed #99ae86;
          text-align: center;
          position: relative; /* This is the anchor for the logo */
          overflow: hidden; /* Keeps the logo from "bleeding" out if it's too large */
          margin: 30px;
        }
        /* Decorative punch-out circles on the sides */
        .coupon-card::before, .coupon-card::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 30px;
            height: 30px;
            background-color: #fefff7;
            border-radius: 50%;
        }
        .coupon-card::before { left: -15px; transform: translateY(-50%); }
        .coupon-card::after { right: -15px; transform: translateY(-50%); }

        .logo {
            color: #99ae86;
            font-weight: bold;
            font-size: 1.2rem;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .amount {
            font-size: 4rem;
            font-weight: 800;
            margin: 10px 0;
            color: #254728;
        }
        .currency {
            font-size: 1.5rem;
            vertical-align: middle;
        }
        .details-grid {
            border-top: 1px solid #eee;
            margin-top: 20px;
            padding-top: 20px;
            text-align: right;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .detail-item label {
            display: block;
            font-size: 0.8rem;
            color: #99ae86;
            margin-bottom: 3px;
        }
        .detail-item span {
            font-weight: 600;
            font-size: 1rem;
        }
        .footer-note {
            margin-top: 25px;
            font-size: 0.85rem;
            opacity: 0.8;
        }
        .coupon-logo {
          position: absolute;
          top: 15px;
          left: 15px;
          max-width: 90px; 
          height: auto;
          object-fit: contain;
          opacity: 0.9; 
        }
        .print-btn {
            margin-top: 20px;
            background: #254728;
            color: #fefff7;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }
        @media print {
            .print-btn { display: none; }
            body { background: white; }
            .coupon-card { box-shadow: none; border: 2px dashed #99ae86; }
        }
    </style>
</head>
<body>
    <div class="coupon-card">
        <img src="/logo.jpg" alt="Gratzia Logo" class="coupon-logo">
        <div class="amount">${cupon.amount}<span class="currency">₪</span></div>
        <p>קופון אישי למימוש</p>
        
        <div class="details-grid">
            <div class="detail-item">
                <label>שם הלקוח</label>
                <span>${cupon.name}</span>
            </div>
            <div class="detail-item">
                <label>טלפון</label>
                <span>${cupon.phone}</span>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>דואר אלקטרוני</label>
                <span>${cupon.email}</span>
            </div>
        </div>

        <div class="footer-note">
            יש להציג קופון זה בעת המימוש.
        </div>
        
        <button class="print-btn" onclick="window.print()">שמור/הדפס קופון</button>
    </div>
</body>
</html>`,
    );
  }
});

app.get("/style", (req, res) => {
  res.sendFile(__dirname + "/style.css");
});

module.exports = app;
