const WorkExperience = require("../models/workModel");
const User = require("../models/userModel");
const UserScore = require("../models/userScoreModel"); // Add this import
const { recalculateUserScore } = require("../services/recalculateUserScore");
const { calculateNavigation, getCompletionStatus } = require("./authController");

/* --------------------------------------------------
   SCORE CALCULATION (SINGLE EXPERIENCE)
-------------------------------------------------- */
const calculateSingleWorkScore = (exp) => {
  let score = 0;

  const months = exp.duration || 0; // duration in months
  const roleType = (exp.typeOfRole || "").toLowerCase();

  const pointsPerMonthMap = {
    internship: 5,
    contract: 5,
    freelance: 3,
    part_time: 4,
    "part-time": 4,
    full_time: 10,
    "full-time": 10,
    entrepreneurship: 5,
  };

  const pointsPerMonth = pointsPerMonthMap[roleType] || 0;
  score = months * pointsPerMonth;

  return score;
};

/* --------------------------------------------------
   CALCULATE YEARS OF EXPERIENCE FROM WORK HISTORY
-------------------------------------------------- */
const calculateYearsOfExperience = (workList) => {
  if (!workList || workList.length === 0) return 0;

  let totalMonths = 0;
  const currentDate = new Date();

  workList.forEach(job => {
    if (job.startYear) {
      // Parse start date (assuming startYear is the year only)
      const startDate = new Date(job.startYear, 0); // January of start year

      // Parse end date or use current date if currently working
      let endDate;
      if (job.currentlyWorking) {
        endDate = currentDate;
      } else if (job.endYear) {
        endDate = new Date(job.endYear, 11); // December of end year
      } else {
        endDate = startDate; // No end date, assume 0 duration
      }

      // Calculate months difference
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      totalMonths += Math.max(0, months);
    }
  });

  // Convert months to years and round to 1 decimal
  return Math.round((totalMonths / 12) * 10) / 10;
};

/* --------------------------------------------------
   GET COHORT FROM YEARS
-------------------------------------------------- */
const getCohortFromYears = (years) => {
  if (years < 1) return '0-1';
  if (years < 2) return '1-2';
  if (years < 3) return '2-3';
  if (years < 4) return '3-4';
  if (years < 5) return '4-5';
  return '5+';
};

/* --------------------------------------------------
   UPDATE USER YEARS OF EXPERIENCE IN USERSCORE
-------------------------------------------------- */
const updateUserYearsOfExperience = async (userId) => {
  try {
    // Get all work experiences for the user
    const workList = await WorkExperience.find({ userId });

    // Calculate years of experience
    const yearsOfExperience = calculateYearsOfExperience(workList);
    const experienceCohort = getCohortFromYears(yearsOfExperience);

    // Update or create UserScore document
    await UserScore.findOneAndUpdate(
      { userId },
      {
        yearsOfExperience,
        experienceCohort
      },
      { upsert: true, new: true }
    );

    console.log(`Updated years of experience for user ${userId}: ${yearsOfExperience} years (${experienceCohort} cohort)`);

    return { yearsOfExperience, experienceCohort };
  } catch (error) {
    console.error("Error updating years of experience:", error);
    throw error;
  }
};

/* --------------------------------------------------
   TOTAL WORK SCORE (FROM DB RECORDS)
-------------------------------------------------- */
const calculateTotalWorkScore = (workList) => {
  return workList.reduce((sum, exp) => {
    return sum + (exp.workScore || 0);
  }, 0);
};

/* --------------------------------------------------
   UPDATE USER TOTAL WORK SCORE AND YEARS OF EXPERIENCE
-------------------------------------------------- */
const updateUserWorkScore = async (userId) => {
  const workList = await WorkExperience.find({ userId });

  const totalWorkScore = calculateTotalWorkScore(workList);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.workScore": totalWorkScore },
    { new: true }
  );

  // ✅ Update years of experience in UserScore
  await updateUserYearsOfExperience(userId);

  // 🔥 Recalculate final combined score
  await recalculateUserScore(userId);

  return totalWorkScore;
};

