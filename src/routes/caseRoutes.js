const express = require("express");
const router = express.Router();

const {
  getAllCases,
  startCase,
  getCurrentQuestion,
  submitAnswer,
  submitAttempt,
  getCaseReveal
} = require("../controllers/caseController");

const { protect } = require("../middlewares/authMiddleware");
const checkFeature = require("../middlewares/checkFeature");

// GET /api/cases
router.get("/", protect, checkFeature("caseStudyAccess"), getAllCases);
// POST /api/cases/:caseId/start
router.post("/:caseId/start", protect,checkFeature("caseStudyAccess"), startCase);
// GET /api/cases/attempt/:attemptId/question
router.get("/attempt/:attemptId/question", protect,checkFeature("caseStudyAccess"), getCurrentQuestion);
// POST /api/cases/attempt/:attemptId/answer
router.post("/attempt/:attemptId/answer", protect,checkFeature("caseStudyAccess"), submitAnswer);
// POST /api/cases/attempt/:attemptId/submit
router.post("/attempt/:attemptId/submit", protect,checkFeature("caseStudyAccess"), submitAttempt);
// GET /api/cases/:caseId/reveal
router.get("/:caseId/reveal", protect,checkFeature("caseStudyAccess"), getCaseReveal);

module.exports = router;