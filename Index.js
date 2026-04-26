const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config({ path: "app.env" });
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

const cuponSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  phone: String,
});

const Cupon = mongoose.model("Cupon", cuponSchema);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

app.use(express.static("public"));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/submit", (req, res) => {
  const { name, email, amount, phone } = req.body;
  const cupon = new Cupon({ name, email, amount, phone });
  cupon
    .save()
    .then(() => console.log(`Cupon saved to MongoDB: ${process.env.BASE_URL}/cupon?id=${cupon._id}`))
    .catch((err) => console.error("Error saving cupon to MongoDB", err));
  console.log(
    `Received cupon: Name=${name}, Email=${email}, Amount=${amount}, Phone=${phone}`,
  );
  res.json({ message: "Cupon received!" });
});

app.get("/cupon", async (req, res) => {
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

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
