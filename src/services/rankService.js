const UserScore = require("../models/userScoreModel");
const UserDomainSkill = require("../models/userDomainSkillModel");
const WorkExperience = require("../models/workModel");

/* =====================================================
   1️⃣ Calculate Years of Experience
===================================================== */
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
    console.error("Error calculating years:", error);
    return 0;
  }
}

/* =====================================================
   2️⃣ Cohort Logic
===================================================== */
function getCohortFromYears(years) {
  if (years < 1) return "0-1";
  if (years < 2) return "1-2";
  if (years < 3) return "2-3";
  if (years < 4) return "3-4";
  if (years < 5) return "4-5";
  return "5+";
}

/* =====================================================
   3️⃣ Percentile Formula (Image Based)
===================================================== */
function calculatePercentile(rank, total) {
  if (!total || total <= 0) return 0;
  if (total === 1) return 100;
  return Math.round(((total - rank) / (total - 1)) * 100);
}

/* =====================================================
   4️⃣ Generic Rank Updater
===================================================== */
async function updateRankAndPercentile(users, rankField, percentileField) {
  const total = users.length;

  const bulkOps = users.map((user, index) => {
    const rank = index + 1;
    const percentile = calculatePercentile(rank, total);

    return {
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            [rankField]: rank,
            [percentileField]: percentile
          }
        }
      }
    };
  });

  if (bulkOps.length > 0) {
    await UserScore.bulkWrite(bulkOps);
  }
}

/* =====================================================
   5️⃣ IMAGE STYLE RANKING SYSTEM
===================================================== */
exports.recalculateImageStyleRanks = async (domainId) => {
  try {
    console.log(`Recalculating ranks for domain: ${domainId}`);

    /* -----------------------------
       GLOBAL RANK (Domain Only)
    ------------------------------ */
    const globalUsers = await UserScore.find({
      primaryDomain: domainId
    }).sort({ hireabilityIndex: -1 }).lean();

    await updateRankAndPercentile(
      globalUsers,
      "globalRank",
      "globalPercentile"
    );

    /* -----------------------------
       COUNTRY RANK
    ------------------------------ */
    const countries = await UserScore.distinct("country", {
      primaryDomain: domainId
    });

    for (const country of countries) {
      const users = await UserScore.find({
        primaryDomain: domainId,
        country
      }).sort({ hireabilityIndex: -1 }).lean();

      await updateRankAndPercentile(
        users,
        "countryRank",
        "countryPercentile"
      );
    }

    /* -----------------------------
       CITY RANK
    ------------------------------ */
    const cities = await UserScore.distinct("city", {
      primaryDomain: domainId
    });

    for (const city of cities) {
      const users = await UserScore.find({
        primaryDomain: domainId,
        city
      }).sort({ hireabilityIndex: -1 }).lean();

      await updateRankAndPercentile(
        users,
        "cityRank",
        "cityPercentile"
      );
    }

    /* -----------------------------
       UNIVERSITY RANK
    ------------------------------ */
    const universities = await UserScore.distinct("university", {
      primaryDomain: domainId
    });

    for (const university of universities) {
      const users = await UserScore.find({
        primaryDomain: domainId,
        university
      }).sort({ hireabilityIndex: -1 }).lean();

      await updateRankAndPercentile(
        users,
        "universityRank",
        "universityPercentile"
      );
    }

    /* -----------------------------
       COHORT RANK
    ------------------------------ */
    const cohorts = await UserScore.distinct("experienceCohort", {
      primaryDomain: domainId
    });

    for (const cohort of cohorts) {
      const users = await UserScore.find({
        primaryDomain: domainId,
        experienceCohort: cohort
      }).sort({ hireabilityIndex: -1 }).lean();

      await updateRankAndPercentile(
        users,
        "cohortRank",
        "cohortPercentile"
      );
    }

    console.log("Ranking completed successfully");
  } catch (error) {
    console.error("Ranking error:", error);
    throw error;
  }
};

/* =====================================================
   6️⃣ Update User Experience + Trigger Ranking
===================================================== */
exports.recalculateUserAndRanks = async (userId) => {
  try {
    const userScore = await UserScore.findOne({ userId });
    if (!userScore) return;

    const years = await calculateYearsOfExperience(userId);
    const cohort = getCohortFromYears(years);

    await UserScore.updateOne(
      { userId },
      {
        $set: {
          yearsOfExperience: years,
          experienceCohort: cohort
        }
      }
    );

    if (userScore.primaryDomain) {
      await exports.recalculateImageStyleRanks(userScore.primaryDomain);
    }

  } catch (error) {
    console.error("User rank update error:", error);
  }
};

/* =====================================================
   7️⃣ Full System Recalculation (All Domains)
===================================================== */
exports.recalculateAllDomains = async () => {
  try {
    const domains = await UserScore.distinct("primaryDomain", {
      primaryDomain: { $ne: null }
    });

    for (const domainId of domains) {
      await exports.recalculateImageStyleRanks(domainId);
    }

    console.log("All domains ranking completed");
  } catch (error) {
    console.error("Full recalculation error:", error);
  }
};