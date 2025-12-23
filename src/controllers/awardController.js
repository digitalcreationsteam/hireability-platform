const Award = require("../models/awardModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
/* --------------------------------------------------
   SCORING LOGIC
-------------------------------------------------- */
const calculateAwardPoints = (awardList) => {
  let total = 0;
  for (const award of awardList) {
    total += award.awardScore || 50;
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
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const { awards } = req.body;

    if (!Array.isArray(awards) || awards.length === 0) {
      return res.status(400).json({
        message: "awards must be a non-empty array"
      });
    }

    const awardDocs = awards.map(a => ({
      userId,
      awardName: a.awardName,
      description: a.description,
      year: a.year,
      awardScore: 50
    }));

    const insertedAwards = await Award.insertMany(awardDocs);

    const score = await updateUserAwardScore(userId);

    return res.status(201).json({
      message: "Awards added successfully",
      totalAdded: insertedAwards.length,
      awardScore: score,
      data: insertedAwards
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating awards",
      error: error.message
    });
  }
};


exports.getAwards = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const awards = await Award.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Awards fetched successfully",
      data: awards
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching awards",
      error: error.message
    });
  }
};


exports.getAwardById = async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    return res.status(200).json({
      message: "Award fetched",
      data: award
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching award",
      error: error.message
    });
  }
};


exports.updateAward = async (req, res) => {
  try {
    const award = await Award.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    // recalc score
    const score = await updateUserAwardScore(award.userId);

    return res.status(200).json({
      message: "Award updated",
      awardScore: score,
      data: award
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating award",
      error: error.message
    });
  }
};


exports.deleteAward = async (req, res) => {
  try {
    const award = await Award.findByIdAndDelete(req.params.id);

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    // update score
    const score = await updateUserAwardScore(award.userId);

    return res.status(200).json({
      message: "Award deleted",
      awardScore: score
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error deleting award",
      error: error.message
    });
  }
};
