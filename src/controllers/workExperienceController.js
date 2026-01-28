const WorkExperience = require("../models/workModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");

/* --------------------------------------------------
   SCORE CALCULATION (SINGLE EXPERIENCE)
-------------------------------------------------- */
// const calculateSingleWorkScore = (exp) => {
//   let score = 0;
//   const years = exp.duration || 0;

//   score += years * 60;

//   if (years >= 10) score += 200;
//   else if (years >= 5) score += 100;

//   return score;
// };
/* --------------------------------------------------
   SCORE CALCULATION (SINGLE EXPERIENCE)
-------------------------------------------------- */
// const calculateSingleWorkScore = (exp) => {
//   let score = 0;

//   const months = exp.duration || 0; // duration in months
//   const roleType = (exp.typeOfRole || "").toLowerCase();

  // const pointsPerMonthMap = {
  //   internship: 5,
  //   contract: 5,
  //   freelance: 3,
  //   part_time: 4,
  //   "part-time": 4,
  //   full_time: 10,
  //   "full-time": 10,
  //   entrepreneurship: 5,
  // };

//   const pointsPerMonth = pointsPerMonthMap[roleType] || 0;

//   score = months * pointsPerMonth;

//   return score;
// };

const calculateSingleWorkScore = (exp) => {
  let score = 0;

  const months = exp.duration || 0;

  const years = months / 12;

  const roleType = (exp.typeOfRole || "").toLowerCase();

  // points PER YEAR
  const pointsPerYearMap = {
    internship: 60,      // 5 × 12
    contract: 60,
    freelance: 36,       // 3 × 12
    part_time: 48,       // 4 × 12
    "part-time": 48,
    full_time: 120,      // 10 × 12
    "full-time": 120,
    entrepreneurship: 60,
  };

  const pointsPerYear = pointsPerYearMap[roleType] || 0;

  score = Math.round(years * pointsPerYear);

  return score;
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
   UPDATE USER TOTAL WORK SCORE
-------------------------------------------------- */
const updateUserWorkScore = async (userId) => {
  const workList = await WorkExperience.find({ userId });

  const totalWorkScore = calculateTotalWorkScore(workList);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.workScore": totalWorkScore },
    { new: true }
  );

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

    return res.status(201).json({
      message: "Work experiences added successfully",
      totalAdded: insertedWork.length,
      totalWorkScore: totalScore,
      data: insertedWork,
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

    return res.status(200).json({
      message: "Work experiences fetched successfully",
      data: experiences,
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

    return res.status(200).json({
      message: "Work experience updated successfully",
      totalWorkScore: totalScore,
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

    return res.status(200).json({
      message: "Work experience deleted successfully",
      totalWorkScore: totalScore,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error deleting work experience",
      error: error.message,
    });
  }
};
