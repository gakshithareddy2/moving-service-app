const express = require("express");
const Job = require("../models/Job");
const Team = require("../models/Team");
const Pricing = require("../models/Pricing");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

async function getPricing() {
  let pricing = await Pricing.findOne();
  if (!pricing) pricing = await Pricing.create({});
  return pricing;
}

function calculateInventoryCharge(inventory, pricing) {
  if (!inventory) return 0;

  const text = inventory.toLowerCase();
  let charge = 0;

  const boxMatch = text.match(/(\d+)\s*box/);
  if (boxMatch) {
    charge += Number(boxMatch[1]) * Number(pricing.inventoryBoxRate || 10);
  }

  ["sofa", "bed", "fridge", "washing machine", "wardrobe", "table", "tv"].forEach(
    (item) => {
      if (text.includes(item)) charge += Number(pricing.heavyItemRate || 80);
    }
  );

  return charge;
}

function calculateTimeCharge(time, pricing) {
  if (!time) return 0;
  const hour = Number(time.split(":")[0]);
  return hour >= 18 || hour < 8 ? Number(pricing.eveningCharge || 100) : 0;
}

async function calculatePrice({
  serviceType,
  estimatedDuration,
  distanceKm,
  inventory,
  time,
}) {
  const pricing = await getPricing();

  let basePrice = 0;
  if (serviceType === "Full Move") basePrice = pricing.fullMoveBase;
  if (serviceType === "Transport Only") basePrice = pricing.transportOnlyBase;
  if (serviceType === "Packing Help") basePrice = pricing.packingHelpBase;

  return (
    Number(basePrice || 0) +
    Number(estimatedDuration || 0) * Number(pricing.perHourRate || 0) +
    Number(distanceKm || 0) * Number(pricing.perKmRate || 0) +
    calculateInventoryCharge(inventory, pricing) +
    calculateTimeCharge(time, pricing)
  );
}

async function hasTeamConflict(teamName, date, time, duration, ignoreJobId = null) {
  if (!teamName || teamName === "Not Assigned" || !date || !time) return false;

  const newStart = toMinutes(time);
  const newEnd = newStart + Number(duration || 2) * 60;

  const query = {
    assignedTeam: teamName,
    date,
    status: { $nin: ["Completed", "Cancelled"] },
  };

  if (ignoreJobId) {
    query._id = { $ne: ignoreJobId };
  }

  const jobs = await Job.find(query);

  return jobs.some((job) => {
    if (!job.time) return false;

    const existingStart = toMinutes(job.time);
    const existingEnd =
      existingStart + Number(job.estimatedDuration || 2) * 60;

    return newStart < existingEnd && newEnd > existingStart;
  });
}

