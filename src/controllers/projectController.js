// controllers/projectController.js
const Project = require("../models/projectModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
const { calculateNavigation, getCompletionStatus } = require("./authController");

/* --------------------------------------------------
   SCORING LOGIC
-------------------------------------------------- */
const calculateProjectPoints = (projectList) => {
  let total = 0;
  for (const project of projectList) {
    total += project.projectScore || 3;
  }
  return total;
};

const updateUserProjectScore = async (userId) => {
  const projects = await Project.find({ userId });
  const projectScore = calculateProjectPoints(projects);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.projectScore": projectScore },
    { new: true }
  );
  await recalculateUserScore(userId);
  return projectScore;
};

/* --------------------------------------------------
   MULTIPLE CREATE PROJECTS
-------------------------------------------------- */
exports.createMultipleProjects = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing in header",
      });
    }

    // ✅ CHECK MAX LIMIT (5 projects)
    const existingCount = await Project.countDocuments({ userId });
    const incomingCount = Array.isArray(req.body.projects)
      ? req.body.projects.length
      : 1;

    if (existingCount + incomingCount > 5) {
      return res.status(400).json({
        success: false,
        message: "You can add a maximum of 5 projects only.",
      });
    }

    const { projects } = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "projects must be a non-empty array",
      });
    }

    const projectDocs = projects.map((p) => ({
      userId,
      projectName: p.projectName,
      role: p.role,
      summary: p.summary,
      outcome: p.outcome,
      link: p.link,
      projectScore: 3,
    }));

    const insertedProjects = await Project.insertMany(projectDocs);
    const score = await updateUserProjectScore(userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(201).json({
      success: true,
      message: "Projects added successfully",
      totalAdded: insertedProjects.length,
      projectScore: score,
      data: insertedProjects,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Create projects error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating projects",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET ALL PROJECTS
-------------------------------------------------- */
exports.getProjects = async (req, res) => {
  try {
    const userId = req.headers["user-id"] || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID missing",
      });
    }

    const projects = await Project.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: projects,
    });
  } catch (error) {
    console.error("❌ Get projects error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   GET SINGLE PROJECT BY ID
-------------------------------------------------- */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project fetched",
      data: project,
    });
  } catch (error) {
    console.error("❌ Get project error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   UPDATE PROJECT
-------------------------------------------------- */
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Recalculate score
    const score = await updateUserProjectScore(project.userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(project.userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      projectScore: score,
      data: project,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Update project error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating project",
      error: error.message,
    });
  }
};

/* --------------------------------------------------
   DELETE PROJECT
-------------------------------------------------- */
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Update score
    const score = await updateUserProjectScore(project.userId);

    // ✅ GET UPDATED NAVIGATION
    const completionStatus = await getCompletionStatus(project.userId);
    const navigation = calculateNavigation(completionStatus);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      projectScore: score,
      navigation, // ← Frontend expects this
    });
  } catch (error) {
    console.error("❌ Delete project error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting project",
      error: error.message,
    });
  }
};