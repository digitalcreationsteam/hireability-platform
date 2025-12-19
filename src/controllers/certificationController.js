const fs = require("fs");
const path = require("path");
const Certification = require("../models/certificationModel");
const User = require("../models/userModel");

// ==================================================================
// FUNCTION: CERTIFICATION SCORING LOGIC
// Each certification = 50 points
// ==================================================================
const calculateCertificationPoints = (certList) => {
  let total = 0;
  for (const cert of certList) {
    total += cert.points || 50;
  }
  return total;
};

// ==================================================================
// FUNCTION: UPDATE USER EXPERIENCE INDEX (CERTIFICATION PART)
// ==================================================================
const updateUserCertificationScore = async (userId) => {
  const certs = await Certification.find({ userId });

  const certificationScore = calculateCertificationPoints(certs);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.certificationScore": certificationScore },
    { new: true }
  );

  return certificationScore;
};

// ==================================================================
// CREATE FOLDER IF NOT EXISTS
// ==================================================================
// const ensureFolder = (folderPath) => {
//   if (!fs.existsSync(folderPath)) {
//     fs.mkdirSync(folderPath, { recursive: true });
//   }
// };

// ==================================================================
// CREATE CERTIFICATION
// ==================================================================
exports.createCertification = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in headers" });
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

        points: 50,
      };
    });

    const savedCerts = await Certification.insertMany(payload);
    const score = await updateUserCertificationScore(userId);

    return res.status(201).json({
      message: "Certifications added successfully",
      count: savedCerts.length,
      certificationScore: score,
      data: savedCerts,
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
    // Get userId from headers
    const userId = req.headers['user-id']; // use same key everywhere

    if (!userId) {
      return res.status(400).json({ message: "User ID is required in headers" });
    }

    // Find certification by id AND userId (security check)
    const cert = await Certification.findOne({
      _id: req.params.id,
      userId: userId,
    });

    if (!cert) {
      return res.status(404).json({
        message: "Certification not found or access denied",
      });
    }

    return res.status(200).json({
      message: "Certification fetched",
      data: cert,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching certification",
      error: error.message,
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
