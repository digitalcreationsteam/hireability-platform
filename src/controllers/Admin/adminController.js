const User = require("../../models/userModel");
const userScoreModel = require("../../models/userScoreModel");
const Demographic = require("../../models/demographicsModel");
const Education = require("../../models/educationModel");

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
// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find().select("-password");

//     res.json({
//       success: true,
//       count: users.length,
//       users,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    const demographics = await Demographic.find().lean();
    const educations = await Education.find().lean();

    const enrichedUsers = users.map((u) => {
      const demo = demographics.find(
        (d) => d.userId?.toString() === u._id.toString()
      );

      const edu = educations.find(
        (e) => e.userId?.toString() === u._id.toString()
      );

      return {
        ...u,
        location: {
          country: demo?.country || null,
          city: demo?.city || null,
          university: edu?.schoolName || null,
        },
      };
    });

    res.json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers,
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


exports.getPayingUsersCount = async (req, res) => {
  try {
    const result = await Subscription.aggregate([
      { $match: { paymentStatus: "success" } },
      { $group: { _id: "$user" } },
      { $count: "payingUsers" },
    ]);

    const count = result.length > 0 ? result[0].payingUsers : 0;

    res.json({
      success: true,
      payingUsers: count,
    });
  } catch (error) {
    console.error("Paying users count error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch paying users",
    });
  }
};