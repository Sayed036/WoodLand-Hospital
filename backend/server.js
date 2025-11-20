import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./configs/mongodb.js";
import connectCloudinary from "./configs/Cloudinary.js";

// App Config
const app = express();
dotenv.config();
const port = process.env.PORT || 8000;
connectDB();
connectCloudinary()

// middle-wares
app.use(express.json());
app.use(cors());

// API endpoint
app.get("/", (req, res) => {
  res.send("Hii guys");
});

// server listen
app.listen(port, () => {
  console.log("Server started at", port, "port");
});
