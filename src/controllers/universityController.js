const University = require("../models/universityModel");

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.searchUniversities = async (req, res) => {
  try {
    const query = (req.query.query || "").trim();
    const country = (req.query.country || "").trim(); // optional
    const limit = Math.min(Number(req.query.limit || 20), 60);

    const filter = {};
    if (country) filter.country = country;

    // if user typed nothing, return empty list (avoid returning thousands)
    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // case-insensitive prefix search for safety and performance
    filter.name = { $regex: `^${escapeRegex(query)}`, $options: "i" };

    const data = await University.find(filter)
      .select("name country state city website")
      .limit(limit)
      .sort({ name: 1 });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to search universities",
    });
  }
};
