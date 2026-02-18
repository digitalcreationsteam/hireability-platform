// controllers/certificationController.js
const fs = require("fs");
const path = require("path");
const Certification = require("../models/certificationModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
const { calculateNavigation, getCompletionStatus } = require("./authController");

/* --------------------------------------------------
   SCORING LOGIC
-------------------------------------------------- */
const calculateCertificationPoints = (certList) => {
  let total = 0;
  for (const cert of certList) {
    total += cert.certificationScore || 5;
  }
  return total;
};

const updateUserCertificationScore = async (userId) => {
  const certs = await Certification.find({ userId });
  const certificationScore = calculateCertificationPoints(certs);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.certificationScore": certificationScore },
    { new: true }
  );
  await recalculateUserScore(userId);
  return certificationScore;
};

/* --------------------------------------------------
   CREATE CERTIFICATION
-------------------------------------------------- */
exports.createCertification = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing in headers",
      });
    }

    // ✅ CHECK MAX LIMIT (5 certifications)
    const existingCount = await Certification.countDocuments({ userId });
    const incomingCount = Array.isArray(req.body.certificationName)
      ? req.body.certificationName.length
      : 1;

    if (existingCount + incomingCount > 5) {
      return res.status(400).json({
        success: false,
        message: "You can add a maximum of 5 certifications only.",
      });
    }

    const {
      certificationName = [],
      issuer = [],
      issueDate = [],
      credentialLink = [],
    } = req.body;

    const files = req.files || [];

    if (!certificationName.length) {
      return res.status(400).json({
        success: false,
        message: "At least one certification is required",
      });
    }

    const payload = certificationName.map((_, index) => {
      const file = files[index];

      return {
        userId,
        certificationName: certificationName[index],
        issuer: issuer[index],
        issueDate: issueDate[index],
        credentialLink: credentialLink[index] || null,
        certificateFileUrl: file
          ? `${req.protocol}://${req.get("host")}/uploads/${userId}/certifications/${file.filename}`
          : null,
        certificationScore: 5,
      };
    });

    const savedCerts = await Certification.insertMany(payload);
    const score = await updateUserCertificationScore(userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(201).json({
      success: true,
      message: "Certifications added successfully",
      count: savedCerts.length,
      certificationScore: score,
      data: savedCerts,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Create certifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating certifications",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET ALL CERTIFICATIONS
-------------------------------------------------- */
exports.getCertifications = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    const certs = await Certification.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Certifications fetched successfully",
      data: certs,
    });
  } catch (error) {
    console.error("❌ Get certifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching certifications",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET SINGLE CERTIFICATION BY ID
-------------------------------------------------- */
exports.getCertificationById = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required in headers",
      });
    }

    const cert = await Certification.findOne({
      _id: req.params.id,
      userId: userId,
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: "Certification not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certification fetched",
      data: cert,
    });
  } catch (error) {
    console.error("❌ Get certification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching certification",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   UPDATE CERTIFICATION
-------------------------------------------------- */
exports.updateCertification = async (req, res) => {
  try {
    const existingCert = await Certification.findById(req.params.id);

    if (!existingCert) {
      return res.status(404).json({
        success: false,
        message: "Certification not found",
      });
    }

    const userId = existingCert.userId;

    // If new file uploaded → delete old one
    let fileUrl = existingCert.certificateFileUrl;
    if (req.file) {
      const oldFile = existingCert.certificateFileUrl?.split("/").pop();

      if (oldFile) {
        const oldPath = path.join(
          "uploads",
          "certifications",
          userId.toString(),
          oldFile
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      fileUrl = `${req.protocol}://${req.get("host")}/uploads/certifications/${userId}/${req.file.filename}`;
    }

    const updateData = {
      certificationName: req.body.certificationName,
      issuer: req.body.issuer,
      issueDate: req.body.issueDate,
      credentialLink: req.body.credentialLink || null,
      certificateFileUrl: fileUrl,
    };

    const updatedCert = await Certification.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    const score = await updateUserCertificationScore(userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Certification updated successfully",
      certificationScore: score,
      data: updatedCert,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Update certification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating certification",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   DELETE CERTIFICATION
-------------------------------------------------- */
exports.deleteCertification = async (req, res) => {
  try {
    const cert = await Certification.findByIdAndDelete(req.params.id);

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: "Certification not found",
      });
    }

    const userId = cert.userId;

    // Delete file if exists
    if (cert.certificateFileUrl) {
      const fileName = cert.certificateFileUrl.split("/").pop();
      const filePath = path.join(
        "uploads",
        "certifications",
        userId.toString(),
        fileName
      );

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const score = await updateUserCertificationScore(userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Certification deleted successfully",
      certificationScore: score,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Delete certification error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting certification",
      error: error.message,
    });
  }
};