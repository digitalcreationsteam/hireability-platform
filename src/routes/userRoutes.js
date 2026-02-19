// const express = require("express");
// const { protect } = require("../middlewares/authMiddleware");
// const { authorizeRoles } = require("../middlewares/roleMiddleware");

// const upload = require("../middlewares/upload");
// const uploadExcel = require("../middlewares/uploadExcel");
// const uploadResume = require("../middlewares/uploadResume");
// const uploadProfile = require("../middlewares/uploadProfile");

// // ================= CONTROLLERS =================
// const certificationController = require("../controllers/certificationController");
// const domainController = require("../controllers/SkillIndex/domainController");
// const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
// const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
// const skillAssessmentController = require("../controllers/SkillIndex/skillAssessmentController");
// const assessmentController = require("../controllers/SkillIndex/assessmentController");
// const { getDashboardByUserId } = require("../controllers/dashboardController");
// const educationController = require("../controllers/educationController");
// const workExperienceController = require("../controllers/workExperienceController");
// const awardController = require("../controllers/awardController");
// const projectController = require("../controllers/projectController");
// const demographicsController = require("../controllers/demographicsController");
// const userDocumentController = require("../controllers/userDocumentController");
// const universityController = require("../controllers/universityController");
// const { getUserProfile,
//   updateDemographics,
//   uploadProfilePicture,
//   getEducation,
//   addEducation,
//   updateEducation,
//   deleteEducation,
//   getWorkExperience,
//   addWorkExperience,
//   updateWorkExperience,
//   deleteWorkExperience,

//   getResume } = require('../controllers/userController');
// const authMiddleware = require('../middlewares/authMiddleware');


// const router = express.Router();

// // =================================================
// // USER PROFILE (STUDENT)
// // =================================================
// // router.get(
// //   "/profile",
// //   protect,
// //   authorizeRoles("student"),
// //   (req, res) => {
// //     res.json({ success: true, user: req.user });
// //   }
// // );

// // =================================================
// // DASHBOARD (STUDENT)
// // =================================================
// router.get(
//   "/dashboard",
//   protect,
//   authorizeRoles("student"),
//   getDashboardByUserId
// );

// router.get(
//   "/experience_index",
//   protect,
//   authorizeRoles("student"),
//   getDashboardByUserId
// );

// // =================================================
// // MCQ IMPORT (ADMIN)
// // =================================================
// router.post(
//   "/importMcqFromExcel",
//   protect,
//   authorizeRoles("admin"),
//   uploadExcel.single("file"),
//   mcqImportController.importMcqFromExcel
// );
// // =================================================
// // MCQ IMPORT (RECRUITER + ADMIN)
// // =================================================

// // =================================================
// // SKILL INDEX - DOMAIN (ADMIN ONLY)
// // =================================================
// router.post(
//   "/domain",
//   protect,
//   authorizeRoles("student"),
//   domainController.createDomain
// );

// router.get(
//   "/by-domain/:domainId",
//   protect,
//   authorizeRoles("student"),
//   domainController.getSubDomainsByDomain
// );

// router.get(
//   "/domain",
//   protect,
//   authorizeRoles("student"),
//   domainController.getAllDomains
// );

// router.get(
//   "/domain/:id",
//   protect,
//   authorizeRoles("student"),
//   domainController.getDomainById
// );

// router.put(
//   "/domain/:id",
//   protect,
//   authorizeRoles("student"),
//   domainController.updateDomain
// );

// router.delete(
//   "/domain/:id",
//   protect,
//   authorizeRoles("student"),
//   domainController.deleteDomain
// );

// // =================================================
// // USER DOMAIN SKILL (STUDENT)
// // =================================================
// router.post(
//   "/updateUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.updateUserDomainSkills
// );
// router.post(
//   "/addUserDomainSubDomain",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.addUserDomainSubDomain
// );

// router.get(
//   "/getUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.getUserDomainSkills
// );

// // =================================================
// // VIEW USERS BY DOMAIN (RECRUITER + ADMIN)
// // =================================================
// router.get(
//   "/userDomainSkill/domain/:domainId",
//   protect,
//   authorizeRoles("recruiter", "admin", "student"),
//   userDomainSkillController.getUsersByDomain
// );

// router.delete(
//   "/userDomainSkill/:id",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.deleteUserDomainSkill
// );

// // =================================================
// // DEMOGRAPHICS (STUDENT)
// // =================================================


// router.get(
//   "/universities",
//   // protect,
//   // authorizeRoles("student"),
//   universityController.searchUniversities
// );

// router.post(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.saveDemographics
// );

// router.get(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.getDemographicsByUser
// );

// router.delete(
//   "/demographics/:userId",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.deleteDemographics
// );
// router.post(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.saveDemographics
// );

// router.post(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.saveDemographics
// );

// // =================================================
// // EDUCATION (STUDENT)
// // =================================================
// router.post(
//   "/education",
//   protect,
//   authorizeRoles("student"),
//   educationController.createEducation
// );

