
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

import {
  ensureStorage,
  readData,
  writeData
} from "./utils/storage.js";

import { classifyComplaint } from "./utils/classify.js";

dotenv.config();
ensureStorage();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from backend/.env");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirectory = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

// =====================================
// MIDDLEWARE
// =====================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDirectory));

// =====================================
// PHOTO UPLOAD
// =====================================

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed."));
    }
  }
});

// =====================================
// AUTHENTICATION HELPERS
// =====================================

const tokenFor = (user) => jwt.sign(
  { id: user.id },
  JWT_SECRET,
  { expiresIn: "7d" }
);

function safeUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = readData("users.json");

    const currentUser = users.find(
      user => user.id === decoded.id
    );

    if (!currentUser) {
      return res.status(401).json({
        message: "User account not found."
      });
    }

    req.user = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: String(currentUser.role || "citizen")
        .trim()
        .toLowerCase()
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please log in again."
    });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required."
    });
  }

  next();
}

// =====================================
// ADMIN ACCOUNT SETUP
// =====================================

async function seedAdmin() {
  const users = readData("users.json");

  const email = (
    process.env.ADMIN_EMAIL || "admin@aquaalert.local"
  ).trim().toLowerCase();

  const passwordText = process.env.ADMIN_PASSWORD;

  const name = (
    process.env.ADMIN_NAME || "AquaAlert Admin"
  ).trim();

  if (!passwordText || passwordText.length < 12) {
    throw new Error(
      "Set ADMIN_PASSWORD in backend/.env with at least 12 characters."
    );
  }

  const existingAdmin = users.find(
    user => user.email === email
  );

  if (existingAdmin) {
    existingAdmin.role = "admin";
    existingAdmin.name = name;
    writeData("users.json", users);

    console.log("Admin account verified.");
    return;
  }

  const admin = {
    id: randomUUID(),
    name,
    email,
    password: await bcrypt.hash(passwordText, 10),
    role: "admin",
    createdAt: new Date().toISOString()
  };

  users.push(admin);
  writeData("users.json", users);

  console.log("Admin account created.");
}

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
  res.json({
    message: "AquaAlert backend is running successfully.",
    storage: "JSON files",
    features: [
      "Authentication",
      "Complaints",
      "Photo Upload",
      "GPS Location",
      "Complaint Classification",
      "Workers",
      "Schedules",
      "Water Supply",
      "Water Quality",
      "Alerts",
      "Dashboard Statistics"
    ]
  });
});

// =====================================
// AUTHENTICATION
// =====================================

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Enter name, email and password."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters."
      });
    }

    const users = readData("users.json");
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(user => user.email === normalizedEmail)) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    const user = {
      id: randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: "citizen",
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeData("users.json", users);

    res.status(201).json({
      message: "Registration successful.",
      token: tokenFor(user),
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Enter email and password."
      });
    }

    const users = readData("users.json");

    const user = users.find(
      item => item.email === email.trim().toLowerCase()
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    res.json({
      message: "Login successful.",
      token: tokenFor(user),
      user: safeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const user = readData("users.json").find(
    item => item.id === req.user.id
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found."
    });
  }

  res.json({
    user: safeUser(user)
  });
});

// =====================================
// COMPLAINTS
// =====================================

app.get("/api/complaints", authenticate, (req, res) => {
  let complaints = readData("complaints.json");

  if (req.user.role !== "admin") {
    complaints = complaints.filter(
      item => item.userId === req.user.id
    );
  }

  res.json(complaints);
});

