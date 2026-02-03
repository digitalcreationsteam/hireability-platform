const mongoose = require("mongoose");
const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");
const { recalculateUserScore } = require("../../services/recalculateUserScore");
const SkillAssessment = require("../../models/SkillAssessmentModel");

const { createAttempt } = require("./attemptEngine");
// const AttemptLimit = require("../../models/attemptLimitModel");

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
exports.submitAssessment = async (req, res) => {
  try {
    console.log("===== SUBMIT ASSESSMENT CALLED =====");
    console.log("REQ BODY:", req.body);
    console.log("REQ PARAMS:", req.params);

    const { attemptId } = req.body;

    if (!attemptId) {
      console.error("❌ attemptId missing in request body");
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      console.error("❌ Invalid attemptId:", attemptId);
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    console.log("✅ attemptId is valid:", attemptId);

    const attempt = await TestAttempt.findById(attemptId).populate(
      "questions.questionId",
    );

    if (!attempt) {
      console.error("❌ No attempt found for ID:", attemptId);
      return res.status(404).json({ message: "Assessment not found" });
    }

    console.log("✅ Attempt found:", {
      id: attempt._id.toString(),
      status: attempt.status,
      userId: attempt.userId.toString(),
    });

    // ✅ idempotency: already submitted
    if (attempt.status === "completed") {
      console.log("ℹ️ Attempt already completed. Returning existing result.");

      return res.json({
        attemptId,
        skillIndex: attempt.skillIndex,
        maxSkillIndex: 300,
        integrity: attempt.integrity,
      });
    }

    if (attempt.status !== "in_progress") {
      console.error("❌ Invalid attempt state:", attempt.status);
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
    // attempt.submittedAt = new Date();

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
        // subDomainId: attempt.subDomainId,
      },
      {
        $max: { skillIndex },
        $inc: { totalAttempts: 1 },
      },
      { upsert: true },
    );

    console.log("✅ UserDomainSkill updated:", skillUpdateResult);

    console.log("===== SUBMIT ASSESSMENT SUCCESS =====");

    res.json({
      attemptId,
      skillIndex,
      maxSkillIndex: 300,
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

    res.json({
      attemptId: attempt._id,
      skillIndex: attempt.skillIndex,
      testStatus: attempt.testStatus,
      completedAt: attempt.updatedAt,
      maxSkillIndex: 300,
    });
  } catch (err) {
    console.error("Get Latest Result Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

///////////////////////////////////////////////////////////////

const PENALTY = {
  COPY: 10,
  PASTE: 15,
  TAB_SWITCH: 5,
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
