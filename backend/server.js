const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL || "mongodb://localhost:27017/db", {
    serverSelectionTimeoutMS: 3000,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB connection error:", err.message));

const toPct = (value, digits = 1) => Number(value.toFixed(digits));
const coreCount = os.cpus()?.length || 1;
const cpuLoadPercent = () =>
  Math.min(100, toPct(((os.loadavg()[0] || 0) / coreCount) * 100));
const memoryPercent = () => {
  const total = os.totalmem();
  const used = total - os.freemem();
  return toPct((used / total) * 100);
};
const heapPercent = () => {
  const usage = process.memoryUsage();
  return toPct((usage.heapUsed / usage.heapTotal) * 100);
};
const mongoStatus = () => {
  const state = mongoose.connection.readyState;
  if (state === 1) return "operational";
  if (state === 2) return "degraded";
  return "down";
};

app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from Kubernetes Backend" });
});

app.get("/api/metrics", (req, res) => {
  const cpu = cpuLoadPercent();
  const memory = memoryPercent();
  const heap = heapPercent();
  const load = cpuLoadPercent();
  const uptime = toPct(os.uptime() / 60, 1); // minutes
  const mongo = mongoStatus();

  res.json({
    metrics: [
      { key: "cpu", label: "CPU Utilization", unit: "%", value: cpu },
      { key: "memory", label: "Memory Usage", unit: "%", value: memory },
      { key: "heap", label: "Node Heap Used", unit: "%", value: heap },
      { key: "load", label: "1m Load / Core", unit: "%", value: load },
      { key: "uptime", label: "Uptime", unit: "min", value: uptime },
    ],
    services: [
      { name: "Backend API", status: "operational", latency: 20 },
      {
        name: "MongoDB",
        status: mongo,
        latency: mongo === "operational" ? 35 : 180,
      },
    ],
    alerts:
      mongo === "down"
        ? [
            {
              severity: "critical",
              title: "MongoDB down",
              detail: "Database connection is not healthy",
            },
          ]
        : [],
    clusters: [{ name: "local-cluster", nodes: 1, pods: 3, utilization: cpu }],
    regions: [{ name: "local", traffic: 100 }],
    timestamp: new Date().toISOString(),
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
