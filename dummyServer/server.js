import express from "express";
import cors from "cors";

import featureMapRoutes from "./routes/featureMaps.js";
import annotationRoutes from "./routes/annotations.js";
import inspectionRoutes from "./routes/inspections.js";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// feature map routes (ALL in one file now)
app.use("/api/featureMaps", featureMapRoutes);

// annotation routes
app.use("/api/annotations", annotationRoutes);

// inspection routes
app.use("/api/inspections", inspectionRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});