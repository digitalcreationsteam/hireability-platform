const CaseStudy = require("../../models/caseStudyModel");
const CaseOpening = require("../../models/caseOpeningModel");
const CaseQuestion = require("../../models/caseQuestionsModel");
const CaseReveal = require("../../models/caseReveal");

exports.createCaseStudy = async (req, res) => {
  try {
    const { title, description, difficulty, maxAttempts } = req.body;

    const caseStudy = await CaseStudy.create({
      title,
      description,
      difficulty,
      maxAttempts,
      isActive: false // draft mode
    });

    res.status(201).json({
      success: true,
      data: caseStudy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCaseStudy = async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseStudy = await CaseStudy.findByIdAndUpdate(
      caseId,
      req.body,
      { new: true }
    );

    if (!caseStudy) {
      return res.status(404).json({ message: "Case not found" });
    }

    res.status(200).json({
      success: true,
      data: caseStudy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCaseOpening = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { openingText, year, marketContext } = req.body;

    const opening = await CaseOpening.create({
      caseId,
      openingText,
      year,
      marketContext
    });

    res.status(201).json({
      success: true,
      data: opening
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addCaseQuestion = async (req, res) => {
  try {
    console.log("REQ BODY 👉", req.body); 
    const { caseId } = req.params;
    const {
      order,
      questionText,
      contextText,
      options,
      correctOption
    } = req.body;

    const question = await CaseQuestion.create({
      caseId,
      order,
      questionText,
      contextText,
      options,
      correctOption
    });

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCaseQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await CaseQuestion.findByIdAndUpdate(
      questionId,
      req.body,
      { new: true }
    );

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

exports.createCaseReveal = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { realCompanyName, fullStory, decisionBreakdown } = req.body;

    const reveal = await CaseReveal.create({
      caseId,
      realCompanyName,
      fullStory,
      decisionBreakdown
    });

    res.status(201).json({
      success: true,
      data: reveal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.publishCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseStudy = await CaseStudy.findByIdAndUpdate(
      caseId,
      { isActive: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Case published",
      data: caseStudy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unpublishCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseStudy = await CaseStudy.findByIdAndUpdate(
      caseId,
      { isActive: false },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Case unpublished",
      data: caseStudy
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

