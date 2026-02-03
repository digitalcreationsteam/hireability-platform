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
    const ext = path.extname(file.originalname); // .png .jpg .jpeg
    cb(null, `${Date.now()}-profile${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error("Only PNG, JPG, JPEG files are allowed"),
      false
    );
  }

  cb(null, true);
};

const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = uploadProfile;
