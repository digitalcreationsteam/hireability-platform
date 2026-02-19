const Education = require("../models/educationModel");
const User = require("../models/userModel");
const UserScore = require("../models/userScoreModel"); // ✅ IMPORT UserScore model
const { recalculateUserScore } = require("../services/recalculateUserScore");
const { calculateNavigation, getCompletionStatus } = require("./authController");

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
   UPDATE USER UNIVERSITY IN USERSCORE MODEL
================================================== */
const updateUserUniversityInUserScore = async (userId) => {
  try {
    console.log(`[updateUserUniversityInUserScore] Starting for user: ${userId}`);

    // Get the most recent education (or highest degree)
    const latestEducation = await Education.findOne({ userId })
      .sort({ endYear: -1, startYear: -1 })
      .lean();

    if (latestEducation && latestEducation.schoolName) {
      console.log(`[updateUserUniversityInUserScore] Found education with school: ${latestEducation.schoolName}`);

      // ✅ UPDATE USERSCORE MODEL (not User model)
      const updatedUserScore = await UserScore.findOneAndUpdate(
        { userId },
        {
          $set: {
            university: latestEducation.schoolName
          }
        },
        { new: true, upsert: true }
      );

      console.log(`[updateUserUniversityInUserScore] Updated UserScore university to: ${latestEducation.schoolName}`);
      console.log(`[updateUserUniversityInUserScore] UserScore after update:`, updatedUserScore);

      return latestEducation.schoolName;
    } else {
      console.log(`[updateUserUniversityInUserScore] No education found with schoolName for user: ${userId}`);

      // If no education, clear the university field
      await UserScore.findOneAndUpdate(
        { userId },
        {
          $unset: { university: 1 }
        }
      );

      return null;
    }
  } catch (error) {
    console.error(`[updateUserUniversityInUserScore] Error:`, error);
    throw error;
  }
};

/* ==================================================
   UPDATE USER EDUCATION SCORE
================================================== */
const updateUserEducationScore = async (userId) => {
  console.log(`[updateUserEducationScore] Starting for user: ${userId}`);

  const educations = await Education.find({ userId });
  console.log(`[updateUserEducationScore] Found ${educations.length} education records`);

  const educationScore = calculateEducationPoints(educations);
  console.log(`[updateUserEducationScore] Calculated educationScore: ${educationScore}`);

  // Update User model's experienceIndex
  await User.findByIdAndUpdate(userId, {
    "experienceIndex.educationScore": educationScore,
  });
  console.log(`[updateUserEducationScore] Updated User model`);

  // ✅ Update university in UserScore model (not User model)
  const university = await updateUserUniversityInUserScore(userId);
  console.log(`[updateUserEducationScore] Updated university in UserScore: ${university}`);

  // Recalculate overall user score (this will sync UserScore with all data)
  console.log(`[updateUserEducationScore] Triggering recalculateUserScore`);
  await recalculateUserScore(userId);
  console.log(`[updateUserEducationScore] Recalculate completed`);

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

    const totalScore = await updateUserEducationScore(userId);
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    // ✅ Verify the update by fetching the UserScore
    const updatedUserScore = await UserScore.findOne({ userId });
    console.log(`[createEducation] Final UserScore university:`, updatedUserScore?.university);

    return res.status(201).json({
      message: "Educations added successfully",
      educationScore: totalScore,
      data: savedEducations,
      navigation,
      university: updatedUserScore?.university // Return for debugging
    });

  } catch (error) {
    console.error("Error creating educations:", error);
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

    // ✅ Verify the update
    const updatedUserScore = await UserScore.findOne({ userId: updatedEducation.userId });
    console.log(`[updateEducation] Final UserScore university:`, updatedUserScore?.university);

    return res.status(200).json({
      message: "Education updated successfully",
      educationScore: totalScore,
      data: updatedEducation,
      university: updatedUserScore?.university
    });
  } catch (error) {
    console.error("Error updating education:", error);
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