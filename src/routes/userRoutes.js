const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const upload = require("../middlewares/upload");
const uploadExcel = require("../middlewares/uploadExcel");
const uploadResume = require("../middlewares/uploadResume");
const uploadProfile = require("../middlewares/uploadProfile");

// ================= CONTROLLERS =================
const certificationController = require("../controllers/certificationController");
const domainController = require("../controllers/SkillIndex/domainController");
const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
const skillAssessmentController = require("../controllers/SkillIndex/skillAssessmentController");
const assessmentController = require("../controllers/SkillIndex/assessmentController");
const { getDashboardByUserId } = require("../controllers/dashboardController");
const educationController = require("../controllers/educationController");
const workExperienceController = require("../controllers/workExperienceController");
const awardController = require("../controllers/awardController");
const projectController = require("../controllers/projectController");
const demographicsController = require("../controllers/demographicsController");
const userDocumentController = require("../controllers/userDocumentController");
const universityController = require("../controllers/universityController");



const router = express.Router();

// =================================================
// USER PROFILE (STUDENT)
// =================================================
// router.get(
//   "/profile",
//   protect,
//   authorizeRoles("student"),
//   (req, res) => {
//     res.json({ success: true, user: req.user });
//   }
// );

// =================================================
// DASHBOARD (STUDENT)
// =================================================
router.get(
  "/dashboard",
  protect,
  authorizeRoles("student"),
  getDashboardByUserId
);

router.get(
  "/experience_index",
  protect,
  authorizeRoles("student"),
  getDashboardByUserId
);

// =================================================
// MCQ IMPORT (ADMIN)
// =================================================
router.post(
  "/importMcqFromExcel",
  protect,
  authorizeRoles("admin"),
  uploadExcel.single("file"),
  mcqImportController.importMcqFromExcel
);
// =================================================
// MCQ IMPORT (RECRUITER + ADMIN)
// =================================================

// =================================================
// SKILL INDEX - DOMAIN (ADMIN ONLY)
// =================================================
router.post(
  "/domain",
  protect,
  authorizeRoles("student"),
  domainController.createDomain
);

router.get(
  "/by-domain/:domainId",
  protect,
  authorizeRoles("student"),
  domainController.getSubDomainsByDomain
);

router.get(
  "/domain",
  protect,
  authorizeRoles("student"),
  domainController.getAllDomains
);

router.get(
  "/domain/:id",
  protect,
  authorizeRoles("student"),
  domainController.getDomainById
);

router.put(
  "/domain/:id",
  protect,
  authorizeRoles("student"),
  domainController.updateDomain
);

router.delete(
  "/domain/:id",
  protect,
  authorizeRoles("student"),
  domainController.deleteDomain
);

// =================================================
// USER DOMAIN SKILL (STUDENT)
// =================================================
router.post(
  "/updateUserDomainSkills",
  protect,
  authorizeRoles("student"),
  userDomainSkillController.updateUserDomainSkills
);
router.post(
  "/addUserDomainSubDomain",
  protect,
  authorizeRoles("student"),
  userDomainSkillController.addUserDomainSubDomain
);

router.get(
  "/getUserDomainSkills",
  protect,
  authorizeRoles("student"),
  userDomainSkillController.getUserDomainSkills
);

// =================================================
// VIEW USERS BY DOMAIN (RECRUITER + ADMIN)
// =================================================
router.get(
  "/userDomainSkill/domain/:domainId",
  protect,
  authorizeRoles("recruiter", "admin", "student"),
  userDomainSkillController.getUsersByDomain
);

router.delete(
  "/userDomainSkill/:id",
  protect,
  authorizeRoles("student"),
  userDomainSkillController.deleteUserDomainSkill
);

// =================================================
// DEMOGRAPHICS (STUDENT)
// =================================================


router.get(
  "/universities",
  // protect,
  // authorizeRoles("student"),
  universityController.searchUniversities
);


router.get(
  "/demographics",
  protect,
  authorizeRoles("student"),
  demographicsController.getDemographicsByUser
);

router.delete(
  "/demographics/:userId",
  protect,
  authorizeRoles("student"),
  demographicsController.deleteDemographics
);

router.post(
  "/demographics",
  protect,
  authorizeRoles("student"),
  demographicsController.saveDemographics
);

// =================================================
// EDUCATION (STUDENT)
// =================================================
router.post(
  "/education",
  protect,
  authorizeRoles("student"),
  educationController.createEducation
);

