// controllers/awardController.js
const Award = require("../models/awardModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
const { calculateNavigation, getCompletionStatus } = require("./authController");

/* --------------------------------------------------
   SCORING LOGIC
-------------------------------------------------- */
const calculateAwardPoints = (awardList) => {
  let total = 0;
  for (const award of awardList) {
    total += award.awardScore || 5;
  }
  return total;
};

const updateUserAwardScore = async (userId) => {
  const awards = await Award.find({ userId });
  const awardScore = calculateAwardPoints(awards);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.awardScore": awardScore },
    { new: true }
  );
  await recalculateUserScore(userId);
  return awardScore;
};

/* --------------------------------------------------
   MULTIPLE CREATE AWARDS
-------------------------------------------------- */
exports.createMultipleAwards = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing in header",
      });
    }

    // ✅ CHECK MAX LIMIT (5 awards)
    const existingCount = await Award.countDocuments({ userId });
    const incomingCount = Array.isArray(req.body.awards)
      ? req.body.awards.length
      : 1;
    
    if (existingCount + incomingCount > 5) {
      return res.status(400).json({
        success: false,
        message: "You can add a maximum of 5 awards only.",
      });
    }

    const { awards } = req.body;

    if (!Array.isArray(awards) || awards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "awards must be a non-empty array",
      });
    }

    const awardDocs = awards.map((a) => ({
      userId,
      awardName: a.awardName,
      description: a.description,
      year: a.year,
      awardScore: 5,
    }));

    const insertedAwards = await Award.insertMany(awardDocs);
    const score = await updateUserAwardScore(userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(201).json({
      success: true,
      message: "Awards added successfully",
      totalAdded: insertedAwards.length,
      awardScore: score,
      data: insertedAwards,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Create awards error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating awards",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET ALL AWARDS
-------------------------------------------------- */
exports.getAwards = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    const awards = await Award.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Awards fetched successfully",
      data: awards,
    });
  } catch (error) {
    console.error("❌ Get awards error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching awards",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET SINGLE AWARD BY ID
-------------------------------------------------- */
exports.getAwardById = async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);

    if (!award) {
      return res.status(404).json({
        success: false,
        message: "Award not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Award fetched",
      data: award,
    });
  } catch (error) {
    console.error("❌ Get award error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching award",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   UPDATE AWARD
-------------------------------------------------- */
exports.updateAward = async (req, res) => {
  try {
    const award = await Award.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!award) {
      return res.status(404).json({
        success: false,
        message: "Award not found",
      });
    }

    // Recalculate score
    const score = await updateUserAwardScore(award.userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(award.userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Award updated successfully",
      awardScore: score,
      data: award,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Update award error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating award",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   DELETE AWARD
-------------------------------------------------- */
exports.deleteAward = async (req, res) => {
  try {
    const award = await Award.findByIdAndDelete(req.params.id);

    if (!award) {
      return res.status(404).json({
        success: false,
        message: "Award not found",
      });
    }

    // Update score
    const score = await updateUserAwardScore(award.userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(award.userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Award deleted successfully",
      awardScore: score,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Delete award error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting award",
      error: error.message,
    });
  }
};