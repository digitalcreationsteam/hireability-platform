const fs = require("fs");
const path = require("path");
const Certification = require("../models/certificationModel");
const User = require("../models/userModel");

/* ===================== SCORING ===================== */
const calculateCertificationPoints = (certList) => {
  let total = 0;
  for (const cert of certList) {
    total += cert.points || 50;
  }
  return total;
};

const updateUserCertificationScore = async (userId) => {
  const certs = await Certification.find({ userId });
  const score = calculateCertificationPoints(certs);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.certificationScore": score },
    { new: true }
  );

  return score;
};

/* ===================== FOLDER ===================== */
const ensureFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

/* ===================== MULTIPLE CREATE ===================== */
exports.createMultipleCertifications = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const { certifications } = req.body;

    if (!Array.isArray(certifications) || certifications.length === 0) {
      return res.status(400).json({
        message: "certifications must be a non-empty array",
      });
    }

    // Create user folder
    const userFolder = path.join("uploads", "certifications", userId);
    ensureFolder(userFolder);

    const files = req.files || [];

    const certDocs = certifications.map((cert, index) => {
      const file = files[index];

      const fileUrl = file
        ? `${req.protocol}://${req.get("host")}/uploads/certifications/${userId}/${file.filename}`
        : null;

      return {
        userId,
        certificationName: cert.certificationName,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        credentialLink: cert.credentialLink || null,
        certificateFileUrl: fileUrl,
        points: 50,
      };
    });

    const insertedCerts = await Certification.insertMany(certDocs);

    const score = await updateUserCertificationScore(userId);

    return res.status(201).json({
      message: "Certifications added successfully",
      totalAdded: insertedCerts.length,
      certificationScore: score,
      data: insertedCerts,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating certifications",
      error: error.message,
    });
  }
};


// ==================================================================
// GET ALL CERTIFICATIONS OF USER
// ==================================================================
exports.getCertifications = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const certs = await Certification.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Certifications fetched successfully",
      data: certs
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching certifications",
      error: error.message
    });
  }
};

// ==================================================================
// GET SINGLE CERTIFICATION BY ID
// ==================================================================
exports.getCertificationById = async (req, res) => {
  try {
    const cert = await Certification.findById(req.params.id);

    if (!cert) {
      return res.status(404).json({ message: "Certification not found" });
    }

    return res.status(200).json({
      message: "Certification fetched",
      data: cert
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching certification",
      error: error.message
    });
  }
};

// ==================================================================
// UPDATE CERTIFICATION
// ==================================================================
exports.updateCertification = async (req, res) => {
  try {
    const existingCert = await Certification.findById(req.params.id);

    if (!existingCert) {
      return res.status(404).json({ message: "Certification not found" });
    }

    const userId = existingCert.userId;

    // If new file uploaded → delete old one
    let fileUrl = existingCert.certificateFileUrl;
    if (req.file) {
      const oldFile = existingCert.certificateFileUrl?.split("/").pop();

      if (oldFile) {
        const oldPath = path.join("uploads", "certifications", userId.toString(), oldFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      fileUrl = `${req.protocol}://${req.get("host")}/uploads/certifications/${userId}/${req.file.filename}`;
    }

    const updateData = {
      certificationName: req.body.certificationName,
      issuer: req.body.issuer,
      issueDate: req.body.issueDate,
      credentialLink: req.body.credentialLink || null,
      certificateFileUrl: fileUrl
    };

    const updatedCert = await Certification.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    const score = await updateUserCertificationScore(userId);

    return res.status(200).json({
      message: "Certification updated successfully",
      certificationScore: score,
      data: updatedCert
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating certification",
      error: error.message
    });
  }
};

// ==================================================================
// DELETE CERTIFICATION
// ==================================================================
exports.deleteCertification = async (req, res) => {
  try {
    const cert = await Certification.findByIdAndDelete(req.params.id);

    if (!cert) {
      return res.status(404).json({ message: "Certification not found" });
    }

    const userId = cert.userId;

    // Delete file if exists
    if (cert.certificateFileUrl) {
      const fileName = cert.certificateFileUrl.split("/").pop();
      const filePath = path.join("uploads", "certifications", userId.toString(), fileName);

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const score = await updateUserCertificationScore(userId);

    return res.status(200).json({
      message: "Certification deleted successfully",
      certificationScore: score
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting certification",
      error: error.message
    });
  }
};
