// controllers/dashboardController.js

const Education = require("../models/educationModel");
const WorkExperience = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");

// ---------------------------
// POINT CALCULATION FUNCTIONS
// ---------------------------
const calculateEducationPoints = (educationList) => {
  let total = 0;
  for (const edu of educationList) {
    const degree = edu.degree?.toLowerCase() || "";
    const duration = edu.duration || 0;

    if (degree.includes("diploma") || degree.includes("associate")) total += 120;
    if (degree.includes("bachelor") || degree.includes("b.tech") || degree.includes("bsc")) {
      total += duration === 3 ? 180 : duration === 4 ? 240 : 0;
    }
    if (degree.includes("master") || degree.includes("m.tech") || degree.includes("msc") || degree.includes("mca")) {
      total += duration === 1 ? 60 : duration === 2 ? 120 : 0;
    }
    if (degree.includes("phd") || degree.includes("doctorate")) total += duration * 60;
  }
  return total;
};

const calculateWorkPoints = (workList) => {
  let total = 0;
  for (const exp of workList) {
    const years = exp.duration || 0;
    total += years * 60;
    if (years >= 10) total += 200;
    else if (years >= 5) total += 100;
  }
  return total;
};

const calculateCertificationPoints = (certList) => {
  let total = 0;
  for (const cert of certList) total += cert.points || 50;
  return total;
};

const calculateAwardPoints = (awardList) => {
  let total = 0;
  for (const award of awardList) total += award.points || 50;
  return total;
};

const calculateProjectPoints = (projectList) => {
  let total = 0;
  for (const project of projectList) total += project.points || 25;
  return total;
};

// ---------------------------
// DASHBOARD CONTROLLER
// ---------------------------
const getDashboardByUserId = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    // Fetch all user-related data
    const educationList = await Education.find({ userId });
    const workList = await WorkExperience.find({ userId });
    const certList = await Certification.find({ userId });
    const awardList = await Award.find({ userId });
    const projectList = await Project.find({ userId });

    // Calculate points
    const educationPoints = calculateEducationPoints(educationList);
    const workPoints = calculateWorkPoints(workList);
    const certificationPoints = calculateCertificationPoints(certList);
    const awardPoints = calculateAwardPoints(awardList);
    const projectPoints = calculateProjectPoints(projectList);

    const totalPoints =
      educationPoints + workPoints + certificationPoints + awardPoints + projectPoints;

    // Return dashboard response
    res.json({
      userId,
      points: {
        demographics: 0,
        education: educationPoints,
        workExperience: workPoints,
        certifications: certificationPoints,
        awards: awardPoints,
        projects: projectPoints,
        total: totalPoints,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

module.exports = { getDashboardByUserId };
