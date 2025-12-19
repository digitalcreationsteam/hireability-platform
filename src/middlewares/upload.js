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

    const userCertDir = path.join(
      baseUploadDir,
      userId,
      "certifications"
    );

    if (!fs.existsSync(userCertDir)) {
      fs.mkdirSync(userCertDir, { recursive: true });
    }

    cb(null, userCertDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .toLowerCase();

    cb(null, `${Date.now()}-${cleanName}${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
