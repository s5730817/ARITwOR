import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/upload.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/api", uploadRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});