// router.get(
//   "/education",
//   protect,
//   authorizeRoles("student"),
//   educationController.getEducations
// );

// router.get(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.getEducationById
// );

// router.put(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.updateEducation
// );

// router.delete(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.deleteEducation
// );

// // =================================================
// // WORK EXPERIENCE (STUDENT)
// // =================================================
// router.post(
//   "/work",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.createMultipleWorkExperience
// );

// router.get(
//   "/work",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.getWorkExperiences
// );

// router.get(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.getWorkExperienceById
// );

// router.put(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.updateWorkExperience
// );

// router.delete(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.deleteWorkExperience
// );

// // =================================================
// // CERTIFICATIONS (STUDENT)
// // =================================================

// router.post(
//   "/certification",
//   protect,
//   authorizeRoles("student"),
//   upload.array("certificateFiles"),
//   certificationController.createCertification
// );

// router.get(
//   "/certification",
//   protect,
//   authorizeRoles("student"),
//   certificationController.getCertifications
// );

// router.put(
//   "/certification/:id",
//   protect,
//   authorizeRoles("student"),
//   upload.single("file"),
//   certificationController.updateCertification
// );

// router.delete(
//   "/certification/:id",
//   protect,
//   authorizeRoles("student"),
//   certificationController.deleteCertification
// );

// // =================================================
// // RESUME (STUDENT)
// // =================================================
// router.post(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   uploadResume.single("resume"),
//   userDocumentController.uploadOrUpdateResume
// );

// router.post(
//   "/profile",
//   protect,
//   authorizeRoles("student"),
//   uploadProfile.single("avatar"),
//   userDocumentController.uploadOrUpdateProfile
// );

// router.get(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   userDocumentController.getUserDocument
// );


// // =================================================
// // AWARDS (STUDENT)
// // =================================================
// router.post(
//   "/awards",
//   protect,
//   authorizeRoles("student"),
//   awardController.createMultipleAwards
// );

// router.get(
//   "/awards",
//   protect,
//   authorizeRoles("student"),
//   awardController.getAwards
// );
// router.post(
//   "/awards/:id",
//   protect,
//   authorizeRoles("student"),
//   awardController.deleteAward
// );

// router.put(
//   "/projects/:id",
//   protect,
//   authorizeRoles("student"),
//   projectController.updateProject
// );


// // =================================================
// // PROJECTS (STUDENT)
// // =================================================
// router.post(
//   "/projects",
//   protect,
//   authorizeRoles("student"),
//   projectController.createMultipleProjects
// );

// router.get(
//   "/projects",
//   protect,
//   authorizeRoles("student"),
//   projectController.getProjects
// );

// router.post(
//   "/projects/:id",
//   protect,
//   authorizeRoles("student"),
//   projectController.deleteProject
// );

// router.put(
//   "/projects/:id",
//   protect,
//   authorizeRoles("student"),
//   projectController.updateProject
// );


// // =================================================
// // RANKING (STUDENT)
// // =================================================

// // =================================================


// // Submit test
// router.post(
//   "/assessment/submit",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.submitAssessment
// );
// router.post(
//   "/assessment/saveAnswer",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.saveAnswer
// );
// router.post(
//   "/assessment/start",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.startAssessment
// );
// router.get(
//   "/assessment/getAttemptQuestions/:attemptId",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.getAttemptQuestions
// );

// router.get(
//   "/assessment/result/latest",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.getLatestResult
// );


// router.post("/assessment/:attemptId/violation", protect, authorizeRoles("student"), assessmentController.reportViolation);
// // router.get("/assessment/:attemptId/integrity",protect,  authorizeRoles("student"),  assessmentController.getIntegrity);

// // Assessment (STUDENT)
// // =================================================
// // router.post("/schedule", protect, authorizeRoles("student"), skillAssessmentController.scheduleAssessment);
// // router.get("/:id/start", protect, authorizeRoles("student"), skillAssessmentController.startAssessment);
// // router.post("/:id/submit", protect, authorizeRoles("student"), skillAssessmentController.submitAssessment);



// // Public routes (if any)
// // router.get('/public/:id', userController.getPublicProfile);

// // Protected routes - require authentication


// // Profile routes
// router.get('/my-profile', getUserProfile);
// router.post('/demographics', updateDemographics);
// router.post('/profile', upload.single('profile'), uploadProfilePicture);

// // Education routes
// router.get('/education', getEducation);
// router.post('/education', addEducation);
// router.put('/education/:id', updateEducation);
// router.delete('/education/:id', deleteEducation);

// // Work Experience routes
// router.get('/work', getWorkExperience);
// router.post('/work', addWorkExperience);
// router.put('/work/:id', updateWorkExperience);
// router.delete('/work/:id', deleteWorkExperience);

// // Resume routes
// router.post('/resume', upload.single('resume'), uploadResume);
// router.get('/resume', getResume);


// module.exports = router;

