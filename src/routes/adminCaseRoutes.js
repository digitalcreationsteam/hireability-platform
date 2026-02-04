const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const adminCaseController = require("../controllers/Admin/adminCaseController");

router.post("/", protect, authorizeRoles("admin"), adminCaseController.createCaseStudy);

router.put("/:caseId", protect, authorizeRoles("admin"), adminCaseController.updateCaseStudy);

router.post("/:caseId/opening", protect, authorizeRoles("admin"), adminCaseController.createCaseOpening);

router.post("/:caseId/questions", protect, authorizeRoles("admin"), adminCaseController.addCaseQuestion);

router.put("/questions/:questionId", protect, authorizeRoles("admin"), adminCaseController.updateCaseQuestion);

router.post("/:caseId/reveal", protect, authorizeRoles("admin"), adminCaseController.createCaseReveal);

router.patch("/:caseId/publish", protect, authorizeRoles("admin"), adminCaseController.publishCase);

router.patch("/:caseId/unpublish", protect, authorizeRoles("admin"), adminCaseController.unpublishCase);

module.exports = router;
