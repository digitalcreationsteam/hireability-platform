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

exports.addUniversity = async (req, res) => {
  try {
    const {
      name,
      country,
      countryCode,
      alphaTwoCode,
      stateProvince,
      domains,
      webPages
    } = req.body;

    // 1️⃣ Basic validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "University name is required"
      });
    }

    // 2️⃣ Normalize name for search
    const normalizedName = name.trim().toLowerCase();

    // 3️⃣ Check duplicate university
    const existingUniversity = await University.findOne({ normalizedName });

    if (existingUniversity) {
      return res.status(400).json({
        success: false,
        message: "University already exists"
      });
    }

    // 4️⃣ Create university
    const university = await University.create({
      name: name.trim(),
      normalizedName,
      country,
      countryCode,
      alphaTwoCode,
      stateProvince,
      domains,
      webPages
    });

    res.status(201).json({
      success: true,
      message: "University added successfully",
      data: university
    });

  } catch (error) {
    console.error("❌ ADD UNIVERSITY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to add university"
    });
  }
};