router.get(
  "/education",
  protect,
  authorizeRoles("student"),
  educationController.getEducations
);

router.get(
  "/education/:id",
  protect,
  authorizeRoles("student"),
  educationController.getEducationById
);

router.put(
  "/education/:id",
  protect,
  authorizeRoles("student"),
  educationController.updateEducation
);

router.delete(
  "/education/:id",
  protect,
  authorizeRoles("student"),
  educationController.deleteEducation
);

// =================================================
// WORK EXPERIENCE (STUDENT)
// =================================================
router.post(
  "/work",
  protect,
  authorizeRoles("student"),
  workExperienceController.createMultipleWorkExperience
);

router.get(
  "/work",
  protect,
  authorizeRoles("student"),
  workExperienceController.getWorkExperiences
);

router.get(
  "/work/:id",
  protect,
  authorizeRoles("student"),
  workExperienceController.getWorkExperienceById
);

router.put(
  "/work/:id",
  protect,
  authorizeRoles("student"),
  workExperienceController.updateWorkExperience
);

router.delete(
  "/work/:id",
  protect,
  authorizeRoles("student"),
  workExperienceController.deleteWorkExperience
);

// =================================================
// CERTIFICATIONS (STUDENT)
// =================================================

router.post(
  "/certification",
  protect,
  authorizeRoles("student"),
  upload.array("certificateFiles"),
  certificationController.createCertification
);

router.get(
  "/certification",
  protect,
  authorizeRoles("student"),
  certificationController.getCertifications
);

router.put(
  "/certification/:id",
  protect,
  authorizeRoles("student"),
  upload.single("file"),
  certificationController.updateCertification
);

router.delete(
  "/certification/:id",
  protect,
  authorizeRoles("student"),
  certificationController.deleteCertification
);

// =================================================
// RESUME (STUDENT)
// =================================================
router.post(
  "/resume",
  protect,
  authorizeRoles("student"),
  uploadResume.single("resume"),
  userDocumentController.uploadOrUpdateResume
);

router.post(
  "/profile",
  protect,
  authorizeRoles("student"),
  uploadProfile.single("avatar"),
  userDocumentController.uploadOrUpdateProfile
);

router.get(
  "/resume",
  protect,
  authorizeRoles("student"),
  userDocumentController.getUserDocument
);


// =================================================
// AWARDS (STUDENT)
// =================================================
router.post(
  "/awards",
  protect,
  authorizeRoles("student"),
  awardController.createMultipleAwards
);

router.get(
  "/awards",
  protect,
  authorizeRoles("student"),
  awardController.getAwards
);
router.post(
  "/awards/:id",
  protect,
  authorizeRoles("student"),
  awardController.deleteAward
);

// =================================================
// PROJECTS (STUDENT)
// =================================================
router.post(
  "/projects",
  protect,
  authorizeRoles("student"),
  projectController.createMultipleProjects
);

router.get(
  "/projects",
  protect,
  authorizeRoles("student"),
  projectController.getProjects
);

router.post(
  "/projects/:id",
  protect,
  authorizeRoles("student"),
  projectController.deleteProject
);


// =================================================
// RANKING (STUDENT)
// =================================================

// =================================================


// Submit test
router.post(
  "/assessment/submit",
  protect,
  authorizeRoles("student"),
  assessmentController.submitAssessment
);
router.post(
  "/assessment/saveAnswer",
  protect,
  authorizeRoles("student"),
  assessmentController.saveAnswer
);
router.post(
  "/assessment/start",
  protect,
  authorizeRoles("student"),
  assessmentController.startAssessment
);
router.get(
  "/assessment/getAttemptQuestions/:attemptId",
  protect,
  authorizeRoles("student"),
  assessmentController.getAttemptQuestions
);

router.get(
  "/assessment/result/latest",
  protect,
  authorizeRoles("student"),
  assessmentController.getLatestResult
);


router.post("/assessment/:attemptId/violation", protect, authorizeRoles("student"), assessmentController.reportViolation);
// router.get("/assessment/:attemptId/integrity",protect,  authorizeRoles("student"),  assessmentController.getIntegrity);

// Assessment (STUDENT)
// =================================================
// router.post("/schedule", protect, authorizeRoles("student"), skillAssessmentController.scheduleAssessment);
// router.get("/:id/start", protect, authorizeRoles("student"), skillAssessmentController.startAssessment);
// router.post("/:id/submit", protect, authorizeRoles("student"), skillAssessmentController.submitAssessment);


module.exports = router;
