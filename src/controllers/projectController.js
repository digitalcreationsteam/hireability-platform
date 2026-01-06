const Project = require("../models/projectModel");
const User = require("../models/userModel");
const { recalculateUserScore } = require("../services/recalculateUserScore");
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
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const { projects } = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        message: "projects must be a non-empty array"
      });
    }

    const projectDocs = projects.map(p => ({
      userId,
      projectName: p.projectName,
      role: p.role,
      summary: p.summary,
      outcome: p.outcome,
      link: p.link,
      projectScore: 3
    }));

    const insertedProjects = await Project.insertMany(projectDocs);

    const score = await updateUserProjectScore(userId);

    return res.status(201).json({
      message: "Projects added successfully",
      totalAdded: insertedProjects.length,
      projectScore: score,
      data: insertedProjects
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating projects",
      error: error.message
    });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const projects = await Project.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Projects fetched successfully",
      data: projects
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching projects",
      error: error.message
    });
  }
};


exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.status(200).json({
      message: "Project fetched",
      data: project
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error fetching project",
      error: error.message
    });
  }
};


exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // recalc score
    const score = await updateUserProjectScore(project.userId);

    return res.status(200).json({
      message: "Project updated",
      projectScore: score,
      data: project
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error updating project",
      error: error.message
    });
  }
};


exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // update score
    const score = await updateUserProjectScore(project.userId);

    return res.status(200).json({
      message: "Project deleted",
      projectScore: score
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error deleting project",
      error: error.message
    });
  }
};
