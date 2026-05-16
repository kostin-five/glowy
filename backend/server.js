import express from "express";
import "dotenv/config";
import cors from "cors";
import taskRoutes from "./routes/task.routes.js";

const PORT = process.env.PORT ?? 3000;

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/tasks", taskRoutes);

app.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});
