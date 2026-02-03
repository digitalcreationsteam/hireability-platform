const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const adminController = require("../controllers/Admin/adminController");

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

module.exports = router;
