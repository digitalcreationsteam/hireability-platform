const Education = require("../models/educationModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
const UserScore = require("../models/userScoreModel");
/* ==================================================
   SINGLE EDUCATION SCORE CALCULATION
================================================== */
const calculateSingleEducationScore = (edu) => {
  const degree = (edu.degree || "").toLowerCase();
  const duration = Number(edu.duration) || 0;

  // Diploma / Associate
  if (degree.includes("diploma") || degree.includes("associate")) {
    return 120;
  }

  // Bachelor
  if (
    degree.includes("bachelor") ||
    degree.includes("b.tech") ||
    degree.includes("bsc")
  ) {
    if (duration === 4) return 240;
    if (duration === 3) return 180;
  }

  // Master
  if (
    degree.includes("master") ||
    degree.includes("m.tech") ||
    degree.includes("msc") ||
    degree.includes("mca")
  ) {
    if (duration === 2) return 120;
    if (duration === 1) return 60;
  }

  // PhD
  if (degree.includes("phd") || degree.includes("doctorate")) {
    return duration * 60;
  }

  return 0;
};

/* ==================================================
   TOTAL EDUCATION SCORE (USER LEVEL)
================================================== */
const calculateEducationPoints = (educationList) => {
  return educationList.reduce((sum, edu) => {
    return sum + (edu.educationScore || 0);
  }, 0);
};

/* ==================================================
   UPDATE USER EDUCATION SCORE
================================================== */
const updateUserEducationScore = async (userId) => {
  const educations = await Education.find({ userId });

  const educationScore = calculateEducationPoints(educations);

  await User.findByIdAndUpdate(userId, {
    "experienceIndex.educationScore": educationScore,
  });

  // Recalculate overall user score
  await recalculateUserScore(userId);

  return educationScore;
};

/* ==================================================
   CREATE EDUCATION(S)
================================================== */
exports.createEducation = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const { educations } = req.body;

    if (!Array.isArray(educations) || educations.length === 0) {
      return res.status(400).json({
        message: "Educations must be a non-empty array",
      });
    }

    // Attach userId + calculate score
    const educationDocs = educations.map((edu) => ({
      ...edu,
      userId,
      educationScore: calculateSingleEducationScore(edu),
    }));

    const savedEducations = await Education.insertMany(educationDocs);

    // ✅ Get latest school name (first added education)
    const latestSchoolName = savedEducations[0]?.schoolName || null;

    // ✅ Update only schoolName in UserScore
    await UserScore.findOneAndUpdate(
      { userId },
      {
        $set: { university: latestSchoolName }
      },
      {
        upsert: true,
        new: true,
      }
    );

    const totalScore = await updateUserEducationScore(userId);
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(201).json({
      message: "Educations added successfully",
      educationScore: totalScore,
      data: savedEducations,
      navigation,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating educations",
      error: error.message,
    });
  }
};


/* ==================================================
   GET ALL EDUCATIONS
================================================== */
exports.getEducations = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const educations = await Education.find({ userId }).sort({
      startYear: -1,
    });

    return res.status(200).json({
      message: "Educations fetched successfully",
      data: educations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching educations",
      error: error.message,
    });
  }
};

/* ==================================================
   GET SINGLE EDUCATION
================================================== */
exports.getEducationById = async (req, res) => {
  try {
    const education = await Education.findById(req.params.id);

    if (!education) {
      return res.status(404).json({ message: "Education not found" });
    }

    return res.status(200).json({
      message: "Education fetched successfully",
      data: education,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching education",
      error: error.message,
    });
  }
};

/* ==================================================
   UPDATE EDUCATION
================================================== */
exports.updateEducation = async (req, res) => {
  try {
    const existingEducation = await Education.findById(req.params.id);
    if (!existingEducation) {
      return res.status(404).json({ message: "Education not found" });
    }

    // Recalculate score after update
    const updatedData = {
      ...req.body,
      educationScore: calculateSingleEducationScore({
        ...existingEducation.toObject(),
        ...req.body,
      }),
    };

    const updatedEducation = await Education.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    const totalScore = await updateUserEducationScore(
      updatedEducation.userId
    );

    return res.status(200).json({
      message: "Education updated successfully",
      educationScore: totalScore,
      data: updatedEducation,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating education",
      error: error.message,
    });
  }
};

/* ==================================================
   DELETE EDUCATION
================================================== */
exports.deleteEducation = async (req, res) => {
  try {
    const education = await Education.findByIdAndDelete(req.params.id);

    if (!education) {
      return res.status(404).json({ message: "Education not found" });
    }

    const totalScore = await updateUserEducationScore(education.userId);

    return res.status(200).json({
      message: "Education deleted successfully",
      educationScore: totalScore,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting education",
      error: error.message,
    });
  }
};

exports.getStudentsBySchool = async (req, res) => {
  try {
    const { schoolName } = req.query;

    if (!schoolName) {
      return res.status(400).json({
        success: false,
        message: "School name is required",
      });
    }

    // Find education records matching school name (case-insensitive)
    const students = await Education.find({
      schoolName: { $regex: schoolName, $options: "i" },
    })
      .populate("userId", "firstname lastname email avatar")
      .sort({ educationScore: -1 })  // populate user details
      .lean();

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("❌ GET STUDENTS BY SCHOOL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
