const express = require("express");
const Review = require("../models/Review");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { customerName, teamName, rating, message } = req.body;

    if (!customerName || !rating || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

    const review = await Review.create({
      customerName,
      teamName: teamName || "Not Assigned",
      rating: Number(rating),
      message,
    });

    res.status(201).json(review);
  } catch (err) {
    console.log("REVIEW SUBMIT ERROR:", err);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.log("REVIEW FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;