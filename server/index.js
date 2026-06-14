require("dotenv").config();

console.log("🚀 THIS INDEX FILE IS RUNNING");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const pricingRoutes = require("./routes/pricingRoutes");
const geocodeRoutes = require("./routes/geocodeRoutes");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const teamRoutes = require("./routes/teamRoutes");
const aiRoutes = require("./routes/aiRoutes");
const reviewRoutes = require("./routes/reviews");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// CORS
app.use(cors());

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error ❌:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/payment", paymentRoutes);

// Home Route
app.get("/", (req, res) => {
  res.send("🚚 VAN MAN Server running");
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});