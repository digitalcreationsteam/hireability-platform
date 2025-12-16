const UserDomainSkill = require("../../models/userDomainSkillModel");

// CREATE or UPDATE (Upsert)
exports.saveUserDomainSkill = async (req, res) => {
  try {
    const { userId, domainId, skills } = req.body;

    const record = await UserDomainSkill.findOneAndUpdate(
      { userId, domainId },
      { skills },
      { new: true, upsert: true }
    );

    res.status(200).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ by user
exports.getUserDomainSkills = async (req, res) => {
  try {
    const { userId } = req.params;

    const records = await UserDomainSkill.find({ userId })
      .populate("domainId", "name");

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ by domain
exports.getUsersByDomain = async (req, res) => {
  try {
    const { domainId } = req.params;

    const records = await UserDomainSkill.find({ domainId })
      .populate("userId", "name email");

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteUserDomainSkill = async (req, res) => {
  try {
    await UserDomainSkill.findByIdAndDelete(req.params.id);
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
