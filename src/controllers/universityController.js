const University = require("../models/universityModel");


exports.searchUniversities = async (req, res) => {
  try {
     
    const Universities = await University.find().lean();

    res.status(200).json({
      success: true,
      count: Universities.length,
      data: Universities,
    });
  } catch (error) {
    console.error("❌ GET PLANS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch plans",
    });
  }
};

