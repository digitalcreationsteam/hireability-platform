const multer = require("multer");
const path = require("path");
const fs = require("fs");

const excelDir = "uploads/excel";

if (!fs.existsSync(excelDir)) {
  fs.mkdirSync(excelDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, excelDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== ".xlsx" && ext !== ".xls") {
    return cb(new Error("Only Excel files allowed"));
  }
  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
});
