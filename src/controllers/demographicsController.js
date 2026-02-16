// controllers/demographicsController.js
const Demographics = require("../models/demographicsModel");
const UserScore = require("../models/userScoreModel");
const { calculateNavigation, getCompletionStatus } = require("./authController");

// ============================================
// SAVE/UPDATE DEMOGRAPHICS
// ============================================
exports.saveDemographics = async (req, res) => {
  try {
    // ✅ Support both header and req.user (from auth middleware)
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing in header",
      });
    }

    const {
      email,
      phoneNumber,
      fullName,
      city,
      state,
      country,
      phoneVisibleToRecruiters,
    } = req.body;

    // Validation
    if (!fullName || !email || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // 🔒 Manual uniqueness check (for clean error messages)
    if (email) {
      const emailExists = await Demographics.findOne({
        email,
        userId: { $ne: userId },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (phoneNumber) {
      const phoneExists = await Demographics.findOne({
        phoneNumber,
        userId: { $ne: userId },
      });

      if (phoneExists) {
        return res.status(409).json({
          success: false,
          message: "Phone number already in use",
        });
      }
    }

    // ✅ CREATE OR UPDATE Demographics
    const demographics = await Demographics.findOneAndUpdate(
      { userId },
      {
        fullName,
        email,
        phoneNumber,
        city,
        state,
        country,
        phoneVisibleToRecruiters: phoneVisibleToRecruiters ?? false,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // ✅ UPDATE UserScore location
    await UserScore.findOneAndUpdate(
      { userId },
      {
        city,
        state,
        country,
      },
      {
        upsert: true,
        new: true,
      }
    );

    // ✅ GET UPDATED NAVIGATION STATUS
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    // ✅ RETURN DATA + NAVIGATION
    res.status(200).json({
      success: true,
      message: "Demographics saved successfully",
      data: demographics,
      navigation, // ← CRITICAL: Frontend expects this
    });
  } catch (err) {
    console.error("❌ Save demographics error:", err);

    // 🧠 Mongo duplicate key fallback
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Failed to save demographics",
    });
  }
};

// ============================================
// GET DEMOGRAPHICS
// ============================================
exports.getDemographicsByUser = async (req, res) => {
  try {
    // Get userId from header or auth middleware
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required in headers",
      });
    }

    const demographics = await Demographics.findOne({ userId });

    // ✅ Return null if not found (not an error for first-time users)
    return res.status(200).json({
      success: true,
      data: demographics || null,
    });
  } catch (err) {
    console.error("❌ Get demographics error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch demographics",
    });
  }
};

// ============================================
// DELETE DEMOGRAPHICS
// ============================================
exports.deleteDemographics = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    await Demographics.findOneAndDelete({ userId });

    // ✅ GET UPDATED NAVIGATION (user lost this step)
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    res.status(200).json({
      success: true,
      message: "Demographics deleted successfully",
      navigation, // ← Frontend can update Redux
    });
  } catch (err) {
    console.error("❌ Delete demographics error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete demographics",
    });
  }
};