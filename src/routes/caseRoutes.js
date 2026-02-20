// const express = require("express");
// const router = express.Router();

// const {
//   getAllCases,
//   startCase,
//   getCurrentQuestion,
//   submitAnswer,
//   submitAttempt,
//   getCaseReveal,
//   getWeeklyAttempts
// } = require("../controllers/caseController");

// const { protect } = require("../middlewares/authMiddleware");
// const checkFeature = require("../middlewares/checkFeature");

// // GET /api/cases
// router.get("/", protect, getAllCases);
// // POST /api/cases/:caseId/start
// router.post("/:caseId/start", protect, startCase);
// // GET /api/cases/attempt/:attemptId/question
// router.get("/attempt/:attemptId/question", protect, getCurrentQuestion);
// // POST /api/cases/attempt/:attemptId/answer
// router.post("/attempt/:attemptId/answer", protect, submitAnswer);
// // POST /api/cases/attempt/:attemptId/submit
// router.post("/attempt/:attemptId/submit",protect, submitAttempt);
// // GET /api/cases/:caseId/reveal
// router.get("/:caseId/reveal", protect, getCaseReveal);
// // get how many case study solve in one week
// router.get("/:userId/weekly", protect, getWeeklyAttempts);

// module.exports = router;

const express = require("express")
const router = express.Router()
const caseController = require("../controllers/caseController")
const { protect } = require("../middlewares/authMiddleware");
const checkFeature = require("../middlewares/checkFeature");

router.get("/", protect,checkFeature("caseStudyAccess"), caseController.getCases)
router.post("/:caseId/start", protect, caseController.startCase)
router.get("/:caseId/opening", protect, caseController.getOpening)
router.get("/:caseId/questions/:number", protect, caseController.getQuestion)
router.post("/:caseId/questions/:questionId/answer", protect, caseController.submitAnswer)
router.post("/:caseId/retry", protect, caseController.retryCase)
router.get("/:caseId/reveal", protect, caseController.getReveal)
 router.post("/attempt/:attemptId/submit",protect, caseController.submitAttempt);

module.exports = router
