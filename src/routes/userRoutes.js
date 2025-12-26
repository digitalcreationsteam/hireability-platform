const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");
const uploadExcel = require("../middlewares/uploadExcel");
const uploadResume = require("../middlewares/uploadResume");
// ================= CONTROLLERS =================
const certificationController = require("../controllers/certificationController");
const domainController = require("../controllers/SkillIndex/domainController");
const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
const { getDashboardByUserId } = require("../controllers/dashboardController");
const educationController = require("../controllers/educationController");
const workExperienceController = require("../controllers/workExperienceController");
const awardController = require("../controllers/awardController");
const projectController = require("../controllers/projectController");
const demographicsController = require("../controllers/demographicsController");
const userDocumentController= require("../controllers/userDocumentController");
const router = express.Router();

// =================================================
// USER PROFILE
// =================================================
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// =================================================
// DASHBOARD
// =================================================
router.get("/dashboard", getDashboardByUserId);
router.get("/experience_index", getDashboardByUserId);

// =================================================
// MCQ IMPORT
// =================================================
router.post(
  "/importMcqFromExcel",
  uploadExcel.single("file"),
  mcqImportController.importMcqFromExcel
);

// =================================================
// SKILL INDEX - DOMAIN
// =================================================
router.post("/domain", domainController.createDomain);
router.get("/domain", domainController.getAllDomains);
router.get("/domain/:id", domainController.getDomainById);
router.put("/domain/:id", domainController.updateDomain);
router.delete("/domain/:id", domainController.deleteDomain);

// =================================================
// USER DOMAIN SKILL
// =================================================
router.post("/userDomainSkill", userDomainSkillController.saveUserDomainSkill);
router.get("/userDomainSkill/:userId", userDomainSkillController.getUserDomainSkills);
router.get("/userDomainSkill/domain/:domainId", userDomainSkillController.getUsersByDomain);
router.delete("/userDomainSkill/:id", userDomainSkillController.deleteUserDomainSkill);

// =================================================
// DEMOGRAPHICS
// =================================================
router.post("/demographics", demographicsController.saveDemographics);
router.get("/demographics", demographicsController.getDemographicsByUser);
router.delete("/demographics/:userId", demographicsController.deleteDemographics);

// =================================================
// EDUCATION
// =================================================
router.post("/education", educationController.createEducation);
router.get("/education", educationController.getEducations);
router.get("/education/:id", educationController.getEducationById);
router.put("/education/:id", educationController.updateEducation);
router.delete("/education/:id", educationController.deleteEducation);

// =================================================
// WORK EXPERIENCE (MULTIPLE)
// =================================================
router.post("/work", workExperienceController.createMultipleWorkExperience);
router.get("/work", workExperienceController.getWorkExperiences);
router.get("/work/:id", workExperienceController.getWorkExperienceById);
router.put("/work/:id", workExperienceController.updateWorkExperience);
router.delete("/work/:id", workExperienceController.deleteWorkExperience);

// =================================================
// CERTIFICATIONS (MULTIPLE + FILES)
// =================================================
// CERTIFICATIONS
router.post(
  "/certification",
  upload.array("certificateFiles"), // multiple files
  certificationController.createCertification
);



router.post(
  "/resume",
  uploadResume.single("resume"),
  userDocumentController.uploadOrUpdateResume
);

router.get("/certification", certificationController.getCertifications);
router.get("/certification", certificationController.getCertificationById);
router.put("/certification/:id", upload.single("file"), certificationController.updateCertification);
router.delete("/certification/:id", certificationController.deleteCertification);

// =================================================
// AWARDS (MULTIPLE)
// =================================================
router.post("/awards", awardController.createMultipleAwards);
router.get("/awards", awardController.getAwards);
router.get("/awards/:id", awardController.getAwardById);
router.put("/awards/:id", awardController.updateAward);
router.delete("/awards/:id", awardController.deleteAward);

// =================================================
// PROJECTS (MULTIPLE)
// =================================================
router.post("/projects", projectController.createMultipleProjects);
router.get("/projects", projectController.getProjects);
router.get("/projects/:id", projectController.getProjectById);
router.put("/projects/:id", projectController.updateProject);
router.delete("/projects/:id", projectController.deleteProject);

module.exports = router;
