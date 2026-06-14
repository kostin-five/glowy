import express from "express";
import "dotenv/config";
import cors from "cors";
import taskRoutes from "./routes/task.routes.js";
import userRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import subTaskRoutes from "./routes/subtask.routes.js";
import userEnergyRoutes from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";

const PORT = process.env.PORT || 3001;

const app = express();

const fallbackAllowedOrigins = [
  "https://glowy-ai.ru",
  "https://www.glowy-ai.ru",
  "https://dev.glowy-ai.ru",
  "http://localhost:5173",
  "http://localhost:4173",
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : fallbackAllowedOrigins;

app.set("trust proxy", 1);
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

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

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
