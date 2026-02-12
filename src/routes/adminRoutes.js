const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const adminController = require("../controllers/Admin/adminController");
const adminAuthController = require("../controllers/Admin/adminAuthController");

// =================================================
// 🔐 ADMIN DASHBOARD
// =================================================
router.get(
  "/dashboard",
  protect,
  authorizeRoles("admin"),
  adminController.getAdminDashboard
);

// =================================================
// 👥 USER MANAGEMENT
// =================================================
router.get(
  "/users",
  protect,
  authorizeRoles("admin"),
  adminController.getAllUsers
);

router.get(
  "/users/:id",
  protect,
  authorizeRoles("admin"),
  adminController.getUserById
);

router.put(
  "/users/:id/role",
  protect,
  authorizeRoles("admin"),
  adminController.updateUserRole
);

router.delete(
  "/users/:id",
  protect,
  authorizeRoles("admin"),
  adminController.deleteUser
);

// =================================================
// 📊 ADMIN ANALYTICS
// =================================================
router.get(
  "/stats",
  protect,
  authorizeRoles("admin"),
  adminController.getPlatformStats
);

// Ranking
router.get(
  "/user-score/ranks",
  protect, 
  authorizeRoles("admin"), 
  adminController.getUserScoreByUserId
);

// admin auth route
router.post("/signup", adminAuthController.adminSignup);

//get student count
router.get("/student-count", 
  protect, 
  authorizeRoles("admin"),
  adminController.getStudentCount
)

//get recuriter count
router.get("/recruiter-count", 
  protect, 
  authorizeRoles("admin"),
  adminController.getRecruiterCount
)

// total user count
router.get("/user-count", 
  protect,
  authorizeRoles("admin"),
  adminController.totalUser
)

router.get("/:userId/assessment-data", 
  protect,
  authorizeRoles("admin"),
  adminController.getUserAssessmentData
)

router.get(
  "/analytics/avg-case-studies-per-user",
  protect,
  authorizeRoles("admin"),
  adminController.getAvgCaseStudiesPerUser
);

router.get(
  "/analytics/avg-case-studies-completed-per-user",
  protect,
  authorizeRoles("admin"),
  adminController.getAvgCaseStudiesCompletedPerUser
);

router.get(
  "/analytics/case-completion-rate",
  protect,
  authorizeRoles("admin"),
  adminController.getCaseCompletionRate
);

router.get(
  "/analytics/avg-time-per-case",
  protect,
  authorizeRoles("admin"),
  adminController.getAvgTimeSpentPerCase
);

router.get(
  "/analytics/case-dropoff/:caseId",
  protect,
  authorizeRoles("admin"),
  adminController.getCaseDropOffPoints
);

router.get(
  "/analytics/total-paying-users",
  protect,
  authorizeRoles("admin"),
  adminController.getTotalPayingUsers
);

router.get(
  "/analytics/daily-active-users",
  protect,
  authorizeRoles("admin"),
  adminController.getDailyActiveUsers
);

router.get(
  "/analytics/monthly-active-users",
  protect,
  authorizeRoles("admin"),
  adminController.getMonthlyActiveUsers
);

router.get(
  "/analytics/new-users-today",
  protect,
  authorizeRoles("admin"),
  adminController.getNewUsersToday
);

router.get(
  "/analytics/conversion-funnel",
  protect,
  authorizeRoles("admin"),
  adminController.getConversionFunnel
);

// =================================================
// 📍 LOCATION-BASED FILTERS (NEW)
// =================================================
router.get(
  "/analytics/countries",
  protect,
  authorizeRoles("admin"),
  adminController.getAllCountries
);

router.get(
  "/analytics/states",
  protect,
  authorizeRoles("admin"),
  adminController.getStatesByCountry
);

router.get(
  "/analytics/users-by-location",
  protect,
  authorizeRoles("admin"),
  adminController.getUsersByLocation
);


module.exports = router;
