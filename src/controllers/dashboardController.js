// controllers/dashboardController.js

const Demographics = require("../models/demographicsModel");
const Education = require("../models/educationModel");
const WorkExperience = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");
const UserScore = require("../models/userScoreModel");
const UserDomainSkill = require("../models/userDomainSkillModel");
const UserDocument = require("../models/userDocumentModel");
const userDomainSkill = require("../models/userDomainSkillModel");
const testAttempt = require("../models/testAttemptModel");

// controllers/dashboardController.js - Updated getDashboardByUserId

exports.getDashboardByUserId = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    /* --------------------------------
       FETCH RAW DATA
    -------------------------------- */
    const [
      demographics,
      education,
      workExperience,
      certifications,
      awards,
      projects,
      userScore,
      topUser,
      skillDocs,
      documents,
      latestAttempt
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
        .lean(),
      UserDomainSkill.find({ userId }).lean(),
      UserDocument.findOne({ userId }).lean(),
      testAttempt
        .findOne({ userId })
        .sort({ updatedAt: -1 })
        .select("integrity status domainId startedAt expiresAt cheatAlertSent violations")
        .lean(),
    ]);

    /* --------------------------------
       FETCH TOTAL COUNTS FOR PERCENTILE CALCULATION
    -------------------------------- */
    // Get primary domain and cohort for filtering
    const primaryDomain = userScore?.primaryDomain;
    const cohort = userScore?.experienceCohort;

    let totalGlobal = 0;
    let totalCountry = 0;
    let totalState = 0;
    let totalCity = 0;
    let totalUniversity = 0;

    if (primaryDomain && cohort) {
      // Base filter for same domain and cohort
      const baseFilter = {
        primaryDomain: primaryDomain,
        experienceCohort: cohort
      };

      // Get total counts for percentile calculation
      totalGlobal = await UserScore.countDocuments(baseFilter);

      if (userScore?.country) {
        totalCountry = await UserScore.countDocuments({
          ...baseFilter,
          country: userScore.country
        });
      }

      if (userScore?.state) {
        totalState = await UserScore.countDocuments({
          ...baseFilter,
          state: userScore.state
        });
      }

      if (userScore?.city) {
        totalCity = await UserScore.countDocuments({
          ...baseFilter,
          city: userScore.city
        });
      }

      if (userScore?.university) {
        totalUniversity = await UserScore.countDocuments({
          ...baseFilter,
          university: userScore.university
        });
      }
    }

    /* --------------------------------
       SAFE FALLBACKS
    -------------------------------- */
    const experienceIndexScore = userScore?.experienceIndexScore || 0;
    const skillIndexScore = userScore?.skillIndexScore || 0;
    const hireabilityIndex = userScore?.hireabilityIndex || 0;

    const experienceIndexTotal =
      topUser?.experienceIndexScore || experienceIndexScore || 0;

    /* --------------------------------
       FLATTEN SKILLS
    -------------------------------- */
    const skills = skillDocs?.flatMap(doc => doc.skills) || [];

    /* --------------------------------
       RESPONSE
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
        demographics: 0,
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
      },

      rank: {
        globalRank: userScore?.globalRank || 0,
        countryRank: userScore?.countryRank || 0,
        stateRank: userScore?.stateRank || 0,
        cityRank: userScore?.cityRank || 0,
        universityRank: userScore?.universityRank || 0
      },

      // NEW: Add total counts for percentile calculation
      totalCounts: {
        global: totalGlobal,
        country: totalCountry,
        state: totalState,
        city: totalCity,
        university: totalUniversity
      },

      skills: {
        list: skills
      },

      documents: {
        resumeUrl: documents?.resumeUrl || null,
        profileUrl: documents?.profileUrl || null
      },

      jobdomain: {
        domain: documents?.jobdomain || "Professional"
      },
      integrity: {
        score: latestAttempt?.integrity?.score ?? 100,
        level: latestAttempt?.integrity?.level ?? "Excellent",
        status: latestAttempt?.status ?? null,
        cheatAlertSent: latestAttempt?.cheatAlertSent ?? false,
        totalViolations: latestAttempt?.violations?.length ?? 0,
        startedAt: latestAttempt?.startedAt ?? null,
        expiresAt: latestAttempt?.expiresAt ?? null,
        domainId: latestAttempt?.domainId ?? null,
      },
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};