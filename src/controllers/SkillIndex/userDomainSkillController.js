const UserDomainSkill = require("../../models/userDomainSkillModel");

// Add and update User Domain & SubDomain
exports.addUserDomainSubDomain = async (req, res) => {
  try {
    const { userId, domainId } = req.body;

    if (!userId || !domainId) {
      return res.status(400).json({
        message: "userId and domainId are required",
      });
    }

    const record = await UserDomainSkill.findOneAndUpdate(
      { userId }, // ✅ match ONLY by user
      {
        $set: {
          domainId,
        },
        $setOnInsert: {
          skills: [],
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    return res.status(200).json({
      message: "Domain saved successfully",
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};



// Update / Add Skills
exports.updateUserDomainSkills = async (req, res) => {
  try {
    const { userId, domainId, skills } = req.body;

    if (!userId || !domainId || !skills) {
      return res.status(400).json({
        message: "userId, domainId, and skills are required"
      });
    }

    const record = await UserDomainSkill.findOneAndUpdate(
      { userId, domainId, },
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



// READ user domains with subdomains & skills
exports.getUserDomainSkills = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(400).json({
        message: "user-id header is required"
      });
    }

    const records = await UserDomainSkill.find({ userId })
      .populate("domainId", "name")
    // .populate("subDomainId", "name");

    res.status(200).json(records);
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

