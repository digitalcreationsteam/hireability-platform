const mongoose = require("mongoose");
const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");
const { recalculateUserScore } = require("../../services/recalculateUserScore");
const SkillAssessment = require("../../models/SkillAssessmentModel");
const UserScore = require("../../models/userScoreModel")
const Demographics = require("../../models/demographicsModel")
const Education = require("../../models/educationModel")
const { createAttempt } = require("./attemptEngine");
// const AttemptLimit = require("../../models/attemptLimitModel");

const calculatePercentage = (score, maxScore) => {
  if (!maxScore || maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};

const getPerformanceTier = (percentage) => {
  if (percentage >= 90) return "Master";
  if (percentage >= 75) return "Advanced";
  if (percentage >= 60) return "Elite Performer";
  if (percentage >= 45) return "Competent";
  if (percentage >= 30) return "Developing";
  return "Beginner";
};

const getTopPercentile = (percentage) => {
  if (percentage >= 95) return "Top 5%";
  if (percentage >= 90) return "Top 10%";
  if (percentage >= 80) return "Top 20%";
  if (percentage >= 70) return "Top 30%";
  if (percentage >= 60) return "Top 40%";
  if (percentage >= 50) return "Top 50%";
  return "Above Average";
};

const getAchievementBadges = (percentage, integrityLevel) => {
  const badges = [];

  // Score-based badges
  if (percentage >= 90) badges.push({ label: "🏆 Excellence Award", color: "primary" });
  else if (percentage >= 75) badges.push({ label: "⭐ High Achiever", color: "primary" });
  else if (percentage >= 60) badges.push({ label: "🎯 Proficient", color: "primary" });
  else if (percentage >= 45) badges.push({ label: "📈 On Track", color: "secondary" });
  else badges.push({ label: "Growing", color: "secondary" });

  // Integrity-based badges
  if (integrityLevel === "Excellent") badges.push({ label: "Integrity Champion", color: "primary" });
  else if (integrityLevel === "Good") badges.push({ label: "✓ Trusted Tester", color: "secondary" });

  return badges;
};

const getMotivationalMessage = (percentage) => {
  if (percentage >= 90) return "🏆 Outstanding! You're in the elite league!";
  if (percentage >= 75) return "✨ Excellent work! You're very close to mastery!";
  if (percentage >= 60) return "🎯 Great job! Keep pushing to the next level!";
  if (percentage >= 45) return "📈 Good progress! Practice makes perfect!";
  return " Every expert was once a beginner. Keep learning!";
};

// START ASSESSMENT:
exports.startAssessment = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const userSkill = await UserDomainSkill.findOne({ userId });

    if (!userSkill) {
      return res.status(400).json({ message: "Domain not selected" });
    }

    const attempt = await createAttempt({
      userId,
      domainId: userSkill.domainId,
      // subDomainId: userSkill.subDomainId,
      // type: "default",
    });

    res.status(201).json({
      attemptId: attempt._id,
      expiresAt: attempt.expiresAt,
    });
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
};

