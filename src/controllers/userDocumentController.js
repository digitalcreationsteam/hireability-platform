const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const UserDocument = require("../models/userDocumentModel");

exports.uploadOrUpdateResume = async (req, res) => {
  try {
    const userIdFromHeader = req.headers["user-id"];
    if (!userIdFromHeader) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Resume file is required" });
    }

    // ✅ Convert string to ObjectId using 'new'
    const userId = new mongoose.Types.ObjectId(userIdFromHeader);

    const resumeUrl = `${req.protocol}://${req.get("host")}/uploads/${userIdFromHeader}/documents/resume/${req.file.filename}`;
    const resumeOriginalName = req.file.originalname;

    console.log("📤 Upload - userId (ObjectId):", userId);
    console.log("📤 Upload - resumeUrl:", resumeUrl);

    let document = await UserDocument.findOne({ userId });

    console.log("📄 Existing document:", document);

    // 🧹 DELETE OLD RESUME IF EXISTS
    if (document?.resumeUrl) {
      const oldPath = path.join(
        __dirname,
        "..",
        "..",
        document.resumeUrl.replace(req.protocol + "://" + req.get("host") + "/", "")
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log("🗑️ Deleted old resume:", oldPath);
      }
    }

    // UPSERT
    document = await UserDocument.findOneAndUpdate(
      { userId },
      { 
        userId,
        resumeUrl, 
        resumeOriginalName 
      },
      { upsert: true, new: true }
    );

    console.log("✅ Document saved:", document);

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading resume",
      error: error.message,
    });
  }
};

exports.uploadOrUpdateProfile = async (req, res) => {
  try {
    const userIdFromHeader = req.headers["user-id"];
    if (!userIdFromHeader) {
      return res.status(400).json({ message: "User ID missing in headers" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile file is required" });
    }

    // ✅ Convert to ObjectId
    const userId = new mongoose.Types.ObjectId(userIdFromHeader);

    const profileUrl = `${req.protocol}://${req.get("host")}/uploads/${userIdFromHeader}/documents/profile/${req.file.filename}`;

    console.log("📤 Profile upload - userId (ObjectId):", userId);
    console.log("📤 Profile upload - profileUrl:", profileUrl);

    let document = await UserDocument.findOne({ userId });

    // 🧹 DELETE OLD PROFILE IF EXISTS
    if (document?.profileUrl) {
      const oldPath = path.join(
        __dirname,
        "..",
        "..",
        document.profileUrl.replace(req.protocol + "://" + req.get("host") + "/", "")
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log("🗑️ Deleted old profile:", oldPath);
      }
    }

    // UPSERT
    document = await UserDocument.findOneAndUpdate(
      { userId },
      { 
        userId,
        profileUrl 
      },
      { upsert: true, new: true }
    );

    console.log("✅ Profile document saved:", document);

    return res.status(200).json({
      success: true,
      message: "Profile Photo uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("❌ Profile upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading profile photo",
      error: error.message,
    });
  }
};

exports.getUserDocument = async (req, res) => {
  try {
    const userIdFromHeader = req.headers["user-id"];
    if (!userIdFromHeader) {
      return res.status(400).json({ message: "User ID missing" });
    }

    // ✅ Convert to ObjectId
    const userId = new mongoose.Types.ObjectId(userIdFromHeader);

    console.log("🔍 Getting document for userId (ObjectId):", userId);

    const document = await UserDocument.findOne({ userId });

    console.log("📄 Document found:", !!document);
    if (document) {
      console.log("📄 Document data:", {
        userId: document.userId,
        resumeUrl: document.resumeUrl,
        resumeOriginalName: document.resumeOriginalName,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User document fetched",
      data: {
        resumeUrl: document?.resumeUrl || null,
        resumeOriginalName: document?.resumeOriginalName || null,
        profileUrl: document?.profileUrl || null,
      },
    });
  } catch (error) {
    console.error("❌ Get document error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching document",
      error: error.message,
    });
  }
};