// const express = require("express");
// const { protect } = require("../middlewares/authMiddleware");
// const { authorizeRoles } = require("../middlewares/roleMiddleware");

// const upload = require("../middlewares/upload");
// const uploadExcel = require("../middlewares/uploadExcel");
// const uploadResume = require("../middlewares/uploadResume");
// const uploadProfile = require("../middlewares/uploadProfile");

// // ================= CONTROLLERS =================
// const certificationController = require("../controllers/certificationController");
// const domainController = require("../controllers/SkillIndex/domainController");
// const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
// const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
// const skillAssessmentController = require("../controllers/SkillIndex/skillAssessmentController");
// const assessmentController = require("../controllers/SkillIndex/assessmentController");
// const { getDashboardByUserId } = require("../controllers/dashboardController");
// const educationController = require("../controllers/educationController");
// const workExperienceController = require("../controllers/workExperienceController");
// const awardController = require("../controllers/awardController");
// const projectController = require("../controllers/projectController");
// const demographicsController = require("../controllers/demographicsController");
// const userDocumentController = require("../controllers/userDocumentController");
// const universityController = require("../controllers/universityController");

// // Import userController functions
// const userController = require('../controllers/userController');

// const router = express.Router();

// // =================================================
// // DASHBOARD (STUDENT)
// // =================================================
// router.get(
//   "/dashboard",
//   protect,
//   authorizeRoles("student"),
//   getDashboardByUserId
// );

// router.get(
//   "/experience_index",
//   protect,
//   authorizeRoles("student"),
//   getDashboardByUserId
// );

// // =================================================
// // MCQ IMPORT (ADMIN)
// // =================================================
// router.post(
//   "/importMcqFromExcel",
//   protect,
//   authorizeRoles("admin"),
//   uploadExcel.single("file"),
//   mcqImportController.importMcqFromExcel
// );

// // =================================================
// // SKILL INDEX - DOMAIN (ADMIN ONLY)
// // =================================================
// router.post(
//   "/domain",
//   protect,
//   authorizeRoles("admin"),
//   domainController.createDomain
// );

// router.get(
//   "/by-domain/:domainId",
//   protect,
//   authorizeRoles("student"),
//   domainController.getSubDomainsByDomain
// );

// router.get(
//   "/domain",
//   protect,
//   authorizeRoles("student"),
//   domainController.getAllDomains
// );

// router.get(
//   "/domain/:id",
//   protect,
//   authorizeRoles("student"),
//   domainController.getDomainById
// );

// router.put(
//   "/domain/:id",
//   protect,
//   authorizeRoles("admin"),
//   domainController.updateDomain
// );

// router.delete(
//   "/domain/:id",
//   protect,
//   authorizeRoles("admin"),
//   domainController.deleteDomain
// );

// // =================================================
// // USER DOMAIN SKILL (STUDENT)
// // =================================================
// router.post(
//   "/updateUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.updateUserDomainSkills
// );

// router.post(
//   "/addUserDomainSubDomain",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.addUserDomainSubDomain
// );

// router.get(
//   "/getUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.getUserDomainSkills
// );

// // =================================================
// // VIEW USERS BY DOMAIN (RECRUITER + ADMIN)
// // =================================================
// router.get(
//   "/userDomainSkill/domain/:domainId",
//   protect,
//   authorizeRoles("recruiter", "admin", "student"),
//   userDomainSkillController.getUsersByDomain
// );

// router.delete(
//   "/userDomainSkill/:id",
//   protect,
//   authorizeRoles("student"),
//   userDomainSkillController.deleteUserDomainSkill
// );

// // =================================================
// // UNIVERSITIES (PUBLIC)
// // =================================================
// router.get(
//   "/universities",
//   universityController.searchUniversities
// );

// // =================================================
// // DEMOGRAPHICS (STUDENT)
// // =================================================
// router.post(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.saveDemographics
// );

// router.get(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.getDemographicsByUser
// );

// router.delete(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   demographicsController.deleteDemographics
// );

// // =================================================
// // EDUCATION (STUDENT)
// // =================================================
// router.post(
//   "/education",
//   protect,
//   authorizeRoles("student"),
//   educationController.createEducation
// );

// router.get(
//   "/education",
//   protect,
//   authorizeRoles("student"),
//   educationController.getEducations
// );

// router.get(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.getEducationById
// );

// router.put(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.updateEducation
// );

// router.delete(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   educationController.deleteEducation
// );

// // =================================================
// // WORK EXPERIENCE (STUDENT)
// // =================================================
// router.post(
//   "/work",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.createMultipleWorkExperience
// );

// router.get(
//   "/work",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.getWorkExperiences
// );

// router.get(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.getWorkExperienceById
// );

// router.put(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.updateWorkExperience
// );

// router.delete(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   workExperienceController.deleteWorkExperience
// );

// // =================================================
// // CERTIFICATIONS (STUDENT)
// // =================================================
// router.post(
//   "/certification",
//   protect,
//   authorizeRoles("student"),
//   upload.array("certificateFiles"),
//   certificationController.createCertification
// );

