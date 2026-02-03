const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const recruiterController = require("../controllers/Recruiter/recruiterController");

// =================================================
// 📊 RECRUITER DASHBOARD
// =================================================
router.get(
  "/dashboard",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.getRecruiterDashboard
);

// =================================================
// 👥 VIEW CANDIDATES
// =================================================
router.get(
  "/candidates",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.getCandidates
);

router.get(
  "/candidates/:id",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.getCandidateById
);

// =================================================
// 🎯 DOMAIN / SKILL BASED SEARCH
// =================================================
router.get(
  "/candidates/domain/:domainId",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.getCandidatesByDomain
);

// =================================================
// 📄 VIEW DOCUMENTS
// =================================================
router.get(
  "/candidates/:id/resume",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.getCandidateResume
);

// =================================================
// ⭐ SHORTLIST / REJECT
// =================================================
router.post(
  "/candidates/:id/shortlist",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.shortlistCandidate
);

router.post(
  "/candidates/:id/reject",
  protect,
  authorizeRoles("recruiter"),
  recruiterController.rejectCandidate
);

module.exports = router;
