const fs = require("fs");
const path = require("path");
const UserDocument = require("../models/userDocumentModel");

// exports.uploadOrUpdateResume = async (req, res) => {
//   try {
//     const userId = req.headers["user-id"];
//     if (!userId) {
//       return res.status(400).json({ message: "User ID missing in headers" });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "Resume file is required" });
//     }

//     const resumeUrl = `${req.protocol}://${req.get("host")}/uploads/${userId}/documents/${req.file.filename}`;

//     let document = await UserDocument.findOne({ userId });

//     // 🧹 DELETE OLD RESUME IF EXISTS
//     if (document?.resumeUrl) {
//       const oldPath = path.join(
//         __dirname,
//         "..",
//         "..",
//         document.resumeUrl.replace(req.protocol + "://" + req.get("host") + "/", "")
//       );

//       if (fs.existsSync(oldPath)) {
//         fs.unlinkSync(oldPath);
//       }
//     }

//     // UPSERT
//     document = await UserDocument.findOneAndUpdate(
//       { userId },
//       { resumeUrl },
//       { upsert: true, new: true }
//     );

//     return res.status(200).json({
//       message: "Resume uploaded successfully",
//       data: document,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Error uploading resume",
//       error: error.message,
//     });
//   }
// };


exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const userId = req.headers["user-id"];

    const filePath = path.join(
      "uploads",
      userId,
      "documents",
      "resume",
      req.file.filename
    );

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      data: {
        file_name: req.file.filename,
        file_path: filePath,
        file_size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.uploadProfile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    const userId = req.headers["user-id"];

    const filePath = path.join(
      "uploads",
      userId,
      "documents",
      "profile",
      req.file.filename
    );

    return res.status(200).json({
      success: true,
      message: "Profile uploaded successfully",
      data: {
        file_name: req.file.filename,
        file_path: filePath,
        file_size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};