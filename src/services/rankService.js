const UserScore = require("../models/UserScore");

/**
 * Recalculate ranks based on hireabilityIndex
 */
async function recalculateRanks() {
  // Fetch all users sorted by hireabilityIndex (DESC)
  const scores = await UserScore.find({})
    .sort({ hireabilityIndex: -1 })
    .select("hireabilityIndex city state country");

  let globalRank = 1;
  const cityMap = {};
  const stateMap = {};
  const countryMap = {};

  for (const score of scores) {
    // -------- Global Rank --------
    score.globalRank = globalRank++;

    // -------- City Rank --------
    if (score.city) {
      cityMap[score.city] = (cityMap[score.city] || 0) + 1;
      score.cityRank = cityMap[score.city];
    }

    // -------- State Rank --------
    if (score.state) {
      stateMap[score.state] = (stateMap[score.state] || 0) + 1;
      score.stateRank = stateMap[score.state];
    }

    // -------- Country Rank --------
    if (score.country) {
      countryMap[score.country] = (countryMap[score.country] || 0) + 1;
      score.countryRank = countryMap[score.country];
    }

    await score.save({ validateBeforeSave: false });
  }
}

module.exports = { recalculateRanks };
