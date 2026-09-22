import "dotenv/config";
import dns from "node:dns";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import workforceRoutes from "./routes/workforceRoutes.js";

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const isVercel = Boolean(process.env.VERCEL);

if (!mongoUri) {
  throw new Error("MONGO_URI is missing from server/.env");
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith("CHANGE_")) {
  if (isVercel) {
    throw new Error("JWT_SECRET must be configured in Vercel environment variables");
  }
  process.env.JWT_SECRET = "workforce_local_dev_secret_7f3b9c2e1a6d4f8b0c5e9a2d7f1b6c3e";
}

const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000"
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow dev origins dynamically
    },
    credentials: true
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Workforce Management System API is running smoothly",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date()
  });
});

// Primary Routes
app.use("/api/auth", authRoutes);
app.use("/api/workforce", workforceRoutes);

// Direct Aliases for direct endpoint access
app.use("/api", workforceRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

const localUri = "mongodb://127.0.0.1:27017/workforce";

try {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (atlasErr) {
    if (isVercel) {
      console.error("Cloud MongoDB connection failed:", atlasErr.message);
    } else {
      console.warn("Cloud MongoDB connection failed, attempting local MongoDB connection:", atlasErr.message);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`Local MongoDB connected: ${mongoose.connection.name}`);
    }
  }

  if (!isVercel) {
    app.listen(PORT, () => {
      console.log(`Workforce API running on http://localhost:${PORT}`);
    });
  }
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  if (!isVercel) {
    app.listen(PORT, () => {
      console.log(`Workforce API running in offline mode on http://localhost:${PORT}`);
    });
  }
}

export default app;