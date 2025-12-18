const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "certifications"
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers["user-id"];
    if (!userId) {
      return cb(new Error("User ID missing in header"), null);
    }

    const userDir = path.join(baseUploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, PNG, JPG allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;
