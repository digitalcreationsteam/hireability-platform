const CaseStudy = require("../models/caseStudyModel");
const CaseOpening = require("../models/caseOpeningModel");
const CaseQuestion = require("../models/caseQuestionsModel");
const CaseReveal = require("../models/caseReveal");
const UserCaseAttempt = require("../models/userCaseAttemptModel");

exports.getAllCases = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const cases = await CaseStudy.find({ isActive: true })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("title description");

    res.status(200).json({
      success: true,
      data: cases
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startCase = async (req, res) => {
  try {
    const userId = req.user.id;
    const { caseId } = req.params;

    const caseStudy = await CaseStudy.findById(caseId);
    if (!caseStudy || !caseStudy.isActive) {
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

exports.getCurrentQuestion = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await UserCaseAttempt.findById(attemptId);
    if (!attempt || attempt.isCompleted) {
      return res.status(400).json({ message: "Invalid attempt" });
    }

    const question = await CaseQuestion.findOne({
      caseId: attempt.caseId,
      order: attempt.currentQuestion
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.status(200).json({
      success: true,
      data: question
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
      a => a.questionId.toString() === questionId
    );

    if (alreadyAnswered) {
      return res.status(400).json({
        message: "Answer already submitted"
      });
    }

    attempt.answers.push({
      questionId,
      selectedOption
    });

    attempt.currentQuestion += 1;

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Answer saved"
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

    questions.forEach(question => {
      const userAnswer = attempt.answers.find(
        a => a.questionId.toString() === question._id.toString()
      );

      if (
        userAnswer &&
        userAnswer.selectedOption === question.correctOption
      ) {
        score += 2;
      }
    });

    attempt.score = score;
    attempt.isCompleted = true;

    await attempt.save();

    res.status(200).json({
      success: true,
      score,
      retryAvailable: attempt.attemptNumber < 2
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
