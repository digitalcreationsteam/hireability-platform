// controllers/dashboardController.js

const Demographics = require("../models/demographicsModel");
const Education = require("../models/educationModel");
const WorkExperience = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");
const UserScore = require("../models/userScoreModel");

exports.getDashboardByUserId = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    /* --------------------------------
       FETCH RAW DATA (NO CALCULATION)
    -------------------------------- */
    const [
      demographics,
      education,
      workExperience,
      certifications,
      awards,
      projects,
      userScore,
      topUser
    ] = await Promise.all([
      Demographics.find({ userId }).lean(),
      Education.find({ userId }).lean(),
      WorkExperience.find({ userId }).lean(),
      Certification.find({ userId }).lean(),
      Award.find({ userId }).lean(),
      Project.find({ userId }).lean(),
      UserScore.findOne({ userId }).lean(),
      UserScore.findOne({})
        .sort({ experienceIndexScore: -1 })
        .select("experienceIndexScore")
        .lean()
    ]);

    /* --------------------------------
       SAFE FALLBACKS
    -------------------------------- */
    const experienceIndexScore = userScore?.experienceIndexScore || 0;
    const skillIndexScore = userScore?.skillIndexScore || 0;
    const hireabilityIndex = userScore?.hireabilityIndex || 0;

    const experienceIndexTotal =
      topUser?.experienceIndexScore || experienceIndexScore || 0;

    /* --------------------------------
       RESPONSE (SAME STRUCTURE YOU WANT)
    -------------------------------- */
    res.json({
      userId,

      data: {
        demographics,
        education,
        workExperience,
        certifications,
        awards,
        projects
      },

      points: {
        demographics: 0, // 
        education: userScore?.educationScore || 0,
        workExperience: userScore?.workScore || 0,
        certifications: userScore?.certificationScore || 0,
        awards: userScore?.awardScore || 0,
        projects: userScore?.projectScore || 0,
        total: experienceIndexScore
      },

      hireabilityIndex: {
        experienceIndexScore,
        experienceIndexTotal,
        skillIndexScore,
        skillIndexTotal: 300,
        hireabilityIndex
      }
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};
