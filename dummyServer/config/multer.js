import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    const session = req.body.sessionName || "unknown_session";
    const objectType = req.body.objectType || "unknown_type";

    const dir = path.join(process.cwd(), "dataset", session, objectType);

    fs.mkdirSync(dir, { recursive: true });

    console.log("📁 Saving to:", dir);

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    cb(null, uniqueName);
  }

});

export default multer({ storage });