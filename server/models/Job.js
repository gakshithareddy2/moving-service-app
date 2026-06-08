const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customerName: { type: String, required: true },
    customerEmail: { type: String },
    phone: { type: String, required: true },

    origin: { type: String, required: true },
    destination: { type: String, required: true },

    originCoords: {
      lat: Number,
      lng: Number,
    },

    destinationCoords: {
      lat: Number,
      lng: Number,
    },

    serviceType: {
      type: String,
      enum: ["Full Move", "Transport Only", "Packing Help"],
      required: true,
    },

    inventory: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },

    estimatedDuration: { type: Number, default: 2 },
    distanceKm: { type: Number, default: 0 },
    price: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Deposit Paid", "Paid"],
      default: "Unpaid",
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },

    assignedTeam: {
      type: String,
      default: "Not Assigned",
    },

    notifications: [
      {
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    messages: [
      {
        senderRole: String,
        senderName: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);