// router.get(
//   "/certification",
//   protect,
//   authorizeRoles("student"),
//   certificationController.getCertifications
// );

// router.put(
//   "/certification/:id",
//   protect,
//   authorizeRoles("student"),
//   upload.single("file"),
//   certificationController.updateCertification
// );

// router.delete(
//   "/certification/:id",
//   protect,
//   authorizeRoles("student"),
//   certificationController.deleteCertification
// );

// // =================================================
// // DOCUMENTS (STUDENT)
// // =================================================
// router.post(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   uploadResume.single("resume"),
//   userDocumentController.uploadOrUpdateResume
// );

// router.post(
//   "/profile",
//   protect,
//   authorizeRoles("student"),
//   uploadProfile.single("avatar"),
//   userDocumentController.uploadOrUpdateProfile
// );

// router.get(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   userDocumentController.getUserDocument
// );

// // =================================================
// // AWARDS (STUDENT)
// // =================================================
// router.post(
//   "/awards",
//   protect,
//   authorizeRoles("student"),
//   awardController.createMultipleAwards
// );

// router.get(
//   "/awards",
//   protect,
//   authorizeRoles("student"),
//   awardController.getAwards
// );

// router.delete(
//   "/awards/:id",
//   protect,
//   authorizeRoles("student"),
//   awardController.deleteAward
// );

// // =================================================
// // PROJECTS (STUDENT)
// // =================================================
// router.post(
//   "/projects",
//   protect,
//   authorizeRoles("student"),
//   projectController.createMultipleProjects
// );

// router.get(
//   "/projects",
//   protect,
//   authorizeRoles("student"),
//   projectController.getProjects
// );

// router.delete(
//   "/projects/:id",
//   protect,
//   authorizeRoles("student"),
//   projectController.deleteProject
// );

// router.put(
//   "/projects/:id",
//   protect,
//   authorizeRoles("student"),
//   projectController.updateProject
// );

// // =================================================
// // ASSESSMENT (STUDENT)
// // =================================================
// router.post(
//   "/assessment/submit",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.submitAssessment
// );

// router.post(
//   "/assessment/saveAnswer",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.saveAnswer
// );

// router.post(
//   "/assessment/start",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.startAssessment
// );

// router.get(
//   "/assessment/getAttemptQuestions/:attemptId",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.getAttemptQuestions
// );

// router.get(
//   "/assessment/result/latest",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.getLatestResult
// );

// router.post(
//   "/assessment/:attemptId/violation",
//   protect,
//   authorizeRoles("student"),
//   assessmentController.reportViolation
// );

// // =================================================
// // USER PROFILE ROUTES (NEW)
// // =================================================
// // Profile routes
// router.get(
//   '/my-profile',
//   protect,
//   authorizeRoles("student"),
//   userController.getUserProfile
// );

// // Note: You already have demographics routes above using demographicsController
// // So don't duplicate them here with userController

// // Profile picture upload (using userController instead of userDocumentController)
// router.post(
//   '/profile-picture',
//   protect,
//   authorizeRoles("student"),
//   uploadProfile.single('profile'),
//   userController.uploadProfilePicture
// );

// // =================================================
// // EXPORT ROUTER
// // =================================================
// module.exports = router;
// const express = require("express");
// const { protect } = require("../middlewares/authMiddleware");
// const { authorizeRoles } = require("../middlewares/roleMiddleware");

// const upload = require("../middlewares/upload");
// const uploadExcel = require("../middlewares/uploadExcel");
// const uploadResume = require("../middlewares/uploadResume");
// const uploadProfile = require("../middlewares/uploadProfile");

// // ================= CONTROLLERS =================
// const certificationController = require("../controllers/certificationController");
// const domainController = require("../controllers/SkillIndex/domainController");
// const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
// const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
// const skillAssessmentController = require("../controllers/SkillIndex/skillAssessmentController");
// const assessmentController = require("../controllers/SkillIndex/assessmentController");
// const { getDashboardByUserId } = require("../controllers/dashboardController");
// const educationController = require("../controllers/educationController");
// const workExperienceController = require("../controllers/workExperienceController");
// const awardController = require("../controllers/awardController");
// const projectController = require("../controllers/projectController");
// const demographicsController = require("../controllers/demographicsController");
// const userDocumentController = require("../controllers/userDocumentController");
// const universityController = require("../controllers/universityController");

// // Import userController functions
// const userController = require('../controllers/userController');

// const router = express.Router();

// // =================================================
// // LOGGING MIDDLEWARE
// // =================================================
// router.use((req, res, next) => {
//   console.log(`📌 [ROUTE] ${req.method} ${req.originalUrl}`);
//   next();
// });

// // =================================================
// // USER PROFILE ROUTES (COMPLETE)
// // =================================================

