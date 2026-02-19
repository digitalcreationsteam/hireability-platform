const UserScore = require("../models/userScoreModel");
const UserDomainSkill = require("../models/userDomainSkillModel");
const WorkExperience = require("../models/workModel");

/**
 * Calculate skill score based on skills array
 */
function calculateDomainSkillScore(skills) {
  return (skills?.length || 0) * 10;
}

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
        const endDate = job.currentlyWorking ? currentDate : new Date(job.endYear || job.startYear, 11);

        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
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

    // Find the user score document
    const userScore = await UserScore.findOne({ userId });
    if (!userScore) {
      console.log(`No user score found for user: ${userId}`);
      return;
    }

    // Calculate years of experience
    const yearsOfExperience = await calculateYearsOfExperience(userId);
    const experienceCohort = getCohortFromYears(yearsOfExperience);

    // Get all domains this user is associated with
    const userDomains = await UserDomainSkill.find({ userId })
      .populate('domainId', 'name');

    // Calculate domain scores
    const domainScores = userDomains.map(ud => ({
      domainId: ud.domainId._id,
      domainName: ud.domainId.name,
      skillScore: calculateDomainSkillScore(ud.skills)
    }));

    // Update using updateOne to avoid triggering save hooks
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

    // Get the updated document for further operations
    const updatedUserScore = await UserScore.findOne({ userId });

    // Recalculate primary domain ranks if exists
    if (updatedUserScore.primaryDomain) {
      await exports.recalculateDomainRanks(updatedUserScore.primaryDomain);
    }

    // Recalculate all domain-specific ranks
    for (const domain of domainScores) {
      await exports.recalculateDomainRanks(domain.domainId);
    }

    // Recalculate cohort-based ranks for primary domain
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

    // Sort users by their skill score for this domain
    const usersWithScores = users.map(user => {
      const domainScore = user.domainScores.find(
        ds => ds.domainId.toString() === domainId.toString()
      );
      return {
        userId: user._id,
        score: domainScore ? domainScore.skillScore : 0,
        domainScoreIndex: user.domainScores.findIndex(
          ds => ds.domainId.toString() === domainId.toString()
        )
      };
    }).sort((a, b) => b.score - a.score);

    // Update ranks using bulk operations
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

    const usersWithScores = users.map(user => {
      const domainScore = user.domainScores.find(
        ds => ds.domainId.toString() === domainId.toString()
      );
      return {
        userId: user._id,
        score: domainScore ? domainScore.skillScore : 0,
        domainScoreIndex: user.domainScores.findIndex(
          ds => ds.domainId.toString() === domainId.toString()
        )
      };
    }).sort((a, b) => b.score - a.score);

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
 * Recalculate cohort-based ranks for a specific domain + experience cohort
 */
exports.recalculateCohortRanks = async (domainId, cohort) => {
  try {
    console.log(`Recalculating cohort ranks for Domain: ${domainId}, Cohort: ${cohort}`);

    const filter = {
      primaryDomain: domainId,
      experienceCohort: cohort
    };

    /* GLOBAL RANK */
    const globalUsers = await UserScore.find(filter)
      .sort({ hireabilityIndex: -1 })
      .lean();

    const globalBulkOps = globalUsers.map((user, index) => ({
      updateOne: {
        filter: { _id: user._id },
        update: { globalRank: index + 1 }
      }
    }));

    if (globalBulkOps.length > 0) {
      await UserScore.bulkWrite(globalBulkOps);
    }

    /* COUNTRY RANK */
    const countries = await UserScore.distinct("country", filter);

    for (const country of countries) {
      if (!country) continue;

      const countryFilter = { ...filter, country };
      const users = await UserScore.find(countryFilter)
        .sort({ hireabilityIndex: -1 })
        .lean();

      const countryBulkOps = users.map((user, index) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { countryRank: index + 1 }
        }
      }));

      if (countryBulkOps.length > 0) {
        await UserScore.bulkWrite(countryBulkOps);
      }
    }

    /* STATE RANK */
    const states = await UserScore.distinct("state", filter);

    for (const state of states) {
      if (!state) continue;

      const stateFilter = { ...filter, state };
      const users = await UserScore.find(stateFilter)
        .sort({ hireabilityIndex: -1 })
        .lean();

      const stateBulkOps = users.map((user, index) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { stateRank: index + 1 }
        }
      }));

      if (stateBulkOps.length > 0) {
        await UserScore.bulkWrite(stateBulkOps);
      }
    }

    /* CITY RANK */
    const cities = await UserScore.distinct("city", filter);

    for (const city of cities) {
      if (!city) continue;

      const cityFilter = { ...filter, city };
      const users = await UserScore.find(cityFilter)
        .sort({ hireabilityIndex: -1 })
        .lean();

      const cityBulkOps = users.map((user, index) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { cityRank: index + 1 }
        }
      }));

      if (cityBulkOps.length > 0) {
        await UserScore.bulkWrite(cityBulkOps);
      }
    }

    /* UNIVERSITY RANK */
    const universities = await UserScore.distinct("university", filter);

    for (const university of universities) {
      if (!university) continue;

      const universityFilter = { ...filter, university };
      const users = await UserScore.find(universityFilter)
        .sort({ hireabilityIndex: -1 })
        .lean();

      const universityBulkOps = users.map((user, index) => ({
        updateOne: {
          filter: { _id: user._id },
          update: { universityRank: index + 1 }
        }
      }));

      if (universityBulkOps.length > 0) {
        await UserScore.bulkWrite(universityBulkOps);
      }
    }

    // Update domain+cohort specific ranks
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
      {
        $match: { primaryDomain: { $ne: null } }
      },
      {
        $group: {
          _id: {
            domain: "$primaryDomain",
            cohort: "$experienceCohort"
          }
        }
      }
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