const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/certificationUpload");
const certificationController = require("../controllers/certificationController");
const domaincontroller = require("../controllers/SkillIndex/domainController");
const userDomainSkillcontroller = require("../controllers/SkillIndex/userDomainSkillController");
const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
const { getDashboardByUserId } = require("../controllers/dashboardController");
const {
  createEducation,
  getEducations,
  getEducationById,
  updateEducation,
  deleteEducation,
} = require("../controllers/educationController");

const {
  createMultipleWorkExperience,
  getWorkExperiences,
  getWorkExperienceById,
  updateWorkExperience,
  deleteWorkExperience,
} = require("../controllers/workExperienceController");

const {
  createMultipleAwards,
  getAwards,
  getAwardById,
  updateAward,
  deleteAward
} = require("../controllers/awardController");

const {
  createMultipleProjects,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} = require("../controllers/projectController");

const {
  saveDemographics,
  getDemographicsByUser,
  deleteDemographics
} = require("../controllers/demographicsController");

const router = express.Router();

// --------------------------------------------------
// USER PROFILE ROUTE (Already Correct)
// --------------------------------------------------
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});


router.post(
  "/importMcqFromExcel",
  upload.single("file"),
  mcqImportController.importMcqFromExcel
);
router.get("/dashboard/:userId", getDashboardByUserId);
//****************************************************** Skill Index ************************************************************/

router.post("/domain/", domaincontroller.createDomain);      
router.get("/domain/", domaincontroller.getAllDomains);       
router.get("/domain/:id", domaincontroller.getDomainById);
router.put("/domain/:id", domaincontroller.updateDomain);    
router.delete("/domain/:id", domaincontroller.deleteDomain);

router.post("/userDomainSkill", userDomainSkillcontroller.saveUserDomainSkill);
router.get("/userDomainSkill/:userId", userDomainSkillcontroller.getUserDomainSkills);
router.get("/userDomainSkill/:domainId", userDomainSkillcontroller.getUsersByDomain);
router.delete("/userDomainSkill/:id", userDomainSkillcontroller.deleteUserDomainSkill);



//****************************************************** Experience Index *******************************************************/


router.post("/demographics/", saveDemographics); // create/update
router.get("/demographics/:userId", getDemographicsByUser);
router.delete("/demographics/:userId", deleteDemographics);

// --------------------------------------------------
// EDUCATION ROUTES
// --------------------------------------------------

router.post("/education", createEducation);
router.get("/education", getEducations);
router.get("/education/:id", getEducationById);
router.put("/education/:id", updateEducation);
router.delete("/education/:id", deleteEducation);

// --------------------------------------------------
// WORK EXPERIENCE ROUTES
// --------------------------------------------------
router.post("/work", createMultipleWorkExperience);
router.get("/work", getWorkExperiences);
router.get("/work/:id", getWorkExperienceById);
router.put("/work/:id", updateWorkExperience);
router.delete("/work/:id", deleteWorkExperience);

// --------------------------------------------------
// CERTIFICATIONS ROUTES
// --------------------------------------------------
const {
  createMultipleCertifications,
} = require("../controllers/certificationController");

router.post(
  "/certifications",
  upload.array("files"), // 👈 name must match frontend
  createMultipleCertifications
);

router.post("/certification", certificationController.createMultipleCertifications);
router.get("/certification", certificationController.getCertifications);
router.get("/certification/:id", certificationController.getCertificationById);
router.put("/certification/:id", certificationController.updateCertification);
router.delete("/certification/:id", certificationController.deleteCertification);

// --------------------------------------------------
// AWARDS ROUTES
// --------------------------------------------------
router.post("/awards", createMultipleAwards);
router.get("/awards", getAwards);
router.get("/awards/:id", getAwardById);
router.put("/awards/:id", updateAward);
router.delete("/awards/:id", deleteAward);

// --------------------------------------------------
// PROJECTS ROUTES
// --------------------------------------------------
router.post("/projects", createMultipleProjects);
router.get("/projects", getProjects);
router.get("/projects/:id", getProjectById);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

module.exports = router;