// /**
//  * Get complete user profile with all sections
//  * GET /api/user/my-profile
//  */
// router.get(
//   '/my-profile',
//   protect,
//   authorizeRoles("student"),
//   userController.getUserProfile
// );

// // Update demographics
// router.post(
//   '/demographics',
//   protect,
//   authorizeRoles("student"),
//   userController.updateDemographics
// );

// // Upload profile picture
// router.post(
//   '/profile-picture',
//   protect,
//   authorizeRoles("student"),
//   uploadProfile.single('profile'),
//   userController.uploadProfilePicture
// );

// // Upload resume
// router.post(
//   '/resume',
//   protect,
//   authorizeRoles("student"),
//   uploadResume.single('resume'),
//   userController.uploadResume
// );

// // =================================================
// // EDUCATION ROUTES
// // =================================================

// router.get(
//   '/education',
//   protect,
//   authorizeRoles("student"),
//   userController.getEducation
// );

// router.post(
//   '/education',
//   protect,
//   authorizeRoles("student"),
//   userController.createEducation
// );

// router.put(
//   '/education/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.updateEducation
// );

// router.delete(
//   '/education/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.deleteEducation
// );

// // =================================================
// // WORK EXPERIENCE ROUTES
// // =================================================

// router.get(
//   '/experience',
//   protect,
//   authorizeRoles("student"),
//   userController.getWorkExperiences
// );

// router.post(
//   '/experience',
//   protect,
//   authorizeRoles("student"),
//   userController.createWorkExperience
// );

// router.put(
//   '/experience/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.updateWorkExperience
// );

// router.delete(
//   '/experience/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.deleteWorkExperience
// );

// // =================================================
// // CERTIFICATION ROUTES
// // =================================================

// router.get(
//   '/certifications',
//   protect,
//   authorizeRoles("student"),
//   userController.getCertifications
// );

// router.post(
//   '/certifications',
//   protect,
//   authorizeRoles("student"),
//   userController.createCertification
// );

// router.put(
//   '/certifications/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.updateCertification
// );

// router.delete(
//   '/certifications/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.deleteCertification
// );

// // =================================================
// // AWARD ROUTES
// // =================================================

// router.get(
//   '/awards',
//   protect,
//   authorizeRoles("student"),
//   userController.getAwards
// );

// router.post(
//   '/awards',
//   protect,
//   authorizeRoles("student"),
//   userController.createAward
// );

// router.put(
//   '/awards/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.updateAward
// );

// router.delete(
//   '/awards/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.deleteAward
// );

// // =================================================
// // PROJECT ROUTES
// // =================================================

// router.get(
//   '/projects',
//   protect,
//   authorizeRoles("student"),
//   userController.getProjects
// );

// router.post(
//   '/projects',
//   protect,
//   authorizeRoles("student"),
//   userController.createProject
// );

// router.put(
//   '/projects/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.updateProject
// );

// router.delete(
//   '/projects/:id',
//   protect,
//   authorizeRoles("student"),
//   userController.deleteProject
// );

// // =================================================
// // DASHBOARD (STUDENT)
// // =================================================

// /**
//  * Get user dashboard
//  * GET /api/user/dashboard
//  */
// router.get(
//   "/dashboard",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching user dashboard');
//     next();
//   },
//   getDashboardByUserId
// );

// /**
//  * Get experience index
//  * GET /api/user/experience_index
//  */
// router.get(
//   "/experience_index",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching experience index');
//     next();
//   },
//   getDashboardByUserId
// );

// // =================================================
// // MCQ IMPORT (ADMIN)
// // =================================================

// /**
//  * Import MCQs from Excel file
//  * POST /api/user/importMcqFromExcel
//  */
// router.post(
//   "/importMcqFromExcel",
//   protect,
//   authorizeRoles("admin"),
//   uploadExcel.single("file"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Importing MCQs from Excel');
//     console.log('📦 File:', req.file ? req.file.filename : 'No file uploaded');
//     next();
//   },
//   mcqImportController.importMcqFromExcel
// );

// // =================================================
// // SKILL INDEX - DOMAIN (ADMIN + STUDENT)
// // =================================================

// /**
//  * Create domain (Admin only)
//  * POST /api/user/domain
//  */
// router.post(
//   "/domain",
//   protect,
//   authorizeRoles("admin"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Creating new domain');
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   domainController.createDomain
// );

// /**
//  * Get subdomains by domain ID
//  * GET /api/user/by-domain/:domainId
//  */
// router.get(
//   "/by-domain/:domainId",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching subdomains for domain ID: ${req.params.domainId}`);
//     next();
//   },
//   domainController.getSubDomainsByDomain
// );

// /**
//  * Get all domains
//  * GET /api/user/domain
//  */
// router.get(
//   "/domain",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching all domains');
//     next();
//   },
//   domainController.getAllDomains
// );

// /**
//  * Get domain by ID
//  * GET /api/user/domain/:id
//  */
// router.get(
//   "/domain/:id",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching domain ID: ${req.params.id}`);
//     next();
//   },
//   domainController.getDomainById
// );

