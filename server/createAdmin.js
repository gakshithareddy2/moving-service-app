require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ email: "admin@vanman.com" });

    if (existing) {
      existing.role = "admin";
      existing.password = await bcrypt.hash("admin123", 10);
      await existing.save();
      console.log("✅ Existing admin updated");
    } else {
      await User.create({
        name: "Admin User",
        email: "admin@vanman.com",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
      });
      console.log("✅ New admin created");
    }

    process.exit();
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

createAdmin();