const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.join(__dirname, "..", "..", "uploads");

/**
 * Common storage factory
 */
const createStorage = (subFolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.headers["user-id"];
      if (!userId) {
        return cb(new Error("User ID missing in headers"));
      }

      const uploadDir = path.join(
        baseUploadDir,
        userId,
        "documents",
        subFolder
      );

      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${subFolder}${ext}`);
    },
  });

/**
 * Resume upload (PDF only)
 */
const resumeFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"), false);
  }
  cb(null, true);
};

const uploadResume = multer({
  storage: createStorage("resume"),
  fileFilter: resumeFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Profile upload (Image only)
 */
const profileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, JPEG, PNG allowed"), false);
  }
  cb(null, true);
};

const uploadProfile = multer({
  storage: createStorage("profile"),
  fileFilter: profileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = {
  uploadResume,
  uploadProfile,
};
