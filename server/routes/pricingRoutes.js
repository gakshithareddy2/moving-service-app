const express = require("express");
const router = express.Router();
const Pricing = require("../models/Pricing");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");

router.get("/", async (req, res) => {
  try {
    let pricing = await Pricing.findOne();

    if (!pricing) {
      pricing = await Pricing.create({});
    }

    res.json(pricing);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch pricing" });
  }
});

router.put("/", auth, admin, async (req, res) => {
  try {
    let pricing = await Pricing.findOne();

    if (!pricing) {
      pricing = await Pricing.create({});
    }

    pricing.fullMoveBase = Number(req.body.fullMoveBase);
    pricing.transportOnlyBase = Number(req.body.transportOnlyBase);
    pricing.packingHelpBase = Number(req.body.packingHelpBase);
    pricing.perHourRate = Number(req.body.perHourRate);
    pricing.perKmRate = Number(req.body.perKmRate);
    pricing.inventoryBoxRate = Number(req.body.inventoryBoxRate || pricing.inventoryBoxRate || 10);
    pricing.heavyItemRate = Number(req.body.heavyItemRate || pricing.heavyItemRate || 80);
    pricing.eveningCharge = Number(req.body.eveningCharge || pricing.eveningCharge || 100);

    await pricing.save();

    res.json(pricing);
  } catch (err) {
    res.status(500).json({ message: "Pricing update failed" });
  }
});

module.exports = router;