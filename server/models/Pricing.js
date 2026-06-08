const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema(
  {
    fullMoveBase: {
      type: Number,
      default: 150,
    },
    transportOnlyBase: {
      type: Number,
      default: 100,
    },
    packingHelpBase: {
      type: Number,
      default: 70,
    },
    perHourRate: {
      type: Number,
      default: 25,
    },
    perKmRate: {
      type: Number,
      default: 50,
    },
    inventoryBoxRate: {
      type: Number,
      default: 10,
    },
    heavyItemRate: {
      type: Number,
      default: 80,
    },
    eveningCharge: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Pricing", pricingSchema);