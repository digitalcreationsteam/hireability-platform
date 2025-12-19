const Demographics = require("../models/demographicsModel");

// CREATE or UPDATE (Upsert)
exports.saveDemographics = async (req, res) => {
  try {
    const { userId } = req.body;

    const demographics = await Demographics.findOneAndUpdate(
      { userId },
      {
        ...req.body,
        phoneVisibleToRecruiters: req.body.phoneVisibleToRecruiters ?? false,
      },
      { new: true, upsert: true }
    );

    res.json(demographics);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    await Demographics.findOneAndDelete({
      userId: req.params.userId,
    });

    res.json({ message: "Demographics deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
