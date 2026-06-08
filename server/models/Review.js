const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    teamName: { type: String, default: "Not Assigned" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);