// /**
//  * Update domain (Admin only)
//  * PUT /api/user/domain/:id
//  */
// router.put(
//   "/domain/:id",
//   protect,
//   authorizeRoles("admin"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Updating domain ID: ${req.params.id}`);
//     console.log('📦 Update data:', req.body);
//     next();
//   },
//   domainController.updateDomain
// );

// /**
//  * Delete domain (Admin only)
//  * DELETE /api/user/domain/:id
//  */
// router.delete(
//   "/domain/:id",
//   protect,
//   authorizeRoles("admin"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Deleting domain ID: ${req.params.id}`);
//     next();
//   },
//   domainController.deleteDomain
// );

// // =================================================
// // USER DOMAIN SKILL (STUDENT)
// // =================================================

// /**
//  * Update user domain skills
//  * POST /api/user/updateUserDomainSkills
//  */
// router.post(
//   "/updateUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Updating user domain skills');
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   userDomainSkillController.updateUserDomainSkills
// );

// /**
//  * Add user domain subdomain
//  * POST /api/user/addUserDomainSubDomain
//  */
// router.post(
//   "/addUserDomainSubDomain",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Adding user domain subdomain');
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   userDomainSkillController.addUserDomainSubDomain
// );

// /**
//  * Get user domain skills
//  * GET /api/user/getUserDomainSkills
//  */
// router.get(
//   "/getUserDomainSkills",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching user domain skills');
//     next();
//   },
//   userDomainSkillController.getUserDomainSkills
// );

// // =================================================
// // VIEW USERS BY DOMAIN (RECRUITER + ADMIN)
// // =================================================

// /**
//  * Get users by domain
//  * GET /api/user/userDomainSkill/domain/:domainId
//  */
// router.get(
//   "/userDomainSkill/domain/:domainId",
//   protect,
//   authorizeRoles("recruiter", "admin", "student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching users for domain ID: ${req.params.domainId}`);
//     next();
//   },
//   userDomainSkillController.getUsersByDomain
// );

// /**
//  * Delete user domain skill
//  * DELETE /api/user/userDomainSkill/:id
//  */
// router.delete(
//   "/userDomainSkill/:id",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Deleting user domain skill ID: ${req.params.id}`);
//     next();
//   },
//   userDomainSkillController.deleteUserDomainSkill
// );

// // =================================================
// // UNIVERSITIES (PUBLIC)
// // =================================================

// /**
//  * Search universities
//  * GET /api/user/universities
//  */
// router.get(
//   "/universities",
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Searching universities');
//     console.log('📦 Query:', req.query);
//     next();
//   },
//   universityController.searchUniversities
// );

// // =================================================
// // DEMOGRAPHICS (STUDENT) - Using demographicsController
// // =================================================

// /**
//  * Get demographics by user
//  * GET /api/user/demographics
//  */
// router.get(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching demographics');
//     next();
//   },
//   demographicsController.getDemographicsByUser
// );

// /**
//  * Delete demographics
//  * DELETE /api/user/demographics
//  */
// router.delete(
//   "/demographics",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Deleting demographics');
//     next();
//   },
//   demographicsController.deleteDemographics
// );

// // =================================================
// // EDUCATION (STUDENT) - Using educationController
// // =================================================

// /**
//  * Get education by ID
//  * GET /api/user/education/:id
//  */
// router.get(
//   "/education/:id",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching education ID: ${req.params.id}`);
//     next();
//   },
//   educationController.getEducationById
// );

// // =================================================
// // WORK EXPERIENCE (STUDENT) - Using workExperienceController
// // =================================================

// /**
//  * Get work experience by ID
//  * GET /api/user/work/:id
//  */
// router.get(
//   "/work/:id",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching work experience ID: ${req.params.id}`);
//     next();
//   },
//   workExperienceController.getWorkExperienceById
// );

// // =================================================
// // CERTIFICATIONS (STUDENT) - Using certificationController
// // =================================================

// /**
//  * Update certification with file upload
//  * PUT /api/user/certification/:id
//  */
// router.put(
//   "/certification/:id",
//   protect,
//   authorizeRoles("student"),
//   upload.single("file"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Updating certification ID: ${req.params.id} with file`);
//     console.log('📦 File:', req.file ? req.file.filename : 'No file uploaded');
//     next();
//   },
//   certificationController.updateCertification
// );

// // =================================================
// // DOCUMENTS (STUDENT)
// // =================================================

// /**
//  * Upload or update resume
//  * POST /api/user/resume
//  */
// router.post(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   uploadResume.single("resume"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Uploading resume');
//     console.log('📦 File:', req.file ? req.file.filename : 'No file uploaded');
//     next();
//   },
//   userDocumentController.uploadOrUpdateResume
// );

