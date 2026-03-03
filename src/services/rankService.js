const UserScore = require("../models/userScoreModel");
const UserDomainSkill = require("../models/userDomainSkillModel");
const WorkExperience = require("../models/workModel");



/**
 * Calculate years of experience from work history
 */
async function calculateYearsOfExperience(userId) {
  try {
    const workExperience = await WorkExperience.find({ userId }).lean();
    if (!workExperience || workExperience.length === 0) return 0;

    let totalMonths = 0;
    const currentDate = new Date();

    workExperience.forEach(job => {
      if (job.startYear) {
        const startDate = new Date(job.startYear, 0);
        const endDate = job.currentlyWorking
          ? currentDate
          : new Date(job.endYear || job.startYear, 11);

        const months =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        totalMonths += Math.max(0, months);
      }
    });

    return Math.round((totalMonths / 12) * 10) / 10;
  } catch (error) {
    console.error("Error calculating years of experience:", error);
    return 0;
  }
}

/**
 * Get cohort from years
 */
function getCohortFromYears(years) {
  if (years < 1) return '0-1';
  if (years < 2) return '1-2';
  if (years < 3) return '2-3';
  if (years < 4) return '3-4';
  if (years < 5) return '4-5';
  return '5+';
}

/**
 * Recalculate all ranks for a specific user - WITHOUT triggering hooks
 */
exports.recalculateAllRanks = async (userId) => {
  try {
    console.log(`Recalculating all ranks for user: ${userId}`);

    const userScore = await UserScore.findOne({ userId });
    if (!userScore) {
      console.log(`No user score found for user: ${userId}`);
      return;
    }

    // Use hireabilityIndex directly from UserScore
    const hireabilityIndex = userScore.hireabilityIndex || 0;
    const yearsOfExperience = await calculateYearsOfExperience(userId);
    const experienceCohort = getCohortFromYears(yearsOfExperience);

    const userDomains = await UserDomainSkill.find({ userId })
      .populate('domainId', 'name');

    // skillScore is now driven by hireabilityIndex
    const domainScores = userDomains.map(ud => ({
      domainId: ud.domainId._id,
      domainName: ud.domainId.name,
      skillScore: hireabilityIndex
    }));

    await UserScore.updateOne(
      { userId },
      {
        $set: {
          yearsOfExperience,
          experienceCohort,
          domainScores
        }
      }
    );

    const updatedUserScore = await UserScore.findOne({ userId });

    if (updatedUserScore.primaryDomain) {
      await exports.recalculateDomainRanks(updatedUserScore.primaryDomain);
    }

    for (const domain of domainScores) {
      await exports.recalculateDomainRanks(domain.domainId);
    }

    if (updatedUserScore.primaryDomain && experienceCohort) {
      await exports.recalculateCohortRanks(
        updatedUserScore.primaryDomain,
        experienceCohort
      );
    }

    console.log(`Rank recalculation completed for user: ${userId}`);
  } catch (error) {
    console.error("Error in rank recalculation:", error);
    throw error;
  }
};

/**
 * Recalculate ranks within a specific domain (all experience levels)
 */
