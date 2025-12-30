const UserDomainSkill = require("../../models/userDomainSkillModel");

// Add User Domain & SubDomain
exports.addUserDomainSubDomain = async (req, res) => {
  try {
    const { userId, domainId, subDomainId } = req.body;

    if (!userId || !domainId || !subDomainId) {
      return res.status(400).json({
        message: "userId, domainId and subDomainId are required"
      });
    }

    const exists = await UserDomainSkill.findOne({
      userId,
      domainId,
      subDomainId
    });

    if (exists) {
      return res.status(409).json({
        message: "Domain & SubDomain already added for this user"
      });
    }

    const record = await UserDomainSkill.create({
      userId,
      domainId,
      subDomainId,
      skills: [] // initialize empty
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// Update / Add Skills
exports.updateUserDomainSkills = async (req, res) => {
  try {
    const { userId, domainId, subDomainId, skills } = req.body;

    if (!userId || !domainId || !subDomainId || !skills) {
      return res.status(400).json({
        message: "userId, domainId, subDomainId and skills are required"
      });
    }

    const record = await UserDomainSkill.findOneAndUpdate(
      { userId, domainId, subDomainId },
      { $set: { skills } },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({
        message: "Domain & SubDomain not found for this user"
      });
    }

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