// /**
//  * Upload or update profile picture
//  * POST /api/user/profile
//  */
// router.post(
//   "/profile",
//   protect,
//   authorizeRoles("student"),
//   uploadProfile.single("avatar"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Uploading profile picture');
//     console.log('📦 File:', req.file ? req.file.filename : 'No file uploaded');
//     next();
//   },
//   userDocumentController.uploadOrUpdateProfile
// );

// /**
//  * Get user document
//  * GET /api/user/resume
//  */
// router.get(
//   "/resume",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching user document');
//     next();
//   },
//   userDocumentController.getUserDocument
// );

// // =================================================
// // ASSESSMENT (STUDENT)
// // =================================================

// /**
//  * Submit assessment
//  * POST /api/user/assessment/submit
//  */
// router.post(
//   "/assessment/submit",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Submitting assessment');
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   assessmentController.submitAssessment
// );

// /**
//  * Save answer during assessment
//  * POST /api/user/assessment/saveAnswer
//  */
// router.post(
//   "/assessment/saveAnswer",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Saving assessment answer');
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   assessmentController.saveAnswer
// );

// /**
//  * Start assessment
//  * POST /api/user/assessment/start
//  */
// router.post(
//   "/assessment/start",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Starting assessment');
//     next();
//   },
//   assessmentController.startAssessment
// );

// /**
//  * Get attempt questions
//  * GET /api/user/assessment/getAttemptQuestions/:attemptId
//  */
// router.get(
//   "/assessment/getAttemptQuestions/:attemptId",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Fetching attempt questions for attempt ID: ${req.params.attemptId}`);
//     next();
//   },
//   assessmentController.getAttemptQuestions
// );

// /**
//  * Get latest assessment result
//  * GET /api/user/assessment/result/latest
//  */
// router.get(
//   "/assessment/result/latest",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log('📋 [ROUTE] Fetching latest assessment result');
//     next();
//   },
//   assessmentController.getLatestResult
// );

// /**
//  * Report violation during assessment
//  * POST /api/user/assessment/:attemptId/violation
//  */
// router.post(
//   "/assessment/:attemptId/violation",
//   protect,
//   authorizeRoles("student"),
//   (req, res, next) => {
//     console.log(`📋 [ROUTE] Reporting violation for attempt ID: ${req.params.attemptId}`);
//     console.log('📦 Body:', req.body);
//     next();
//   },
//   assessmentController.reportViolation
// );

// // =================================================
// // 404 HANDLER FOR UNDEFINED ROUTES
// // =================================================
// // router.use('*', (req, res) => {
// //   console.log(`❌ [ROUTE] Route not found: ${req.method} ${req.originalUrl}`);
// //   res.status(404).json({
// //     success: false,
// //     message: 'Route not found'
// //   });
// // });

// // =================================================
// // EXPORT ROUTER
// // =================================================
// console.log('✅ [ROUTES] User routes loaded successfully');
// module.exports = router;

const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const upload = require("../middlewares/upload");
const uploadExcel = require("../middlewares/uploadExcel");
const resumeUpload = require("../middlewares/uploadResume");
const uploadProfile = require("../middlewares/uploadProfile");

// ================= CONTROLLERS =================
const certificationController = require("../controllers/certificationController");
const domainController = require("../controllers/SkillIndex/domainController");
const userDomainSkillController = require("../controllers/SkillIndex/userDomainSkillController");
const mcqImportController = require("../controllers/SkillIndex/mcqImportController");
const assessmentController = require("../controllers/SkillIndex/assessmentController");
const { getDashboardByUserId } = require("../controllers/dashboardController");
const educationController = require("../controllers/educationController");
const workExperienceController = require("../controllers/workExperienceController");
const awardController = require("../controllers/awardController");
const projectController = require("../controllers/projectController");
const demographicsController = require("../controllers/demographicsController");
const userDocumentController = require("../controllers/userDocumentController");
const universityController = require("../controllers/universityController");
const { getUserProfiles,
  updateDemographics,
  uploadProfilePicture,
  uploadResume,
  getEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  getWorkExperiences,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  getAwards,
  createAward,
  updateAward,
  deleteAward,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} = require("./../controllers/userController");
// Import userController functions - ONLY THIS ONE LINE
// const userController = require('../controllers/userController');


const router = express.Router();