exports.getAttemptQuestions = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      status: "in_progress",
      expiresAt: { $gt: new Date() },
    });

    if (!attempt) {
      return res.status(404).json({ message: "Test attempt not found" });
    }

    const questionIds = attempt.questions.map((q) => q.questionId);

    const questions = await McqQuestion.find({
      _id: { $in: questionIds },
    });

    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      marks: attempt.questions.find(
        (a) => a.questionId.toString() === q._id.toString(),
      )?.marks,
    }));

    // ✅ TOTAL MARKS CALCULATION
    const totalMarks = formattedQuestions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0,
    );

    res.status(200).json({
      attemptId: attempt._id,
      durationMinutes: Math.ceil(
        (attempt.expiresAt - attempt.createdAt) / (60 * 1000),
      ),
      totalMarks, // 🔥 added
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error("Get Attempt Questions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOption } = req.body;

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      status: "in_progress",
      expiresAt: { $gt: new Date() },
    });

    if (!attempt) {
      return res.status(400).json({ message: "Invalid or expired attempt" });
    }

    const question = attempt.questions.find(
      (q) => q.questionId.toString() === questionId,
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found in attempt" });
    }

    question.selectedOption = selectedOption;

    await attempt.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Save Answer Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// SUBMIT TEST
// exports.submitAssessment = async (req, res) => {
//   try {
//     console.log("===== SUBMIT ASSESSMENT CALLED =====");
//     console.log("REQ BODY:", req.body);
//     console.log("REQ PARAMS:", req.params);

//     const { attemptId } = req.body;

//     if (!attemptId) {
//       console.error("❌ attemptId missing in request body");
//       return res.status(400).json({ message: "attemptId is required" });
//     }

//     if (!mongoose.Types.ObjectId.isValid(attemptId)) {
//       console.error("❌ Invalid attemptId:", attemptId);
//       return res.status(400).json({ message: "Invalid attempt ID" });
//     }

//     console.log("✅ attemptId is valid:", attemptId);

//     const attempt = await TestAttempt.findById(attemptId).populate(
//       "questions.questionId",
//     );

//     if (!attempt) {
//       console.error("❌ No attempt found for ID:", attemptId);
//       return res.status(404).json({ message: "Assessment not found" });
//     }

//     console.log("✅ Attempt found:", {
//       id: attempt._id.toString(),
//       status: attempt.status,
//       userId: attempt.userId.toString(),
//     });

//     // ✅ idempotency: already submitted
//     if (attempt.status === "completed") {
//       console.log("ℹ️ Attempt already completed. Returning existing result.");

//       return res.json({
//         attemptId,
//         skillIndex: attempt.skillIndex,
//         maxSkillIndex: 300,
//         integrity: attempt.integrity,
//       });
//     }

//     if (attempt.status !== "in_progress") {
//       console.error("❌ Invalid attempt state:", attempt.status);
//       return res.status(400).json({ message: "Invalid assessment state" });
//     }

//     let skillIndex = 0;
//     let answeredCount = 0;

//     attempt.questions.forEach((q, index) => {
//       if (q.selectedOption == null) {
//         console.log(`Q${index + 1}: Not answered`);
//         return;
//       }

//       answeredCount++;

//       q.isCorrect = q.selectedOption === q.questionId.correctAnswer;

//       if (q.isCorrect) {
//         skillIndex += q.marks;
//         console.log(`Q${index + 1}: ✅ Correct (+${q.marks})`);
//       } else {
//         console.log(`Q${index + 1}: ❌ Wrong`);
//       }
//     });

//     console.log("📊 Score calculation completed:", {
//       answeredCount,
//       skillIndex,
//     });

//     attempt.skillIndex = skillIndex;
//     attempt.status = "completed";
//     // attempt.submittedAt = new Date();

//     await attempt.save();

//     // 🔴 REQUIRED FOR ONBOARDING COMPLETION
//     await SkillAssessment.findOneAndUpdate(
//       { userId: attempt.userId },
//       {
//         startedAt: attempt.createdAt || new Date(),
//         completedAt: new Date(),
//       },
//       { upsert: true },
//     );

//     await recalculateUserScore(attempt.userId);
//     console.log("✅ Attempt saved as completed");

//     const skillUpdateResult = await UserDomainSkill.updateOne(
//       {
//         userId: attempt.userId,
//         domainId: attempt.domainId,
//         // subDomainId: attempt.subDomainId,
//       },
//       {
//         $max: { skillIndex },
//         $inc: { totalAttempts: 1 },
//       },
//       { upsert: true },
//     );

//     console.log("✅ UserDomainSkill updated:", skillUpdateResult);

//     console.log("===== SUBMIT ASSESSMENT SUCCESS =====");

//     res.json({
//       attemptId,
//       skillIndex,
//       maxSkillIndex: 300,
//     });
//   } catch (error) {
//     console.error("🔥 Submit Assessment Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// In your submitAssessment controller (from the code you shared)

// SUBMIT TEST
exports.submitAssessment = async (req, res) => {
  try {
    console.log("===== SUBMIT ASSESSMENT CALLED =====");
    const { attemptId } = req.body;

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await TestAttempt.findById(attemptId).populate(
      "questions.questionId",
    );

    if (!attempt) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    // ✅ idempotency: already submitted
    if (attempt.status === "completed") {
      console.log("ℹ️ Attempt already completed. Returning existing result.");

      // Calculate derived values for completed attempt
      const percentage = calculatePercentage(skillIndex, 300);
      const performanceTier = getPerformanceTier(percentage);
      const topPercentile = getTopPercentile(percentage);
      const achievementBadges = getAchievementBadges(percentage, attempt.integrity?.level);
      const motivationalMessage = getMotivationalMessage(percentage);


      res.json({
        attemptId,
        skillIndex,
        maxSkillIndex: 300,
        percentage,
        performanceTier,
        topPercentile,
        achievementBadges,
        motivationalMessage,
        integrity: attempt.integrity,
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Invalid assessment state" });
    }

    let skillIndex = 0;
    let answeredCount = 0;

    attempt.questions.forEach((q, index) => {
      if (q.selectedOption == null) {
        console.log(`Q${index + 1}: Not answered`);
        return;
      }

      answeredCount++;

      q.isCorrect = q.selectedOption === q.questionId.correctAnswer;

      if (q.isCorrect) {
        skillIndex += q.marks;
        console.log(`Q${index + 1}: ✅ Correct (+${q.marks})`);
      } else {
        console.log(`Q${index + 1}: ❌ Wrong`);
      }
    });

    console.log("📊 Score calculation completed:", {
      answeredCount,
      skillIndex,
    });

    attempt.skillIndex = skillIndex;
    attempt.status = "completed";

    await attempt.save();

    // 🔴 REQUIRED FOR ONBOARDING COMPLETION
    await SkillAssessment.findOneAndUpdate(
      { userId: attempt.userId },
      {
        startedAt: attempt.createdAt || new Date(),
        completedAt: new Date(),
      },
      { upsert: true },
    );

    await recalculateUserScore(attempt.userId);
    console.log("✅ Attempt saved as completed");

    const skillUpdateResult = await UserDomainSkill.updateOne(
      {
        userId: attempt.userId,
        domainId: attempt.domainId,
      },
      {
        $max: { skillIndex },
        $inc: { totalAttempts: 1 },
      },
      { upsert: true },
    );

    console.log("✅ UserDomainSkill updated:", skillUpdateResult);

    // Calculate derived values for response
    const percentage = Math.round((skillIndex / 300) * 100);
    const performanceTier = getPerformanceTier(percentage);
    const topPercentile = getTopPercentile(percentage);
    const achievementBadges = getAchievementBadges(percentage, attempt.integrity?.level);

    console.log("===== SUBMIT ASSESSMENT SUCCESS =====");

    res.json({
      attemptId,
      skillIndex,
      maxSkillIndex: 300,
      percentage,
      performanceTier,
      topPercentile,
      achievementBadges,
      integrity: attempt.integrity,
    });
  } catch (error) {
    console.error("🔥 Submit Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET LATEST RESULT
exports.getLatestResult = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userSkill = await UserDomainSkill.findOne({ userId });
    if (!userSkill) {
      return res.status(404).json({ message: "No domain selected" });
    }

    const attempt = await TestAttempt.findOne({
      userId,
      domainId: userSkill.domainId,
      // subDomainId: userSkill.subDomainId,
      status: "completed",
    }).sort({ updatedAt: -1 });

    if (!attempt) {
      return res.status(404).json({
        message: "No completed assessment found",
      });
    }

    const percentage = calculatePercentage(attempt.skillIndex, 300);
    const performanceTier = getPerformanceTier(percentage);
    const topPercentile = getTopPercentile(percentage);
    const achievementBadges = getAchievementBadges(percentage, attempt.integrity?.level);
    const motivationalMessage = getMotivationalMessage(percentage);

    res.json({
      attemptId: attempt._id,
      skillIndex: attempt.skillIndex,
      testStatus: attempt.testStatus,
      completedAt: attempt.updatedAt,
      maxSkillIndex: 300,
      percentage,
      performanceTier,
      topPercentile,
      achievementBadges,
      motivationalMessage,
      integrity: attempt.integrity,
    });
  } catch (err) {
    console.error("Get Latest Result Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Modify your existing getResultByAttemptId function
exports.getResultByAttemptId = async (req, res) => {
  try {
    const { attemptId, includeExperience } = req.query;
    const userId = req.headers["user-id"];

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    const attempt = await TestAttempt.findById(attemptId)
      .populate("questions.questionId");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Calculate derived values
    const percentage = calculatePercentage(attempt.skillIndex, 300);
    const performanceTier = getPerformanceTier(percentage);
    const topPercentile = getTopPercentile(percentage);
    const achievementBadges = getAchievementBadges(percentage, attempt.integrity?.level);
    const motivationalMessage = getMotivationalMessage(percentage);

    // Calculate time taken if available
    let timeTakenSeconds = null;
    if (attempt.createdAt && attempt.updatedAt) {
      timeTakenSeconds = Math.round((attempt.updatedAt - attempt.createdAt) / 1000);
    }

    // Base response
    const response = {
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        skillIndex: attempt.skillIndex,
        submittedAt: attempt.updatedAt,
        createdAt: attempt.createdAt,
        timeTakenSeconds,
        integrity: attempt.integrity,
      },
      hireabilityIndex: {
        skillIndexScore: attempt.skillIndex,
        skillIndexTotal: 300,
      },
      percentage,
      performanceTier,
      topPercentile,
      achievementBadges,
      motivationalMessage,
    };

    // Include experience data if requested
    if (includeExperience === "true" && userId) {
      const userScore = await UserScore.findOne({ userId }).lean();
      const topUser = await UserScore.findOne({})
        .sort({ experienceIndexScore: -1 })
        .select("experienceIndexScore")
        .lean();
      const demographics = await Demographics.findOne({ userId }).lean();
      const education = await Education.findOne({ userId }).lean();

      response.experience = {
        rank: {
          global: { rank: userScore?.globalRank || "-", percentile: userScore?.globalPercentile?.toString() || "-" },
          country: { rank: userScore?.countryRank || "-", percentile: userScore?.countryPercentile?.toString() || "-" },
          state: { rank: userScore?.stateRank || "-", percentile: userScore?.statePercentile?.toString() || "-" },
          city: { rank: userScore?.cityRank || "-", percentile: userScore?.cityPercentile?.toString() || "-" },
          university: { rank: userScore?.universityRank || "-", percentile: userScore?.universityPercentile?.toString() || "-" },
        },
        demographics: {
          state: demographics?.state || "State",
          city: demographics?.city || "City",
        },
        education: {
          university: education?.schoolName || "University",
        },
      };
    }

    res.json(response);
  } catch (err) {
    console.error("Get Result By AttemptId Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// GET ASSESSMENT RESULT WITH EXPERIENCE INDEX (COMBINED)
exports.getAssessmentResultWithExperience = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { attemptId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!attemptId) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    // Fetch the specific attempt
    const attempt = await TestAttempt.findById(attemptId)
      .populate("questions.questionId");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Fetch user score data for experience index
    const userScore = await UserScore.findOne({ userId }).lean();

    if (!userScore) {
      return res.status(404).json({ message: "User score not found" });
    }

    // Fetch top user for experience index total
    const topUser = await UserScore.findOne({})
      .sort({ experienceIndexScore: -1 })
      .select("experienceIndexScore")
      .lean();

    // Fetch demographics for location data
    const demographics = await Demographics.findOne({ userId }).lean();

    // Fetch education for university name
    const education = await Education.findOne({ userId }).lean();

    // Calculate assessment result values
    const percentage = calculatePercentage(attempt.skillIndex, 300);
    const performanceTier = getPerformanceTier(percentage);
    const topPercentile = getTopPercentile(percentage);
    const achievementBadges = getAchievementBadges(percentage, attempt.integrity?.level);
    const motivationalMessage = getMotivationalMessage(percentage);

    // Calculate time taken if available
    let timeTakenSeconds = null;
    if (attempt.createdAt && attempt.updatedAt) {
      timeTakenSeconds = Math.round((attempt.updatedAt - attempt.createdAt) / 1000);
    }

    // Prepare rank data
    const rankData = {
      global: {
        rank: userScore?.globalRank || "-",
        percentile: userScore?.globalPercentile != null ? userScore.globalPercentile.toString() : "-",
      },
      country: {
        rank: userScore?.countryRank || "-",
        percentile: userScore?.countryPercentile != null ? userScore.countryPercentile.toString() : "-",
      },
      state: {
        rank: userScore?.stateRank || "-",
        percentile: userScore?.statePercentile != null ? userScore.statePercentile.toString() : "-",
      },
      city: {
        rank: userScore?.cityRank || "-",
        percentile: userScore?.cityPercentile != null ? userScore.cityPercentile.toString() : "-",
      },
      university: {
        rank: userScore?.universityRank || "-",
        percentile: userScore?.universityPercentile != null ? userScore.universityPercentile.toString() : "-",
      },
    };

    // Get location and university data
    const userState = demographics?.state || "State";
    const userCity = demographics?.city || "City";
    const userUniversityName = education?.schoolName || "University";

    // Prepare the combined response
    res.json({
      success: true,

      // Assessment result data
      assessment: {
        attemptId: attempt._id,
        skillIndex: attempt.skillIndex,
        maxSkillIndex: 300,
        percentage,
        performanceTier,
        topPercentile,
        achievementBadges,
        motivationalMessage,
        submittedAt: attempt.updatedAt,
        timeTakenSeconds,
        integrity: attempt.integrity,
      },

      // Experience index data (for ranks)
      experience: {
        rank: rankData,
        demographics: {
          state: userState,
          city: userCity,
        },
        education: {
          university: userUniversityName,
        },
        hireabilityIndex: {
          experienceIndexScore: userScore?.experienceIndexScore || 0,
          experienceIndexTotal: topUser?.experienceIndexScore || userScore?.experienceIndexScore || 0,
          skillIndexScore: userScore?.skillIndexScore || 0,
          skillIndexTotal: 300,
          hireabilityIndex: userScore?.hireabilityIndex || 0,
        },
      },

      // User info
      userId,
    });

  } catch (err) {
    console.error("Get Assessment Result With Experience Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

///////////////////////////////////////////////////////////////

const PENALTY = {
  COPY: 15,
  PASTE: 15,
  TAB_SWITCH: 10,
};

function getIntegrityLevel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Low";
  return "High Risk";
}

exports.reportViolation = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { attemptId } = req.params;
    const { type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(attemptId))
      return res.status(400).json({ message: "Invalid attempt ID" });

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      userId,
      status: "in_progress",
      expiresAt: { $gt: new Date() },
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not active" });
    }

    // 🔴 1. Save violation
    attempt.violations.push({ type });

    // 🔢 2. Recalculate integrity score
    let totalPenalty = 0;
    for (const v of attempt.violations) {
      totalPenalty += PENALTY[v.type] || 0;
    }

    const score = Math.max(0, 100 - totalPenalty);
    const level = getIntegrityLevel(score);

    attempt.integrity.score = score;
    attempt.integrity.level = level;

    // 🚨 3. Check cheating threshold
    const totalViolations = attempt.violations.length;

    let alertTriggered = false;

    if (totalViolations >= 3 && !attempt.cheatAlertSent) {
      attempt.cheatAlertSent = true;
      alertTriggered = true;

      // Here you can also:
      // - log to admin panel
      // - send email
      // - flag user
      console.log(`🚨 Cheating alert: User ${userId} in attempt ${attemptId}`);
    }

    await attempt.save();

    res.json({
      success: true,
      integrityScore: score,
      integrityLevel: level,
      totalViolations,
      cheatAlert: alertTriggered, // frontend can show popup
    });
  } catch (err) {
    console.error("Integrity Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
