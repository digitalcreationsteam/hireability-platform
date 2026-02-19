const UserDomainSkill = require("../../models/userDomainSkillModel");
const UserScore = require("../../models/userScoreModel");
const { recalculateAllRanks } = require("../../services/rankService"); // Import rank service

/**
 * Calculate skill score based on skills array
 */
const calculateSkillScore = (skills) => {
  return (skills?.length || 0) * 10; // Simple scoring - adjust as needed
};

/**
 * Add or update user domain and subdomain
 */
exports.addUserDomainSubDomain = async (req, res) => {
  try {
    const { userId, domainId, subDomainId } = req.body;

    if (!userId || !domainId) {
      return res.status(400).json({
        message: "userId and domainId are required",
      });
    }

    // Get domain details to store name
    const Domain = require("../../models/domainModel");
    const domain = await Domain.findById(domainId);

    if (!domain) {
      return res.status(404).json({
        message: "Domain not found",
      });
    }

    // 1️⃣ Save/Update domain in UserDomainSkill table
    let record;

    if (subDomainId) {
      // If subDomainId provided, check if record exists with this subDomain
      record = await UserDomainSkill.findOneAndUpdate(
        { userId, domainId, subDomainId },
        {
          $set: { domainId, subDomainId },
          $setOnInsert: { skills: [] },
        },
        {
          new: true,
          upsert: true,
        }
      );
    } else {
      // Update or create without subDomain
      record = await UserDomainSkill.findOneAndUpdate(
        { userId, domainId },
        {
          $set: { domainId },
          $setOnInsert: { skills: [] },
        },
        {
          new: true,
          upsert: true,
        }
      );
    }

    // 2️⃣ Check if this should be the primary domain
    // If user has no primary domain yet, set this as primary
    const userScore = await UserScore.findOne({ userId });

    if (!userScore || !userScore.primaryDomain) {
      // This is the first domain, set as primary
      await UserScore.findOneAndUpdate(
        { userId },
        {
          $set: {
            primaryDomain: domainId,
            primaryDomainName: domain.name
          },
          $push: {
            domainScores: {
              domainId: domainId,
              domainName: domain.name,
              skillScore: 0,
              domainRank: null,
              domainCohortRank: null
            }
          }
        },
        { upsert: true }
      );
    } else {
      // Check if this domain already exists in domainScores array
      const existingDomain = userScore.domainScores?.find(
        ds => ds.domainId.toString() === domainId.toString()
      );

      if (!existingDomain) {
        // Add to domainScores array if not exists
        await UserScore.findOneAndUpdate(
          { userId },
          {
            $push: {
              domainScores: {
                domainId: domainId,
                domainName: domain.name,
                skillScore: 0,
                domainRank: null,
                domainCohortRank: null
              }
            }
          }
        );
      }
    }

    // 3️⃣ Trigger rank recalculation for all domains
    await recalculateAllRanks(userId);

    return res.status(200).json({
      message: "Domain saved successfully",
      data: record,
    });

  } catch (err) {
    console.error("Error in addUserDomainSubDomain:", err);
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};

/**
 * Update user domain skills
 */
exports.updateUserDomainSkills = async (req, res) => {
  try {
    const { userId, domainId, skills } = req.body;

    console.log(`[updateUserDomainSkills] Starting update for user: ${userId}, domain: ${domainId}`);
    console.log(`[updateUserDomainSkills] Skills received:`, skills);

    if (!userId || !domainId || !skills) {
      console.log(`[updateUserDomainSkills] Missing required fields:`, { userId, domainId, skills });
      return res.status(400).json({
        message: "userId, domainId, and skills are required"
      });
    }

    console.log(`[updateUserDomainSkills] Updating UserDomainSkill for user: ${userId}, domain: ${domainId}`);

    // Update skills in UserDomainSkill
    const record = await UserDomainSkill.findOneAndUpdate(
      { userId, domainId },
      { $set: { skills } },
      { new: true }
    );

    if (!record) {
      console.log(`[updateUserDomainSkills] No domain record found for user: ${userId}, domain: ${domainId}`);
      return res.status(404).json({
        message: "Domain not found for this user"
      });
    }

    console.log(`[updateUserDomainSkills] UserDomainSkill updated successfully:`, record._id);

    // Get domain details
    console.log(`[updateUserDomainSkills] Fetching domain details for domainId: ${domainId}`);
    const Domain = require("../../models/domainModel");
    const domain = await Domain.findById(domainId);

    if (!domain) {
      console.log(`[updateUserDomainSkills] Domain not found with ID: ${domainId}`);
    } else {
      console.log(`[updateUserDomainSkills] Domain found: ${domain.name}`);
    }

    // Calculate new skill score
    const skillScore = calculateSkillScore(skills);
    console.log(`[updateUserDomainSkills] Calculated skill score: ${skillScore} from ${skills.length} skills`);

    // Update skillScore in UserScore domainScores array
    console.log(`[updateUserDomainSkills] Fetching user score for user: ${userId}`);
    const userScore = await UserScore.findOne({ userId });

    if (userScore) {
      console.log(`[updateUserDomainSkills] User score found. Current domainScores:`, userScore.domainScores?.length || 0);

      const domainIndex = userScore.domainScores?.findIndex(
        ds => ds.domainId.toString() === domainId.toString()
      );

      if (domainIndex !== -1 && domainIndex !== undefined) {
        console.log(`[updateUserDomainSkills] Domain found in domainScores at index: ${domainIndex}`);
        console.log(`[updateUserDomainSkills] Updating existing domain score from ${userScore.domainScores[domainIndex].skillScore} to ${skillScore}`);

        // Update existing domain score
        await UserScore.updateOne(
          { userId, "domainScores.domainId": domainId },
          {
            $set: {
              "domainScores.$.skillScore": skillScore,
              "domainScores.$.domainName": domain?.name
            }
          }
        );
        console.log(`[updateUserDomainSkills] Domain score updated successfully`);
      } else {
        console.log(`[updateUserDomainSkills] Domain not found in domainScores. Adding new entry.`);

        // Add new domain score if not exists
        await UserScore.updateOne(
          { userId },
          {
            $push: {
              domainScores: {
                domainId: domainId,
                domainName: domain?.name,
                skillScore: skillScore,
                domainRank: null,
                domainCohortRank: null
              }
            }
          }
        );
        console.log(`[updateUserDomainSkills] New domain score added successfully`);
      }
    } else {
      console.log(`[updateUserDomainSkills] No user score found for user: ${userId}. Creating new user score.`);

      // Create new user score with this domain
      await UserScore.create({
        userId,
        domainScores: [{
          domainId: domainId,
          domainName: domain?.name,
          skillScore: skillScore,
          domainRank: null,
          domainCohortRank: null
        }]
      });
      console.log(`[updateUserDomainSkills] New user score created with domain`);
    }

    // Trigger rank recalculation
    console.log(`[updateUserDomainSkills] Triggering rank recalculation for user: ${userId}`);
    await recalculateAllRanks(userId);
    console.log(`[updateUserDomainSkills] Rank recalculation completed`);

    console.log(`[updateUserDomainSkills] Update completed successfully for user: ${userId}`);

    res.status(200).json({
      message: "Skills updated successfully",
      data: record,
      skillScore
    });

  } catch (err) {
    console.error(`[updateUserDomainSkills] ERROR:`, err);
    console.error(`[updateUserDomainSkills] Error stack:`, err.stack);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Set primary domain for user
 */
exports.setPrimaryDomain = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { domainId } = req.body;

    if (!userId || !domainId) {
      return res.status(400).json({
        message: "userId and domainId are required"
      });
    }

    // Check if user has this domain
    const userDomain = await UserDomainSkill.findOne({ userId, domainId });

    if (!userDomain) {
      return res.status(404).json({
        message: "Domain not found for this user"
      });
    }

    // Get domain details
    const Domain = require("../../models/domainModel");
    const domain = await Domain.findById(domainId);

    // Update primary domain in UserScore
    await UserScore.findOneAndUpdate(
      { userId },
      {
        $set: {
          primaryDomain: domainId,
          primaryDomainName: domain?.name
        }
      },
      { upsert: true }
    );

    // Trigger rank recalculation
    await recalculateAllRanks(userId);

    return res.status(200).json({
      message: "Primary domain set successfully",
      primaryDomain: {
        id: domainId,
        name: domain?.name
      }
    });

  } catch (err) {
    console.error("Error in setPrimaryDomain:", err);
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message
    });
  }
};

