const testAttemptModel = require("../../models/testAttemptModel");
const userCaseAttemptModel = require("../../models/userCaseAttemptModel");
const User = require("../../models/userModel");
const userScoreModel = require("../../models/userScoreModel");
const Subscription = require("../../models/subscriptionModel");


// ===============================
// ADMIN DASHBOARD
// ===============================
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: "student" });
    const recruiters = await User.countDocuments({ role: "recruiter" });
    const admins = await User.countDocuments({ role: "admin" });

    res.json({
      success: true,
      data: {
        totalUsers,
        students,
        recruiters,
        admins,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET ALL USERS
// ===============================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET USER BY ID
// ===============================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// UPDATE USER ROLE
// ===============================
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["student", "recruiter", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Role updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// DELETE USER
// ===============================
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// PLATFORM STATS
// ===============================
exports.getPlatformStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ranking Controller
exports.getUserScoreByUserId = async (req, res) => {
 try {
    let { rankType, page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Validate rankType
    const validRanks = ["global", "country", "state", "city", "all"];
    if (!rankType || !validRanks.includes(rankType)) {
      rankType = "all"; // default to all ranks
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Fetch students with pagination
    const students = await userScoreModel.find()
      .populate("userId", "name email") // include user info
      .skip(skip)
      .limit(limit)
      .lean(); // lean returns plain JS objects for easier manipulation

    // Map ranks based on filter
    const filteredStudents = students.map((student) => {
      const rankData = {};
      if (rankType === "all") {
        rankData.globalRank = student.globalRank;
        rankData.countryRank = student.countryRank;
        rankData.stateRank = student.stateRank;
        rankData.cityRank = student.cityRank;
      } else if (rankType === "global") {
        rankData.globalRank = student.globalRank;
      } else if (rankType === "country") {
        rankData.countryRank = student.countryRank;
      } else if (rankType === "state") {
        rankData.stateRank = student.stateRank;
      } else if (rankType === "city") {
        rankData.cityRank = student.cityRank;
      }

      return {
        userId: student.userId,
        rank: rankData
      };
    });

    // Total count for pagination
    const total = await userScoreModel.countDocuments();

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalStudents: total,
      students: filteredStudents
    });
  } catch (error) {
    console.error("Error fetching student ranks:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// get student count
exports.getStudentCount = async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: "student" });

    res.status(200).json({
      success: true,
      data: {
        students: studentCount,
      },
    });
  } catch (error) {
    console.error("Student Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// get recruiter count
// @desc    Get recruiter count
// @route   GET /api/admin/recruiter-count
// @access  Admin
exports.getRecruiterCount = async (req, res) => {
  try {
    const recruiterCount = await User.countDocuments({ role: "recruiter" });

    res.status(200).json({
      success: true,
      data: {
        recruiters: recruiterCount,
      },
    });
  } catch (error) {
    console.error("Recruiter Count Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.totalUser = async (req, res) => {
    try {
    const totalUsers = await User.countDocuments();
    const studentCount = await User.countDocuments({ role: "student" });
    const recruiterCount = await User.countDocuments({ role: "recruiter" });
    const adminCount = await User.countDocuments({ role: "admin" });

    res.status(200).json({
      success: true,
      totalUsers,
      studentCount,
      recruiterCount,
      adminCount,
    });
  } catch (error) {
    console.error("Error getting user count:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

exports.getUserAssessmentData = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    // 1️⃣ Validate user exists
    const user = await User.findById(userId).select(
      "firstname lastname email role createdAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 2️⃣ Case study attempts
    const caseAttempts = await userCaseAttemptModel.find({ userId })
      .populate("caseId", "title caseCode totalQuestions maxAttempts")
      .sort({ createdAt: -1 });

    // 3️⃣ Test / assessment attempts
    const testAttempts = await testAttemptModel.find({ userId })
      .populate("domainId", "name")
      .populate("subDomainId", "name")
      .populate("questions.questionId", "question difficulty")
      .sort({ createdAt: -1 });

    // 4️⃣ Final response
    return res.status(200).json({
      success: true,
      data: {
        user,
        caseStudies: caseAttempts,
        assessments: testAttempts
      }
    });

  } catch (error) {
    console.error("getUserAssessmentData error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getAvgCaseStudiesPerUser = async (req, res) => {
  try {
    const result = await userCaseAttemptModel.aggregate([
      {
        $group: {
          _id: "$userId",
          totalAttempts: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalAttempts: { $sum: "$totalAttempts" }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          totalAttempts: 1,
          avgCaseStudiesPerUser: {
            $round: [
              { $divide: ["$totalAttempts", "$totalUsers"] },
              2
            ]
          }
        }
      }
    ]);

    if (!result.length) {
      return res.json({
        totalUsers: 0,
        totalAttempts: 0,
        avgCaseStudiesPerUser: 0
      });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAvgCaseStudiesCompletedPerUser = async (req, res) => {
  try {
    const result = await userCaseAttemptModel.aggregate([
      {
        $match: { isCompleted: true }
      },
      {
        $group: {
          _id: "$userId",
          completedCases: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalCompletedCases: { $sum: "$completedCases" },
          totalUsers: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          averageCompletedPerUser: {
            $cond: [
              { $eq: ["$totalUsers", 0] },
              0,
              { $divide: ["$totalCompletedCases", "$totalUsers"] }
            ]
          },
          totalCompletedCases: 1,
          totalUsers: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: result[0] || {
        averageCompletedPerUser: 0,
        totalCompletedCases: 0,
        totalUsers: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getCaseCompletionRate = async (req, res) => {
  try {
    const stats = await userCaseAttemptModel.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: {
              $cond: [{ $eq: ["$isCompleted", true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalAttempts: 1,
          completedAttempts: 1,
          completionRate: {
            $cond: [
              { $eq: ["$totalAttempts", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$completedAttempts", "$totalAttempts"] },
                  100
                ]
              }
            ]
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalAttempts: 0,
        completedAttempts: 0,
        completionRate: 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAvgTimeSpentPerCase = async (req, res) => {
  try {
    const result = await userCaseAttemptModel.aggregate([
      {
        $match: {
          isCompleted: true
        }
      },
      {
        $project: {
          caseId: 1,
          timeSpentMs: {
            $subtract: ["$updatedAt", "$createdAt"]
          }
        }
      },
      {
        $group: {
          _id: "$caseId",
          avgTimeMs: { $avg: "$timeSpentMs" },
          completedAttempts: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          caseId: "$_id",
          avgTimeMs: 1,
          avgTimeMinutes: {
            $round: [{ $divide: ["$avgTimeMs", 60000] }, 2]
          },
          completedAttempts: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getCaseDropOffPoints = async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await userCaseAttemptModel.aggregate([
      {
        $match: {
          caseId: new require("mongoose").Types.ObjectId(caseId),
          isCompleted: false
        }
      },
      {
        $group: {
          _id: "$currentQuestion",
          dropOffCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          questionNumber: "$_id",
          dropOffCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      caseId,
      dropOffPoints: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getTotalPayingUsers = async (req, res) => {
  try {
    const now = new Date();

    const result = await Subscription.aggregate([
      {
        $match: {
          status: "active",
          paymentStatus: "success",
          $or: [
            { currentPeriodEnd: null }, // one-time or lifetime
            { currentPeriodEnd: { $gte: now } }
          ]
        }
      },
      {
        $group: {
          _id: "$user" // 🔥 unique users
        }
      },
      {
        $count: "totalPayingUsers"
      }
    ]);

    res.status(200).json({
      success: true,
      totalPayingUsers: result[0]?.totalPayingUsers || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDailyActiveUsers = async (req, res) => {
  try {
    // 📅 Start & End of Today (server timezone)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1️⃣ Get active users from tests
    const testUsers = await testAttemptModel.distinct("userId", {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 2️⃣ Get active users from case studies
    const caseUsers = await userCaseAttemptModel.distinct("userId", {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 3️⃣ Merge & deduplicate users
    const uniqueUsers = new Set([
      ...testUsers.map(id => id.toString()),
      ...caseUsers.map(id => id.toString())
    ]);

    res.status(200).json({
      success: true,
      dailyActiveUsers: uniqueUsers.size,
      date: startOfDay.toISOString().split("T")[0]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getMonthlyActiveUsers = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Users active in tests
    const testUsers = await testAttemptModel.distinct("userId", {
      createdAt: { $gte: startDate }
    });

    // Users active in case studies
    const caseUsers = await userCaseAttemptModel.distinct("userId", {
      createdAt: { $gte: startDate }
    });

    // Merge & deduplicate
    const uniqueUsers = new Set([
      ...testUsers.map(id => id.toString()),
      ...caseUsers.map(id => id.toString())
    ]);

    res.status(200).json({
      success: true,
      monthlyActiveUsers: uniqueUsers.size,
      period: "last_30_days"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getNewUsersToday = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    res.status(200).json({
      success: true,
      newUsersToday,
      date: startOfDay.toISOString().split("T")[0]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getConversionFunnel = async (req, res) => {
  try {
    // STEP 1: Signup (Landing → Signup)
    const totalUsers = await User.countDocuments();

    // STEP 2: Skill Assessment Started
    const assessmentStartedUsers =
      await testAttemptModel.distinct("userId");

    // STEP 3: Skill Assessment Completed
    const assessmentCompletedUsers =
      await testAttemptModel.distinct("userId", {
        status: "completed",
      });

    // STEP 4: Case Study Started
    const caseStudyStartedUsers =
      await userCaseAttemptModel.distinct("userId");

    // Conversion helper
    const rate = (next, current) =>
      current === 0 ? 0 : Number(((next / current) * 100).toFixed(2));

    res.status(200).json({
      success: true,
      funnel: {
        signup: {
          users: totalUsers,
          conversionToAssessmentStart: rate(
            assessmentStartedUsers.length,
            totalUsers
          ),
        },
        assessmentStarted: {
          users: assessmentStartedUsers.length,
          conversionToAssessmentComplete: rate(
            assessmentCompletedUsers.length,
            assessmentStartedUsers.length
          ),
        },
        assessmentCompleted: {
          users: assessmentCompletedUsers.length,
          conversionToCaseStudy: rate(
            caseStudyStartedUsers.length,
            assessmentCompletedUsers.length
          ),
        },
        caseStudyStarted: {
          users: caseStudyStartedUsers.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


