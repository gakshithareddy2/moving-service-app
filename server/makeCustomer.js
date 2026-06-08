require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function makeCustomer() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await User.updateOne(
    { email: "akreddy.anreddy@gmail.com" },
    {
      $set: {
        role: "customer",
        password: await bcrypt.hash("12345678", 10),
      },
    }
  );

  console.log(result);
  process.exit();
}

makeCustomer();