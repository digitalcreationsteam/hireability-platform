const SkillAssessment = require("../../models/SkillAssessmentModel");
const UserSkill = require("../../models/userDomainSkillModel");

exports.scheduleAssessment = async (req, res) => {
  try {
    const userId = req.user._id;

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
