
const WorkExperience = require("../models/workModel");
const User = require("../models/userModel");

const calculateWorkPoints = (workList) => {
  let total = 0;

  for (const exp of workList) {
    const years = exp.duration || 0;

    total += years * 60;   // per year score

    if (years >= 10) total += 200;  // senior-level bonus  
    else if (years >= 5) total += 100;
  }

  return total;
};


const updateUserWorkScore = async (userId) => {
  const workList = await WorkExperience.find({ userId });

  const workScore = calculateWorkPoints(workList);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.workScore": workScore },
    { new: true }
  );

  return workScore;
};

exports.createWorkExperience = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId)
      return res.status(400).json({ message: "User ID missing in header" });

    const work = await WorkExperience.create({
      ...req.body,
      userId,
    });

    const score = await updateUserWorkScore(userId);

    return res.status(201).json({
      message: "Work experience added successfully",
      workScore: score,
      data: work,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating work experience",
      error: error.message,
    });
  }
};

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
    return res.status(500).json({ message: "Error", error: error.message });
  }
};

// --------------------------------------------------
// GET SINGLE WORK EXPERIENCE
// --------------------------------------------------
exports.getWorkExperienceById = async (req, res) => {
  try {
    const workExperience = await WorkExperience.findById(req.params.id);

    if (!workExperience) {
      return res.status(404).json({
        message: "Work experience not found"
      });
    }

    return res.status(200).json({
      message: "Work experience fetched successfully",
      data: workExperience
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching work experience",
      error: error.message
    });
  }
};


exports.updateWorkExperience = async (req, res) => {
  try {
    const exp = await WorkExperience.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!exp) return res.status(404).json({ message: "Work experience not found" });

    const score = await updateUserWorkScore(exp.userId);

    return res.status(200).json({
      message: "Work experience updated successfully",
      workScore: score,
      data: exp,
    });

  } catch (error) {
    return res.status(500).json({ message: "Error updating work", error: error.message });
  }
};


exports.deleteWorkExperience = async (req, res) => {
  try {
    const exp = await WorkExperience.findByIdAndDelete(req.params.id);
    if (!exp) return res.status(404).json({ message: "Work not found" });

    const score = await updateUserWorkScore(exp.userId);

    return res.status(200).json({
      message: "Work experience deleted successfully",
      workScore: score,
    });

  } catch (error) {
    return res.status(500).json({ message: "Error deleting work", error: error.message });
  }
};
