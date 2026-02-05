const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const adminCaseController = require("../controllers/Admin/adminCaseController");
const {importCaseStudiesFromExcel} = require("../controllers/bulkCaseImportController")
router.post("/", protect, authorizeRoles("admin"), adminCaseController.createCaseStudy);

router.put("/:caseId", protect, authorizeRoles("admin"), adminCaseController.updateCaseStudy);

router.post("/:caseId/opening", protect, authorizeRoles("admin"), adminCaseController.createCaseOpening);

router.post("/:caseId/questions", protect, authorizeRoles("admin"), adminCaseController.addCaseQuestion);

router.put("/questions/:questionId", protect, authorizeRoles("admin"), adminCaseController.updateCaseQuestion);

router.post("/:caseId/reveal", protect, authorizeRoles("admin"), adminCaseController.createCaseReveal);

router.patch("/:caseId/publish", protect, authorizeRoles("admin"), adminCaseController.publishCase);

router.patch("/:caseId/unpublish", protect, authorizeRoles("admin"), adminCaseController.unpublishCase);

router.post(
  "/import",
  protect,
  authorizeRoles("admin"),
  upload.single("file"),      // Excel file will come as 'file'
  importCaseStudiesFromExcel  // Controller function
);


module.exports = router;