// =================================================
// LOGGING MIDDLEWARE
// =================================================
router.use((req, res, next) => {
  console.log(`📌 [ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

// =================================================
// USER PROFILE ROUTES
// =================================================


router.get(
  '/my-profile',
  protect,
  authorizeRoles("student"),
  getUserProfiles
  // ✅ Fixed: use userController.getUserProfile
);

// Update demographics
router.post(
  '/demographics',
  protect,
  authorizeRoles("student"),
  updateDemographics
);

// Upload profile picture
router.post(
  '/profile-picture',
  protect,
  authorizeRoles("student"),
  uploadProfile.single('profile'),
  uploadProfilePicture
);

// Upload resume
router.post(
  '/resume',
  protect,
  authorizeRoles("student"),
  resumeUpload.single('resume'),
  uploadResume
);

// =================================================
// EDUCATION ROUTES
// =================================================

router.get(
  '/education',
  protect,
  authorizeRoles("student"),
  getEducation
);

router.post(
  '/education',
  protect,
  authorizeRoles("student"),
  createEducation
);

router.put(
  '/education/:id',
  protect,
  authorizeRoles("student"),
  updateEducation
);

router.delete(
  '/education/:id',
  protect,
  authorizeRoles("student"),
  deleteEducation
);

// =================================================
// WORK EXPERIENCE ROUTES
// =================================================

router.get(
  '/work',
  protect,
  authorizeRoles("student"),
  getWorkExperiences
);

router.post(
  '/experience',
  protect,
  authorizeRoles("student"),
  createWorkExperience
);

router.put(
  '/work/:id',
  protect,
  authorizeRoles("student"),
  updateWorkExperience
);

router.delete(
  '/work/:id',
  protect,
  authorizeRoles("student"),
  deleteWorkExperience
);

// =================================================
// CERTIFICATION ROUTES
// =================================================

router.get(
  '/certification',
  protect,
  authorizeRoles("student"),
  getCertifications
);

router.post(
  '/certification',
  protect,
  authorizeRoles("student"),
  createCertification
);

router.put(
  '/certification/:id',
  protect,
  authorizeRoles("student"),
  updateCertification
);

router.delete(
  '/certification/:id',
  protect,
  authorizeRoles("student"),
  deleteCertification
);

// =================================================
// AWARD ROUTES
// =================================================

router.get(
  '/awards',
  protect,
  authorizeRoles("student"),
  getAwards
);

router.post(
  '/awards',
  protect,
  authorizeRoles("student"),
  createAward
);

router.put(
  '/awards/:id',
  protect,
  authorizeRoles("student"),
  updateAward
);

router.delete(
  '/awards/:id',
  protect,
  authorizeRoles("student"),
  deleteAward
);

// =================================================
// PROJECT ROUTES
// =================================================

router.get(
  '/projects',
  protect,
  authorizeRoles("student"),
  getProjects
);

router.post(
  '/projects',
  protect,
  authorizeRoles("student"),
  createProject
);

router.put(
  '/projects/:id',
  protect,
  authorizeRoles("student"),
  updateProject
);

router.delete(
  '/projects/:id',
  protect,
  authorizeRoles("student"),
  deleteProject
);

// =================================================
// DASHBOARD ROUTES
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
// SKILL INDEX - DOMAIN ROUTES
// =================================================

router.post(
  "/domain",
  protect,
  authorizeRoles("admin"),
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
  authorizeRoles("admin"),
  domainController.updateDomain
);

router.delete(
  "/domain/:id",
  protect,
  authorizeRoles("admin"),
  domainController.deleteDomain
);

// =================================================
// USER DOMAIN SKILL ROUTES
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
// VIEW USERS BY DOMAIN
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
// UNIVERSITIES (PUBLIC)
// =================================================

router.get(
  "/universities",
  universityController.searchUniversities
);

// =================================================
// SINGLE ITEM ROUTES (Using specific controllers)
// =================================================

router.get(
  "/demographics",
  protect,
  authorizeRoles("student"),
  demographicsController.getDemographicsByUser
);

router.delete(
  "/demographics",
  protect,
  authorizeRoles("student"),
  demographicsController.deleteDemographics
);

router.get(
  "/education/:id",
  protect,
  authorizeRoles("student"),
  educationController.getEducationById
);

router.get(
  "/work/:id",
  protect,
  authorizeRoles("student"),
  workExperienceController.getWorkExperienceById
);

router.put(
  "/certification/:id",
  protect,
  authorizeRoles("student"),
  upload.single("file"),
  certificationController.updateCertification
);

// =================================================
// DOCUMENT ROUTES
// =================================================

router.get(
  "/document",
  protect,
  authorizeRoles("student"),
  userDocumentController.getUserDocument
);

// =================================================
// ASSESSMENT ROUTES
// =================================================

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


router.post("/assessment/violation/:attemptId", protect, authorizeRoles("student"), assessmentController.reportViolation);
// router.get("/assessment/:attemptId/integrity",protect,  authorizeRoles("student"),  assessmentController.getIntegrity);

// Assessment (STUDENT)
// =================================================
// router.post("/schedule", protect, authorizeRoles("student"), skillAssessmentController.scheduleAssessment);
// router.get("/:id/start", protect, authorizeRoles("student"), skillAssessmentController.startAssessment);
// router.post("/:id/submit", protect, authorizeRoles("student"), skillAssessmentController.submitAssessment);



// =================================================
// MY PROFILE (STUDENT)
// =================================================

router.get(
  "/my-profile",
  protect,
  authorizeRoles("student"),
  assessmentController.reportViolation
);

// =================================================
// EXPORT ROUTER
// =================================================
console.log('✅ [ROUTES] User routes loaded successfully');
module.exports = router;