async function findAvailableTeam(date, time, duration) {
  const teams = await Team.find({
    availability: { $ne: "Unavailable" },
    capacity: { $gte: Number(duration || 2) },
  }).sort({ createdAt: 1 });

  for (const team of teams) {
    const conflict = await hasTeamConflict(
      team.teamName,
      date,
      time,
      duration
    );

    if (!conflict) return team.teamName;
  }

  return "Not Assigned";
}

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({ message: "Only customers can create jobs" });
    }

    const requiredFields = [
      "customerName",
      "phone",
      "origin",
      "destination",
      "serviceType",
      "inventory",
      "date",
      "time",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    const assignedTeam = await findAvailableTeam(
      req.body.date,
      req.body.time,
      req.body.estimatedDuration
    );

    const price = await calculatePrice(req.body);

    const job = await Job.create({
      customerId: req.user.id,
      customerEmail: req.user.email,
      customerName: req.body.customerName,
      phone: req.body.phone,
      origin: req.body.origin,
      destination: req.body.destination,
      originCoords: req.body.originCoords,
      destinationCoords: req.body.destinationCoords,
      serviceType: req.body.serviceType,
      inventory: req.body.inventory,
      date: req.body.date,
      time: req.body.time,
      estimatedDuration: Number(req.body.estimatedDuration || 2),
      distanceKm: Number(req.body.distanceKm || 0),
      price,
      assignedTeam,
      notifications: [
        {
          message:
            assignedTeam !== "Not Assigned"
              ? `Team ${assignedTeam} has been assigned to your move.`
              : "No team available yet. Admin will assign soon.",
        },
      ],
      messages: [],
    });

    res.status(201).json(job);
  } catch (err) {
    console.log("CREATE JOB ERROR:", err);
    res.status(500).json({ message: "Job creation failed" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const jobs =
      req.user.role === "admin"
        ? await Job.find().sort({ createdAt: -1 })
        : await Job.find({ customerId: req.user.id }).sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.log("GET JOBS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    const isAdmin = req.user.role === "admin";
    const isCustomerOwner = job.customerId.toString() === req.user.id;

    if (!isAdmin && !isCustomerOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(job);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch job" });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    const isAdmin = req.user.role === "admin";
    const isCustomerOwner = job.customerId.toString() === req.user.id;

    if (!isAdmin && !isCustomerOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!isAdmin) {
      const allowedCustomerFields = ["date", "time", "status"];

      Object.keys(req.body).forEach((key) => {
        if (!allowedCustomerFields.includes(key)) delete req.body[key];
      });

      if (req.body.status && req.body.status !== "Cancelled") {
        delete req.body.status;
      }
    }

    const nextAssignedTeam = req.body.assignedTeam || job.assignedTeam;
    const nextDate = req.body.date || job.date;
    const nextTime = req.body.time || job.time;
    const nextDuration = req.body.estimatedDuration || job.estimatedDuration;

    if (
      isAdmin &&
      req.body.assignedTeam &&
      req.body.assignedTeam !== "Not Assigned"
    ) {
      const conflict = await hasTeamConflict(
        nextAssignedTeam,
        nextDate,
        nextTime,
        nextDuration,
        job._id
      );

      if (conflict) {
        return res.status(400).json({
          message: "This team already has another job at that time",
        });
      }
    }

    if (req.body.newNotification) {
      job.notifications.push({ message: req.body.newNotification });
      delete req.body.newNotification;
    }

    if (req.body.status && req.body.status !== job.status) {
      job.notifications.push({
        message:
          req.body.status === "Cancelled"
            ? "Booking cancelled"
            : `Status updated to ${req.body.status}`,
      });
    }

    if (req.body.assignedTeam && req.body.assignedTeam !== job.assignedTeam) {
      job.notifications.push({
        message: `Team ${req.body.assignedTeam} assigned`,
      });
    }

    if (req.body.paymentStatus && req.body.paymentStatus !== job.paymentStatus) {
      job.notifications.push({
        message: `Payment status updated to ${req.body.paymentStatus}`,
      });
    }

    if (req.body.date && req.body.date !== job.date) {
      job.notifications.push({
        message: `Booking rescheduled to ${req.body.date}`,
      });
    }

    if (req.body.time && req.body.time !== job.time) {
      job.notifications.push({
        message: `Booking time changed to ${req.body.time}`,
      });
    }

    Object.assign(job, req.body);
    await job.save();

    res.json(job);
  } catch (err) {
    console.log("UPDATE JOB ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

router.post("/:id/messages", auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!req.body.message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const isAdmin = req.user.role === "admin";
    const isCustomerOwner = job.customerId.toString() === req.user.id;

    if (!isAdmin && !isCustomerOwner) {
      return res.status(403).json({ message: "Not allowed" });
    }

    job.messages.push({
      senderRole: req.user.role,
      senderName: req.body.senderName || req.user.name || req.user.role,
      message: req.body.message,
    });

    await job.save();
    res.json(job);
  } catch (err) {
    console.log("CHAT ERROR:", err);
    res.status(500).json({ message: "Message failed" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete jobs" });
    }

    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ message: "Job not found" });

    if (!["Completed", "Cancelled"].includes(job.status)) {
      return res.status(400).json({
        message: "Only completed or cancelled jobs can be deleted",
      });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.log("DELETE JOB ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;