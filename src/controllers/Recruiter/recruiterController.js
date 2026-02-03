const User = require("../../models/userModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");
const UserDocument = require("../../models/userDocumentModel");

// ===============================
// DASHBOARD
// ===============================
exports.getRecruiterDashboard = async (req, res) => {
  try {
    const totalCandidates = await User.countDocuments({ role: "student" });

    res.json({
      success: true,
      data: {
        totalCandidates,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// ALL CANDIDATES
// ===============================
exports.getCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: "student" })
      .select("-password");

    res.json({
      success: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// SINGLE CANDIDATE
// ===============================
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await User.findById(req.params.id)
      .select("-password");

    if (!candidate || candidate.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    res.json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// DOMAIN BASED SEARCH
// ===============================
exports.getCandidatesByDomain = async (req, res) => {
  try {
    const domainId = req.params.domainId;

    const users = await UserDomainSkill
      .find({ domain: domainId })
      .populate("user");

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// VIEW RESUME
// ===============================
exports.getCandidateResume = async (req, res) => {
  try {
    const doc = await UserDocument.findOne({
      user: req.params.id,
    });

    if (!doc || !doc.resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    res.json({
      success: true,
      resume: doc.resume,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// SHORTLIST
// ===============================
exports.shortlistCandidate = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      shortlistedBy: req.user._id,
    });

    res.json({
      success: true,
      message: "Candidate shortlisted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// REJECT
// ===============================
exports.rejectCandidate = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      rejectedBy: req.user._id,
    });

    res.json({
      success: true,
      message: "Candidate rejected",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
