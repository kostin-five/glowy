import express from "express";
import "dotenv/config";
import cors from "cors";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import subTaskRoutes from "./routes/subtask.routes.js";
import userEnergyRoutes from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const PORT = process.env.PORT || 3001;

const app = express();

const isProd = process.env.NODE_ENV === "production";

const prodOrigins = [
  "https://glowy-ai.ru",
  "https://www.glowy-ai.ru",
];

const devOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : (isProd ? prodOrigins : [...prodOrigins, ...devOrigins]);

const csrfProtection = (req, res, next) => {
  const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (unsafeMethods.includes(req.method)) {
    const headerValue = req.headers.origin || req.headers.referer;
    if (!headerValue) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    try {
      const origin = new URL(headerValue).origin;
      const isAllowed = allowedOrigins.includes(origin);
      if (!isAllowed) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
    } catch (e) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
  }
  next();
};


app.set("trust proxy", 1);
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Доступ запрещен" });
  }
  next();
});

app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/payments/yookassa/webhook") {
    return next();
  }
  csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  const host = req.get("host");
  if (host && host.includes("dev.glowy-ai.ru")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "glowy-backend",
  });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/subtasks", subTaskRoutes);
app.use("/api/user", userEnergyRoutes);
app.use("/api/chat", chatRouter);
app.use("/api/payments", paymentRoutes);

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
