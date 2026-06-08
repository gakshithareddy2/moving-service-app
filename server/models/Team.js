const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
    },

    members: {
      type: String,
      required: true,
    },

    availability: {
      type: String,
      required: true,
    },

    capacity: {
      type: Number,
      default: 2,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);