exports.recalculateDomainRanks = async (domainId) => {
  try {
    console.log(`Recalculating domain ranks for domain: ${domainId}`);

    const users = await UserScore.find({
      "domainScores.domainId": domainId
    }).lean();

    const usersWithScores = users.map(user => ({
      userId: user._id,
      score: user.hireabilityIndex || 0,  // ✅ directly from UserScore
      domainScoreIndex: user.domainScores.findIndex(
        ds => ds.domainId.toString() === domainId.toString()
      )
    })).sort((a, b) => b.score - a.score);

    const bulkOps = usersWithScores.map((item, index) => ({
      updateOne: {
        filter: { _id: item.userId },
        update: {
          $set: {
            [`domainScores.${item.domainScoreIndex}.domainRank`]: index + 1
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await UserScore.bulkWrite(bulkOps);
    }

    console.log(`Domain ranks updated for ${bulkOps.length} users`);
  } catch (error) {
    console.error("Error in domain rank recalculation:", error);
    throw error;
  }
};

/**
 * Update domain+cohort specific ranks
 */
async function updateDomainCohortRanks(domainId, cohort) {
  try {
    const users = await UserScore.find({
      "domainScores.domainId": domainId,
      experienceCohort: cohort
    }).lean();

    const usersWithScores = users.map(user => ({
      userId: user._id,
      score: user.hireabilityIndex || 0,  // ✅ directly from UserScore
      domainScoreIndex: user.domainScores.findIndex(
        ds => ds.domainId.toString() === domainId.toString()
      )
    })).sort((a, b) => b.score - a.score);

    const bulkOps = usersWithScores.map((item, index) => ({
      updateOne: {
        filter: { _id: item.userId },
        update: {
          $set: {
            [`domainScores.${item.domainScoreIndex}.domainCohortRank`]: index + 1
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await UserScore.bulkWrite(bulkOps);
    }
  } catch (error) {
    console.error("Error updating domain cohort ranks:", error);
  }
}

/**
 * Helper: calculate percentile correctly
 */
function calculatePercentile(rank, total) {
  if (!total || total <= 0) return 0;
  if (total === 1) return 100;
  return Math.round(((total - rank) / (total - 1)) * 100);
}

/**
 * Recalculate cohort-based ranks for a specific domain + experience cohort
 */
exports.recalculateCohortRanks = async (domainId, cohort) => {
  try {
    console.log(`Recalculating cohort ranks for Domain: ${domainId}, Cohort: ${cohort}`);

    const filter = { primaryDomain: domainId, experienceCohort: cohort };

    /* GLOBAL RANK + PERCENTILE */
    const globalUsers = await UserScore.find(filter)
      .sort({ hireabilityIndex: -1 })
      .lean();

    const globalTotal = globalUsers.length;

    const globalBulkOps = globalUsers.map((user, index) => {
      const rank = index + 1;
      return {
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              globalRank: rank,
              globalPercentile: calculatePercentile(rank, globalTotal)
            }
          }
        }
      };
    });

    if (globalBulkOps.length > 0) await UserScore.bulkWrite(globalBulkOps);

    /* COUNTRY RANK + PERCENTILE */
    const countries = await UserScore.distinct("country", filter);
    for (const country of countries) {
      if (!country) continue;
      const users = await UserScore.find({ ...filter, country })
        .sort({ hireabilityIndex: -1 }).lean();
      const total = users.length;
      const bulkOps = users.map((user, index) => {
        const rank = index + 1;
        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { countryRank: rank, countryPercentile: calculatePercentile(rank, total) } }
          }
        };
      });
      if (bulkOps.length > 0) await UserScore.bulkWrite(bulkOps);
    }

    /* STATE RANK + PERCENTILE */
    const states = await UserScore.distinct("state", filter);
    for (const state of states) {
      if (!state) continue;
      const users = await UserScore.find({ ...filter, state })
        .sort({ hireabilityIndex: -1 }).lean();
      const total = users.length;
      const bulkOps = users.map((user, index) => {
        const rank = index + 1;
        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { stateRank: rank, statePercentile: calculatePercentile(rank, total) } }
          }
        };
      });
      if (bulkOps.length > 0) await UserScore.bulkWrite(bulkOps);
    }

    /* CITY RANK + PERCENTILE */
    const cities = await UserScore.distinct("city", filter);
    for (const city of cities) {
      if (!city) continue;
      const users = await UserScore.find({ ...filter, city })
        .sort({ hireabilityIndex: -1 }).lean();
      const total = users.length;
      const bulkOps = users.map((user, index) => {
        const rank = index + 1;
        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { cityRank: rank, cityPercentile: calculatePercentile(rank, total) } }
          }
        };
      });
      if (bulkOps.length > 0) await UserScore.bulkWrite(bulkOps);
    }

    /* UNIVERSITY RANK + PERCENTILE */
    const universities = await UserScore.distinct("university", filter);
    for (const university of universities) {
      if (!university) continue;
      const users = await UserScore.find({ ...filter, university })
        .sort({ hireabilityIndex: -1 }).lean();
      const total = users.length;
      const bulkOps = users.map((user, index) => {
        const rank = index + 1;
        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { universityRank: rank, universityPercentile: calculatePercentile(rank, total) } }
          }
        };
      });
      if (bulkOps.length > 0) await UserScore.bulkWrite(bulkOps);
    }

    await updateDomainCohortRanks(domainId, cohort);

    console.log(`Cohort ranks completed for ${domainId} - ${cohort}`);
  } catch (error) {
    console.error("Error in cohort rank recalculation:", error);
    throw error;
  }
};

/**
 * Recalculate all ranks for all domains and cohorts
 */
exports.recalculateAllDomainsAndCohorts = async () => {
  try {
    const combinations = await UserScore.aggregate([
      { $match: { primaryDomain: { $ne: null } } },
      { $group: { _id: { domain: "$primaryDomain", cohort: "$experienceCohort" } } }
    ]);

    for (const combo of combinations) {
      if (combo._id.domain && combo._id.cohort) {
        await exports.recalculateCohortRanks(combo._id.domain, combo._id.cohort);
      }
    }

    const domains = await UserScore.distinct("primaryDomain", {
      primaryDomain: { $ne: null }
    });

    for (const domainId of domains) {
      await exports.recalculateDomainRanks(domainId);
    }

    console.log("All domain and cohort ranks recalculated successfully");
  } catch (error) {
    console.error("Error in full recalculation:", error);
    throw error;
  }
};
