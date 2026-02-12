const CaseStudy = require("../models/caseStudyModel");
const CaseOpening = require("../models/caseOpeningModel");
const CaseQuestion = require("../models/caseQuestionsModel");
const CaseReveal = require("../models/caseReveal");
const UserCaseAttempt = require("../models/userCaseAttemptModel");
const userCaseAttemptModel = require("../models/userCaseAttemptModel");
const UserScore = require("../models/userScoreModel");


exports.startCase = async (req, res) => {
  try {
    const userId = req.user.id;
    const { caseId } = req.params;

    const caseStudy = await CaseStudy.findById(caseId);
    if (!caseStudy) {
      return res.status(404).json({ message: "Case not found" });
    }

    const attemptsCount = await UserCaseAttempt.countDocuments({
      userId,
      caseId
    });

    if (attemptsCount >= caseStudy.maxAttempts) {
      return res.status(400).json({
        message: "Maximum attempts reached"
      });
    }

    const attempt = await UserCaseAttempt.create({
      userId,
      caseId,
      attemptNumber: attemptsCount + 1
    });

    const opening = await CaseOpening.findOne({ caseId });

    res.status(201).json({
      success: true,
      attemptId: attempt._id,
      opening
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllCases = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const cases = await CaseStudy.find()
      .skip((page - 1) * limit)
      .limit(limit);

    // Get completed attempts of this user
    const completedAttempts = await UserCaseAttempt.find({
      userId,
      isCompleted: true
    }).select("caseId");

    const completedCaseIds = completedAttempts.map(
      attempt => attempt.caseId.toString()
    );

    // Attach submission status
    const casesWithStatus = cases.map(c => ({
      ...c.toObject(),
      isSubmitted: completedCaseIds.includes(c._id.toString())
    }));

    res.status(200).json({
      success: true,
      data: casesWithStatus
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getCurrentQuestion = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await UserCaseAttempt.findById(attemptId);
    if (!attempt || attempt.isCompleted) {
      return res.status(400).json({ message: "Invalid attempt" });
    }

    // Fetch all questions for this case, sorted by order
    const questions = await CaseQuestion.find({ caseId: attempt.caseId }).sort({ order: 1 });

    // Find the first question that has NOT been answered yet
    const nextQuestion = questions.find(
      (q) => !attempt.answers.some(a => a.questionId.toString() === q._id.toString())
    );

    if (!nextQuestion) {
      // ✅ All questions answered → return null or flag completed
      return res.status(200).json({ success: true, data: null, completed: true, caseId: attempt.caseId });
    }

    // Return next unanswered question
    res.status(200).json({
      success: true,
      data: {
        _id: nextQuestion._id,
        questionText: nextQuestion.questionText,
        options: nextQuestion.options,
        caseId: attempt.caseId // ✅ include caseId here
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOption } = req.body;

    const attempt = await UserCaseAttempt.findById(attemptId);
    if (!attempt || attempt.isCompleted) {
      return res.status(400).json({ message: "Invalid attempt" });
    }

    const alreadyAnswered = attempt.answers.find(
      (a) => a.questionId.toString() === questionId
    );

    if (alreadyAnswered) {
      return res.status(400).json({
        message: "Answer already submitted",
        caseId: attempt.caseId, // ✅ include caseId
      });
    }

    attempt.answers.push({
      questionId,
      selectedOption,
    });

    attempt.currentQuestion += 1;

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Answer saved",
      caseId: attempt.caseId, // ✅ include caseId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await UserCaseAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = await CaseQuestion.find({
      caseId: attempt.caseId
    }).select("+correctOption");

    let score = 0;

    questions.forEach((question) => {
      const userAnswer = attempt.answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      );

      if (userAnswer && userAnswer.selectedOption === question.correctOption) {
        score += 2;
      }
    });

    attempt.score = score;
    attempt.isCompleted = true;

    await attempt.save();

    res.status(200).json({
      success: true,
      score,
      retryAvailable: attempt.attemptNumber < 2,
      caseId: attempt.caseId, // ✅ include caseId in response
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCaseReveal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { caseId } = req.params;

    const attempt = await UserCaseAttempt.findOne({
      userId,
      caseId,
      isCompleted: true
    }).sort({ attemptNumber: -1 });

    if (!attempt) {
      return res.status(403).json({
        message: "Complete the case to unlock reveal"
      });
    }

    attempt.revealUnlocked = true;
    await attempt.save();

    const reveal = await CaseReveal.findOne({ caseId });

    res.status(200).json({
      success: true,
      score: attempt.score,
      reveal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

