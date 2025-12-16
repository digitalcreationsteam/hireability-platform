const Education = require("../models/educationModel");
const User = require("../models/userModel");

// --------------------------------------------------
// FUNCTION: EDUCATION SCORING LOGIC
// --------------------------------------------------

const calculateEducationPoints = (educationList) => {
  let total = 0;

  for (const edu of educationList) {
    const degree = edu.degree?.toLowerCase();
    const duration = edu.duration || 0;       // in years
    // const phdYears = edu.phdYears || 0;

    // Diploma / Associate
    if (degree.includes("diploma") || degree.includes("associate")) {
      total += 120;
    }

    // Bachelor Degree
    if (degree.includes("bachelor") || degree.includes("b.tech") || degree.includes("bsc")) {
      if (duration === 3) total += 180;
      if (duration === 4) total += 240;
    }

    // Master Degree
    if (degree.includes("master") || degree.includes("m.tech") || degree.includes("msc")) {
      if (duration === 2) total += 120;
      if (duration === 1) total += 60;
    }

    // PhD
    if (degree.includes("phd") || degree.includes("doctorate")) {
      total += duration * 60;
    }
  }

  return total;
};

// --------------------------------------------------
// FUNCTION: UPDATE USER EXPERIENCE INDEX (JUST EDUCATION PART)
// --------------------------------------------------
const updateUserEducationScore = async (userId) => {
  const educations = await Education.find({ userId });

  const educationScore = calculateEducationPoints(educations);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.educationScore": educationScore },
    { new: true }
  );

  return educationScore;
};

// --------------------------------------------------
// CREATE EDUCATION
// --------------------------------------------------
exports.createEducation = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) return res.status(400).json({ message: "User ID missing in header" });

    const education = await Education.create({
      ...req.body,
      userId: userId,
    });

    // Recalculate scoring
    const score = await updateUserEducationScore(userId);

    return res.status(201).json({
      message: "Education added successfully",
      educationScore: score,
      data: education,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error creating education", error: error.message });
  }
};

// --------------------------------------------------
// GET ALL EDUCATIONS
// --------------------------------------------------
exports.getEducations = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const educations = await Education.find({ userId }).sort({ startYear: -1 });

    return res.status(200).json({
      message: "Educations fetched successfully",
      data: educations,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching educations", error: error.message });
  }
};

// --------------------------------------------------
// GET SINGLE EDUCATION
// --------------------------------------------------
exports.getEducationById = async (req, res) => {
  try {
    const education = await Education.findById(req.params.id);
    if (!education) return res.status(404).json({ message: "Education not found" });

    return res.status(200).json({ message: "Education fetched", data: education });

  } catch (error) {
    return res.status(500).json({ message: "Error", error: error.message });
  }
};

// --------------------------------------------------
// UPDATE EDUCATION
// --------------------------------------------------
exports.updateEducation = async (req, res) => {
  try {
    const education = await Education.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!education) return res.status(404).json({ message: "Education not found" });

    // Recalculate scoring
    const score = await updateUserEducationScore(education.userId);

    return res.status(200).json({
      message: "Education updated successfully",
      educationScore: score,
      data: education,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating education", error: error.message });
  }
};

// --------------------------------------------------
// DELETE EDUCATION
// --------------------------------------------------
exports.deleteEducation = async (req, res) => {
  try {
    const education = await Education.findByIdAndDelete(req.params.id);
    if (!education) return res.status(404).json({ message: "Education not found" });

    // Recalculate scoring
    const score = await updateUserEducationScore(education.userId);

    return res.status(200).json({
      message: "Education deleted successfully",
      educationScore: score,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting education", error: error.message });
  }
};