/**
 * Get user domains with skills and rankings
 */
exports.getUserDomainSkills = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(400).json({
        message: "user-id header is required"
      });
    }

    // Get all user domains with skills
    const records = await UserDomainSkill.find({ userId })
      .populate("domainId", "name")
      .populate("subDomainId", "name");

    // Get user score for rankings
    const userScore = await UserScore.findOne({ userId })
      .populate("primaryDomain", "name");

    // Enhance records with ranking data
    const enhancedRecords = records.map(record => {
      const domainScore = userScore?.domainScores?.find(
        ds => ds.domainId?.toString() === record.domainId?._id?.toString()
      );

      return {
        ...record.toObject(),
        rankings: {
          domainRank: domainScore?.domainRank || null,
          domainCohortRank: domainScore?.domainCohortRank || null,
          skillScore: domainScore?.skillScore || 0
        },
        isPrimary: userScore?.primaryDomain?._id?.toString() === record.domainId?._id?.toString()
      };
    });

    res.status(200).json({
      message: "User domains fetched successfully",
      data: enhancedRecords,
      primaryDomain: userScore?.primaryDomain,
      yearsOfExperience: userScore?.yearsOfExperience,
      experienceCohort: userScore?.experienceCohort
    });

  } catch (err) {
    console.error("Error in getUserDomainSkills:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get users by domain
 */
exports.getUsersByDomain = async (req, res) => {
  try {
    const { domainId } = req.params;

    const records = await UserDomainSkill.find({ domainId })
      .populate("userId", "name email")
      .populate("subDomainId", "name");

    // Get rankings for each user
    const enhancedRecords = await Promise.all(
      records.map(async (record) => {
        const userScore = await UserScore.findOne({ userId: record.userId._id });

        const domainScore = userScore?.domainScores?.find(
          ds => ds.domainId?.toString() === domainId
        );

        return {
          ...record.toObject(),
          rankings: {
            domainRank: domainScore?.domainRank || null,
            domainCohortRank: domainScore?.domainCohortRank || null,
            skillScore: domainScore?.skillScore || 0
          },
          yearsOfExperience: userScore?.yearsOfExperience,
          experienceCohort: userScore?.experienceCohort
        };
      })
    );

    res.json({
      message: "Users fetched successfully",
      data: enhancedRecords
    });

  } catch (err) {
    console.error("Error in getUsersByDomain:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete user domain skill
 */
exports.deleteUserDomainSkill = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the record first to get userId and domainId
    const record = await UserDomainSkill.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const { userId, domainId } = record;

    // Delete from UserDomainSkill
    await UserDomainSkill.findByIdAndDelete(id);

    // Remove from UserScore domainScores array
    await UserScore.updateOne(
      { userId },
      {
        $pull: {
          domainScores: { domainId: domainId }
        }
      }
    );

    // Check if this was the primary domain
    const userScore = await UserScore.findOne({ userId });

    if (userScore?.primaryDomain?.toString() === domainId.toString()) {
      // Find another domain to set as primary
      const anotherDomain = await UserDomainSkill.findOne({ userId });

      if (anotherDomain) {
        const Domain = require("../../models/domainModel");
        const newPrimaryDomain = await Domain.findById(anotherDomain.domainId);

        await UserScore.updateOne(
          { userId },
          {
            $set: {
              primaryDomain: anotherDomain.domainId,
              primaryDomainName: newPrimaryDomain?.name
            }
          }
        );
      } else {
        // No domains left, clear primary domain
        await UserScore.updateOne(
          { userId },
          {
            $unset: {
              primaryDomain: 1,
              primaryDomainName: 1
            }
          }
        );
      }
    }

    // Trigger rank recalculation
    await recalculateAllRanks(userId);

    res.json({
      message: "Domain deleted successfully",
      userId
    });

  } catch (err) {
    console.error("Error in deleteUserDomainSkill:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user domain rankings summary
 */
exports.getUserDomainRankings = async (req, res) => {
  try {
    const userId = req.headers["user-id"];

    if (!userId) {
      return res.status(400).json({
        message: "user-id header is required"
      });
    }

    const userScore = await UserScore.findOne({ userId })
      .populate("primaryDomain", "name")
      .populate("domainScores.domainId", "name");

    if (!userScore) {
      return res.status(404).json({
        message: "User score not found"
      });
    }

    const domainRankings = userScore.domainScores?.map(ds => ({
      domainId: ds.domainId?._id,
      domainName: ds.domainName,
      skillScore: ds.skillScore,
      domainRank: ds.domainRank,
      domainCohortRank: ds.domainCohortRank,
      isPrimary: userScore.primaryDomain?._id?.toString() === ds.domainId?._id?.toString()
    }));

    res.status(200).json({
      message: "Domain rankings fetched successfully",
      data: {
        primaryDomain: userScore.primaryDomain,
        yearsOfExperience: userScore.yearsOfExperience,
        experienceCohort: userScore.experienceCohort,
        domainRankings: domainRankings || []
      }
    });

  } catch (err) {
    console.error("Error in getUserDomainRankings:", err);
    res.status(500).json({ error: err.message });
  }
};