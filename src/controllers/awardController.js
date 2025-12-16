const Award = require("../models/awardModel");
const User = require("../models/userModel");

// --------------------------------------------------
// FUNCTION: AWARD SCORING LOGIC
// Each award = 50 points
// --------------------------------------------------
const calculateAwardPoints = (awardList) => {
  let total = 0;
  for (const award of awardList) {
    total += award.points || 50;
  }
  return total;
};

// --------------------------------------------------
// FUNCTION: UPDATE USER EXPERIENCE INDEX (AWARDS PART)
// --------------------------------------------------
const updateUserAwardScore = async (userId) => {
  const awards = await Award.find({ userId });

  const awardScore = calculateAwardPoints(awards);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.awardScore": awardScore },
    { new: true }
  );

  return awardScore;
};

exports.createAward = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const payload = {
      userId,
      awardName: req.body.awardName,
      description: req.body.description,
      year: req.body.year,
      points: 50
    };

    const award = await Award.create(payload);

    // update score
    const score = await updateUserAwardScore(userId);

    return res.status(201).json({
      message: "Award added successfully",
      awardScore: score,
      data: award
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating award",
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