app.post(
  "/api/complaints",
  authenticate,
  upload.single("photo"),
  (req, res) => {
    const {
      title,
      description,
      latitude,
      longitude,
      address
    } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        message: "Enter complaint title and description."
      });
    }

    const classification = classifyComplaint(description);

    const complaint = {
      id: randomUUID(),
      userId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category: classification.category,
      priority: classification.priority,
      status: "Pending",
      latitude: latitude || "",
      longitude: longitude || "",
      address: address || "",
      photo: req.file
        ? `/uploads/${req.file.filename}`
        : "",
      createdAt: new Date().toISOString()
    };

    const complaints = readData("complaints.json");
    complaints.unshift(complaint);
    writeData("complaints.json", complaints);

    res.status(201).json({
      message: "Complaint submitted successfully.",
      complaint
    });
  }
);

app.patch(
  "/api/complaints/:id/status",
  authenticate,
  adminOnly,
  (req, res) => {
    const complaints = readData("complaints.json");

    const complaint = complaints.find(
      item => item.id === req.params.id
    );

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    const allowed = [
      "Pending",
      "In Progress",
      "Resolved",
      "Rejected"
    ];

    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({
        message: "Invalid complaint status."
      });
    }

    complaint.status = req.body.status;
    complaint.updatedAt = new Date().toISOString();

    writeData("complaints.json", complaints);

    res.json({
      message: "Complaint updated successfully.",
      complaint
    });
  }
);

// =====================================
// WORKERS
// =====================================

app.get("/api/workers", authenticate, adminOnly, (req, res) => {
  res.json(readData("workers.json"));
});

app.post("/api/workers", authenticate, adminOnly, (req, res) => {
  const { name, phone, area, role } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({
      message: "Worker name and phone are required."
    });
  }

  const workers = readData("workers.json");

  const worker = {
    id: randomUUID(),
    name: name.trim(),
    phone: phone.trim(),
    area: area || "",
    role: role || "Field Worker",
    createdAt: new Date().toISOString()
  };

  workers.push(worker);
  writeData("workers.json", workers);

  res.status(201).json({
    message: "Worker added successfully.",
    worker
  });
});

app.delete(
  "/api/workers/:id",
  authenticate,
  adminOnly,
  (req, res) => {
    const workers = readData("workers.json");

    const updated = workers.filter(
      item => item.id !== req.params.id
    );

    if (updated.length === workers.length) {
      return res.status(404).json({
        message: "Worker not found."
      });
    }

    writeData("workers.json", updated);

    res.json({
      message: "Worker removed successfully."
    });
  }
);

// =====================================
// WORK SCHEDULES
// =====================================

app.get("/api/schedules", authenticate, (req, res) => {
  res.json(readData("schedules.json"));
});

app.post("/api/schedules", authenticate, adminOnly, (req, res) => {
  const { area, date, time, workerName, task } = req.body;

  if (!area?.trim() || !date || !time || !task?.trim()) {
    return res.status(400).json({
      message: "Complete all schedule fields."
    });
  }

  const schedules = readData("schedules.json");

  const schedule = {
    id: randomUUID(),
    area: area.trim(),
    date,
    time,
    workerName: workerName || "",
    task: task.trim(),
    createdAt: new Date().toISOString()
  };

  schedules.unshift(schedule);
  writeData("schedules.json", schedules);

  res.status(201).json({
    message: "Schedule added successfully.",
    schedule
  });
});

// =====================================
// WATER SUPPLY
// =====================================

app.get("/api/water-supply", authenticate, (req, res) => {
  res.json(readData("waterSupply.json"));
});

app.post(
  "/api/water-supply",
  authenticate,
  adminOnly,
  (req, res) => {
    const {
      area,
      date,
      startTime,
      endTime,
      status,
      notes
    } = req.body;

    if (
      !area?.trim() ||
      !date ||
      !startTime ||
      !endTime ||
      !status
    ) {
      return res.status(400).json({
        message: "Complete all water supply fields."
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "End time must be later than start time."
      });
    }

    const allowedStatuses = [
      "Available",
      "Delayed",
      "Interrupted"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid water supply status."
      });
    }

    const supplies = readData("waterSupply.json");

    const supply = {
      id: randomUUID(),
      area: area.trim(),
      date,
      startTime,
      endTime,
      status,
      notes: notes || "",
      createdAt: new Date().toISOString()
    };

    supplies.unshift(supply);
    writeData("waterSupply.json", supplies);

    res.status(201).json({
      message: "Water supply schedule added successfully.",
      supply
    });
  }
);

