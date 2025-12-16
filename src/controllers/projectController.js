const Project = require("../models/projectModel");
const User = require("../models/userModel");

// --------------------------------------------------
// FUNCTION: PROJECT SCORING LOGIC
// Each project = 25 points
// --------------------------------------------------
const calculateProjectPoints = (projectList) => {
  let total = 0;
  for (const project of projectList) {
    total += project.points || 25;
  }
  return total;
};

// --------------------------------------------------
// FUNCTION: UPDATE USER EXPERIENCE INDEX (PROJECT PART)
// --------------------------------------------------
const updateUserProjectScore = async (userId) => {
  const projects = await Project.find({ userId });

  const projectScore = calculateProjectPoints(projects);

  await User.findByIdAndUpdate(
    userId,
    { "experienceIndex.projectScore": projectScore },
    { new: true }
  );

  return projectScore;
};
exports.createProject = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const payload = {
      userId,
      projectName: req.body.projectName,
      role: req.body.role,
      summary: req.body.summary,
      outcome: req.body.outcome,
      link: req.body.link,
      points: 25
    };

    const project = await Project.create(payload);

    // update score
    const score = await updateUserProjectScore(userId);

    return res.status(201).json({
      message: "Project added successfully",
      projectScore: score,
      data: project
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error creating project",
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
