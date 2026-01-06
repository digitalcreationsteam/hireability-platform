const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.headers["user-id"];
    if (!userId) {
      return cb(new Error("User ID missing in headers"));
    }

    const docDir = path.join(baseUploadDir, userId, "documents", "profile");
    fs.mkdirSync(docDir, { recursive: true });

    cb(null, docDir);
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-resume.pdf`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"), false);
  }
  cb(null, true);
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = uploadResume;
