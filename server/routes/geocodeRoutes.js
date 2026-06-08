const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "vanman-app",
        },
      }
    );

    if (!response.data.length) {
      return res.status(404).json({
        message: "Address not found. Try full address.",
      });
    }

    res.json({
      lat: Number(response.data[0].lat),
      lng: Number(response.data[0].lon),
    });
  } catch (err) {
    console.log("GEOCODE ERROR:", err.message);
    res.status(500).json({ message: "Geocoding failed" });
  }
});

module.exports = router;