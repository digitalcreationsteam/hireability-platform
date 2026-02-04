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

// GET /api/cases
router.get("/", protect, getAllCases);
// POST /api/cases/:caseId/start
router.post("/:caseId/start", protect, startCase);
// GET /api/cases/attempt/:attemptId/question
router.get("/attempt/:attemptId/question", protect, getCurrentQuestion);
// POST /api/cases/attempt/:attemptId/answer
router.post("/attempt/:attemptId/answer", protect, submitAnswer);
// POST /api/cases/attempt/:attemptId/submit
router.post("/attempt/:attemptId/submit", protect, submitAttempt);
// GET /api/cases/:caseId/reveal
router.get("/:caseId/reveal", protect, getCaseReveal);

module.exports = router;