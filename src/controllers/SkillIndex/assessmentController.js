const mongoose = require("mongoose");
const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");
const { recalculateUserScore } = require("../../services/recalculateUserScore");

// START TEST
exports.startAssessment = async (req, res) => {
  try {
     const userId = req.headers["user-id"];

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

exports.getAttemptQuestions = async (req, res) => {
  try {
    const { attemptId } = req.params; // get attemptId from URL params

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    // 1. Find the attempt
    const attempt = await TestAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ message: "Test attempt not found" });
    }

    // 2. Get all question IDs from the attempt
    const questionIds = attempt.questions.map((q) => q.questionId);

    // 3. Fetch the questions from the database
    const questions = await McqQuestion.find({ _id: { $in: questionIds } });

    // 4. Map the questions to hide correct answers
    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      marks: attempt.questions.find((a) => a.questionId.toString() === q._id.toString())
        ?.marks,
    }));

    res.status(200).json({
      attemptId: attempt._id,
      durationMinutes: Math.ceil((attempt.expiresAt - attempt.createdAt) / (60 * 1000)),
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
      expiresAt: { $gt: new Date() }
    });

    if (!attempt) {
      return res.status(400).json({ message: "Invalid or expired attempt" });
    }

    const question = attempt.questions.find(
      (q) => q.questionId.toString() === questionId
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
    const { attemptId, answers } = req.body;

    const attempt = await TestAttempt.findById(attemptId)
      .populate("questions.questionId");

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

    // ✅ SKILL INDEX DIRECT (OUT OF 300)
    let skillIndex = 0;

    attempt.questions.forEach((q) => {
      const submitted = answers.find(
        (a) => a.questionId === q.questionId._id.toString()
      );

      if (!submitted) return;

      q.selectedOption = submitted.selectedOption;

      const correctAnswer = q.questionId.correctAnswer;
      q.isCorrect = submitted.selectedOption === correctAnswer;

      if (q.isCorrect) {
        skillIndex += q.marks; // Easy 10, Medium 15, Hard 25
      }
    });

    attempt.skillIndex = skillIndex; // ✅ max 300
    attempt.status = "completed";
    attempt.submittedAt = new Date();

    await attempt.save();

    // ✅ UPDATE USER DOMAIN SKILL
    await UserDomainSkill.updateOne(
      {
        userId: attempt.userId,
        domainId: attempt.domainId,
        subDomainId: attempt.subDomainId,
      },
      {
        $set: { skillIndex },
        $inc: { totalAttempts: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    res.json({
      skillIndex,
      maxSkillIndex: 300,
    });
  } catch (error) {
    console.error("Submit Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

