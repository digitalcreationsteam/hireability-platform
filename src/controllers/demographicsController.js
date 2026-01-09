const Demographics = require("../models/demographicsModel");
const UserScore = require("../models/userScoreModel");



exports.saveDemographics = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(400).json({ message: "User ID missing in header" });
    }

    const {
      email,
      phoneNumber,
      fullName,
      city,
      state,
      country,
      phoneVisibleToRecruiters,
    } = req.body;

    // 🔒 Manual uniqueness check (for clean error messages)
    if (email) {
      const emailExists = await Demographics.findOne({
        email,
        userId: { $ne: userId },
      });

      if (emailExists) {
        return res.status(409).json({
          message: "Email already in use",
        });
      }
    }

    if (phoneNumber) {
      const phoneExists = await Demographics.findOne({
        phoneNumber,
        userId: { $ne: userId },
      });

      if (phoneExists) {
        return res.status(409).json({
          message: "Phone number already in use",
        });
      }
    }

    // ✅ CREATE OR UPDATE
    const demographics = await Demographics.findOneAndUpdate(
      { userId },
      {
        fullName,
        email,
        phoneNumber,
        city,
        state,
        country,
        phoneVisibleToRecruiters: phoneVisibleToRecruiters ?? false,
      },
      {
        new: true,
        upsert: true,
        runValidators: true, // ⭐ important
      }
    );

    
    await UserScore.findOneAndUpdate(
      { userId },
      {
        city,
        state,
        country,
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      message: "Demographics saved and UserScore location updated",
      data: demographics,
    });
  } catch (err) {
    // 🧠 Mongo duplicate key fallback
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        message: `${field} already exists`,
      });
    }

    res.status(400).json({
      message: err.message,
    });
  }
};

// READ
exports.getDemographicsByUser = async (req, res) => {
  try {
    // Get userId from header
    const userId = req.headers['user-id']; // or 'userid' based on your header key

    if (!userId) {
      return res.status(400).json({ error: "User ID is required in headers" });
    }

    const demographics = await Demographics.findOne({
      userId: userId,
    });

    if (!demographics) {
      return res.status(404).json({ message: "Demographics not found" });
    }

    res.status(200).json(demographics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// DELETE (Optional)
exports.deleteDemographics = async (req, res) => {
  try {
   const userId = req.headers["user-id"];
   await Demographics.findOneAndDelete({userId});
    res.json({ message: "Demographics deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
