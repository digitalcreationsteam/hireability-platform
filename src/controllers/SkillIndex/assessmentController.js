const mongoose = require("mongoose");
const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");

// START TEST
exports.startAssessment = async (req, res) => {
  try {
    const { userId } = req.body;

    // 1. Get user's selected domain & subdomain
    const userSkill = await UserDomainSkill.findOne({ userId });

    if (!userSkill || !userSkill.domainId || !userSkill.subDomainId) {
      return res.status(400).json({
        message: "Domain and Subdomain not selected",
      });
    }

    const { domainId, subDomainId } = userSkill;

    // 2. Prevent multiple active tests
    const existingAttempt = await TestAttempt.findOne({
      userId,
      domainId,
      subDomainId,
      status: "in_progress",
      expiresAt: { $gt: new Date() },
    });

    if (existingAttempt) {
      return res.json({
        attemptId: existingAttempt._id,
        expiresAt: existingAttempt.expiresAt,
      });
    }

    // 3. Fetch 20 random questions
    const questions = await McqQuestion.aggregate([
      {
        $match: {
          domainId: new mongoose.Types.ObjectId(domainId),
          subDomainId: new mongoose.Types.ObjectId(subDomainId),
        },
      },
      { $sample: { size: 20 } },
    ]);

    if (questions.length < 20) {
      return res.status(400).json({
        message: "Not enough questions for assessment",
      });
    }

    // 4. Create test attempt
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000);

    const attempt = await TestAttempt.create({
      userId,
      domainId,
      subDomainId,
      expiresAt,
      questions: questions.map((q) => ({
        questionId: q._id,
        marks:
          q.difficulty === "Easy"
            ? 10
            : q.difficulty === "Medium"
            ? 15
            : 20,
      })),
    });

    // 5. Send questions (hide correct answers)
    res.status(201).json({
      attemptId: attempt._id,
      durationMinutes: 25,
      questions: questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: [q.option1, q.option2, q.option3, q.option4],
      })),
    });
  } catch (error) {
    console.error("Start Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// SUBMIT TEST
exports.submitAssessment = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    const attempt = await TestAttempt.findById(attemptId).populate(
      "questions.questionId"
    );

    if (!attempt) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Assessment already submitted" });
    }

    if (new Date() > attempt.expiresAt) {
      attempt.status = "expired";
      await attempt.save();
      return res.status(400).json({ message: "Assessment expired" });
    }

    let rawScore = 0;

    attempt.questions.forEach((q, index) => {
      const selected = answers[index];
      q.selectedOption = selected;

      const correctIndex = q.questionId.correctAnswer;
      q.isCorrect = selected === correctIndex;

      if (q.isCorrect) rawScore += q.marks;
    });

    attempt.rawSkillScore = rawScore;
    attempt.normalizedSkillScore = Math.round((rawScore / 350) * 1000);
    attempt.status = "completed";

    await attempt.save();

    res.json({
      rawSkillScore: attempt.rawSkillScore,
      normalizedSkillScore: attempt.normalizedSkillScore,
    });
  } catch (error) {
    console.error("Submit Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