/* --------------------------------------------------
   CREATE MULTIPLE WORK EXPERIENCES
-------------------------------------------------- */
exports.createMultipleWorkExperience = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const { workExperiences } = req.body;

    if (!Array.isArray(workExperiences) || workExperiences.length === 0) {
      return res.status(400).json({
        message: "workExperiences must be a non-empty array",
      });
    }

    // ✅ Attach userId + calculate workScore per experience
    const workDocs = workExperiences.map(exp => ({
      ...exp,
      userId,
      workScore: calculateSingleWorkScore(exp),
    }));

    const insertedWork = await WorkExperience.insertMany(workDocs);

    const totalScore = await updateUserWorkScore(userId);

    // Get the updated user score with years of experience
    const userScore = await UserScore.findOne({ userId });

    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(201).json({
      message: "Work experiences added successfully",
      totalAdded: insertedWork.length,
      totalWorkScore: totalScore,
      yearsOfExperience: userScore?.yearsOfExperience || 0,
      experienceCohort: userScore?.experienceCohort || '0-1',
      data: insertedWork,
      navigation,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating work experiences",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET ALL WORK EXPERIENCES
-------------------------------------------------- */
exports.getWorkExperiences = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const experiences = await WorkExperience.find({ userId })
      .sort({ startYear: -1 });

    // Also get years of experience from UserScore
    const userScore = await UserScore.findOne({ userId });

    return res.status(200).json({
      message: "Work experiences fetched successfully",
      data: experiences,
      yearsOfExperience: userScore?.yearsOfExperience || 0,
      experienceCohort: userScore?.experienceCohort || '0-1',
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching work experiences",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET SINGLE WORK EXPERIENCE
-------------------------------------------------- */
exports.getWorkExperienceById = async (req, res) => {
  try {
    const workExperience = await WorkExperience.findById(req.params.id);

    if (!workExperience) {
      return res.status(404).json({
        message: "Work experience not found",
      });
    }

    return res.status(200).json({
      message: "Work experience fetched successfully",
      data: workExperience
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching work experience",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   UPDATE WORK EXPERIENCE
-------------------------------------------------- */
exports.updateWorkExperience = async (req, res) => {
  try {
    // 🔁 Recalculate workScore if duration is updated
    if (req.body.duration !== undefined) {
      req.body.workScore = calculateSingleWorkScore(req.body);
    }

    const exp = await WorkExperience.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!exp) {
      return res.status(404).json({ message: "Work experience not found" });
    }

    const totalScore = await updateUserWorkScore(exp.userId);

    // Get updated user score
    const userScore = await UserScore.findOne({ userId: exp.userId });

    return res.status(200).json({
      message: "Work experience updated successfully",
      totalWorkScore: totalScore,
      yearsOfExperience: userScore?.yearsOfExperience || 0,
      experienceCohort: userScore?.experienceCohort || '0-1',
      data: exp,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating work experience",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   DELETE WORK EXPERIENCE
-------------------------------------------------- */
exports.deleteWorkExperience = async (req, res) => {
  try {
    const exp = await WorkExperience.findByIdAndDelete(req.params.id);

    if (!exp) {
      return res.status(404).json({ message: "Work experience not found" });
    }

    const totalScore = await updateUserWorkScore(exp.userId);

    // Get updated user score
    const userScore = await UserScore.findOne({ userId: exp.userId });

    return res.status(200).json({
      message: "Work experience deleted successfully",
      totalWorkScore: totalScore,
      yearsOfExperience: userScore?.yearsOfExperience || 0,
      experienceCohort: userScore?.experienceCohort || '0-1',
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error deleting work experience",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   BULK UPDATE WORK EXPERIENCES (for reordering)
-------------------------------------------------- */
exports.bulkUpdateWorkExperiences = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { experiences } = req.body;

    if (!Array.isArray(experiences)) {
      return res.status(400).json({ message: "Experiences must be an array" });
    }

    // Update each experience
    const updatePromises = experiences.map(exp =>
      WorkExperience.findByIdAndUpdate(
        exp._id,
        { $set: { order: exp.order } },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    // Recalculate total score and years of experience
    const totalScore = await updateUserWorkScore(userId);

    const userScore = await UserScore.findOne({ userId });

    return res.status(200).json({
      message: "Work experiences reordered successfully",
      totalWorkScore: totalScore,
      yearsOfExperience: userScore?.yearsOfExperience || 0,
      experienceCohort: userScore?.experienceCohort || '0-1',
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error reordering work experiences",
      error: error.message,
    });
  }
};