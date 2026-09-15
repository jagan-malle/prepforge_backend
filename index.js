import dotenv from "dotenv";
dotenv.config();
import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);
import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import connectDatabase from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const origins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((x) => x.trim());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true);
      cb(new Error("Origin is not allowed by CORS policy."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many authentication attempts. Please try again later.",
    },
  }),
);
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "PrepForge API" }),
);
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);
const port = process.env.PORT || 5000;
connectDatabase().then(() =>
  app.listen(port, () => console.log(`PrepForge API listening on ${port}`)),
);
