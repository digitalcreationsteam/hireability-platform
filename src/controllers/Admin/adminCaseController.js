const CaseStudy = require("../../models/caseStudyModel");
const CaseOpening = require("../../models/caseOpeningModel");
const CaseQuestion = require("../../models/caseQuestionsModel");
const CaseReveal = require("../../models/caseReveal");
const Domain = require("../../models/domainModel");

// exports.createCaseStudy = async (req, res) => {
//   try {
//     const { title, description, difficulty, maxAttempts } = req.body;

//     const caseStudy = await CaseStudy.create({
//       title,
//       description,
//       difficulty,
//       maxAttempts,
//       isActive: false // draft mode
//     });

//     res.status(201).json({
//       success: true,
//       data: caseStudy
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

exports.createCaseStudy = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      maxAttempts,
      domainId,
      domainName,
      caseCode
    } = req.body;

    // 🔴 Validation
    if (!domainId && !domainName) {
      return res.status(400).json({
        message: "Either domainId or domainName is required",
      });
    }

    let domain;

    // 1️⃣ If domainId is provided → fetch domain
    if (domainId) {
      domain = await Domain.findById(domainId);
      if (!domain) {
        return res.status(404).json({
          message: "Domain not found with given domainId",
        });
      }
    }

    // 2️⃣ If domainName is provided → find or create
    if (!domain && domainName) {
      domain = await Domain.findOne({ name: domainName.trim() });

      if (!domain) {
        domain = await Domain.create({
          name: domainName.trim(),
        });
      }
    }

    // 3️⃣ Create Case Study
    const caseStudy = await CaseStudy.create({
      caseCode,
      title,
      description,
      difficulty,
      maxAttempts,
      domainId: domain._id,
      domainName: domain.name,
      isActive: false, // draft mode
    });

    res.status(201).json({
      success: true,
      data: caseStudy,
    });
  } catch (error) {
    console.error(error);
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