app.delete(
  "/api/water-supply/:id",
  authenticate,
  adminOnly,
  (req, res) => {
    const supplies = readData("waterSupply.json");

    const updated = supplies.filter(
      item => item.id !== req.params.id
    );

    if (updated.length === supplies.length) {
      return res.status(404).json({
        message: "Water supply schedule not found."
      });
    }

    writeData("waterSupply.json", updated);

    res.json({
      message: "Water supply schedule deleted successfully."
    });
  }
);

// =====================================
// ALERTS
// =====================================

app.get("/api/alerts", authenticate, (req, res) => {
  res.json(readData("alerts.json"));
});

app.post("/api/alerts", authenticate, adminOnly, (req, res) => {
  const { title, message } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({
      message: "Enter alert title and message."
    });
  }

  const alerts = readData("alerts.json");

  const alert = {
    id: randomUUID(),
    title: title.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString()
  };

  alerts.unshift(alert);
  writeData("alerts.json", alerts);

  res.status(201).json({
    message: "Alert added successfully.",
    alert
  });
});

// =====================================
// WATER QUALITY
// =====================================

app.get("/api/water-quality", authenticate, (req, res) => {
  res.json(readData("waterQuality.json"));
});

app.post(
  "/api/water-quality",
  authenticate,
  adminOnly,
  (req, res) => {
    const { area, ph, turbidity, notes } = req.body;

    const phValue = Number(ph);
    const turbidityValue = Number(turbidity);

    if (
      !area?.trim() ||
      ph === undefined ||
      turbidity === undefined ||
      String(ph).trim() === "" ||
      String(turbidity).trim() === "" ||
      !Number.isFinite(phValue) ||
      !Number.isFinite(turbidityValue) ||
      phValue < 0 ||
      phValue > 14 ||
      turbidityValue < 0
    ) {
      return res.status(400).json({
        message: "Enter valid area, pH and turbidity values."
      });
    }

    const reports = readData("waterQuality.json");

    const report = {
      id: randomUUID(),
      area: area.trim(),
      ph: phValue,
      turbidity: turbidityValue,
      notes: notes || "",
      createdAt: new Date().toISOString()
    };

    reports.unshift(report);
    writeData("waterQuality.json", reports);

    res.status(201).json({
      message: "Water quality report added successfully.",
      report
    });
  }
);

// =====================================
// DASHBOARD STATISTICS
// =====================================

app.get("/api/stats", authenticate, (req, res) => {
  const all = readData("complaints.json");

  const complaints = req.user.role === "admin"
    ? all
    : all.filter(item => item.userId === req.user.id);

  res.json({
    total: complaints.length,

    pending: complaints.filter(
      item => item.status === "Pending"
    ).length,

    inProgress: complaints.filter(
      item => item.status === "In Progress"
    ).length,

    resolved: complaints.filter(
      item => item.status === "Resolved"
    ).length,

    workers: req.user.role === "admin"
      ? readData("workers.json").length
      : 0
  });
});

// =====================================
// ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("Backend error:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message
    });
  }

  if (
    err.message === "Only JPG, PNG and WEBP images are allowed."
  ) {
    return res.status(400).json({
      message: err.message
    });
  }

  res.status(500).json({
    message: err.message || "Internal server error."
  });
});

// =====================================
// START SERVER
// =====================================

seedAdmin()
  .then(() => {
    app.listen(PORT, () => {
      console.log("--------------------------------");
      console.log("AquaAlert Backend Started");
      console.log(`URL: http://localhost:${PORT}`);
      console.log("Storage: JSON files");
      console.log("MongoDB: Not required");
      console.log("--------------------------------");
    });
  })
  .catch(error => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });
