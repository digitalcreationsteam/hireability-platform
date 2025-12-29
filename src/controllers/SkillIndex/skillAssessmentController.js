const SkillAssessment = require("../../models/SkillAssessmentModel");
const UserSkill = require("../../models/userDomainSkillModel");
const AssessmentQuestion = require("../../models/mcqQuestionModel");

exports.scheduleAssessment = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    const skills = await UserSkill.find({ userId });
 
    if (skills.length < 3) {
      return res.status(400).json({
        message: "Minimum 3 skills required to schedule assessment",
      });
    }

    const assessment = await SkillAssessment.create({
      userId,
      domain: req.user.primaryDomain,
      scheduledAt: new Date(),
    });

    res.status(201).json({
      success: true,
      assessmentId: assessment._id,
      message: "Skill assessment scheduled successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.startAssessment = async (req, res) => {
  try {
    const assessment = await SkillAssessment.findById(req.params.id);

    if (!assessment || assessment.status !== "scheduled") {
      return res.status(400).json({ message: "Invalid assessment state" });
    }

    const skills = await UserSkill.find({ userId: assessment.userId });

    let questions = [];

    for (const skill of skills) {
      const skillQuestions = await AssessmentQuestion.aggregate([
        { $match: { skillId: skill.skillId } },
        { $sample: { size: 7 } }, // random
      ]);

      questions.push(...skillQuestions);
    }

    assessment.startedAt = new Date();
    assessment.status = "active";
    assessment.totalQuestions = questions.length;
    await assessment.save();

    res.json({
      assessmentId: assessment._id,
      questions: questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.submitAssessment = async (req, res) => {
  try {
    const { answers } = req.body; // [{ questionId, selectedAnswer }]
    const assessment = await SkillAssessment.findById(req.params.id);

    if (!assessment || assessment.status !== "active") {
      return res.status(400).json({ message: "Assessment not active" });
    }

    let totalScore = 0;
    let correct = 0;

    for (const ans of answers) {
      const question = await AssessmentQuestion.findById(ans.questionId);

      if (!question) continue;

      if (question.correctAnswer === ans.selectedAnswer) {
        totalScore += question.weight;
        correct++;
      }
    }

    // Normalize score to 350
    const skillIndexScore = Math.min(350, totalScore);

    // Calculate percentile
    const lowerCount = await SkillAssessment.countDocuments({
      domain: assessment.domain,
      skillIndexScore: { $lt: skillIndexScore },
      status: "completed",
    });

    const totalCount = await SkillAssessment.countDocuments({
      domain: assessment.domain,
      status: "completed",
    });

    const percentile =
      totalCount === 0 ? 100 : ((lowerCount / totalCount) * 100).toFixed(2);

    assessment.correctAnswers = correct;
    assessment.skillIndexScore = skillIndexScore;
    assessment.percentile = percentile;
    assessment.status = "completed";
    assessment.completedAt = new Date();

    await assessment.save();

    res.json({
      success: true,
      skillIndexScore,
      percentile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
