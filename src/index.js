import express from "express";
import tmi from "tmi.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());

// Simple test endpoint
app.get("/stats", (req, res) => {
  res.json({ ok: true, message: "Worker is running", time: new Date().toISOString() });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Worker listening on port ${port}`));
