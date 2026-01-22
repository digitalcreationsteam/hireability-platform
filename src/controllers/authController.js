// controllers/authController.js - FIXED VERSION

const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const Demographics = require("../models/demographicsModel");
const Education = require("../models/educationModel");
const Experience = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");
const Domain = require("../models/domainModel");
const UserDomainSkill = require("../models/userDomainSkillModel");
const SkillAssessment = require("../models/SkillAssessmentModel");
const Subscription = require("../models/subscriptionModel");
const verifyEmailTemplate = require("../utils/verifyEmail");
// ============================================
// STEP SEQUENCE - ONLY REAL DATA STEPS
// ============================================
// REMOVED: skill-index-intro, assessment-intro (frontend-only)
// These are auto-skipped, not tracked in database
const STEP_SEQUENCE = [
  "demographics",
  "education",
  "experience",
  "certifications",
  "awards",
  "projects",
  "paywall",
  "job-domain",
  "skills",
  "assessment",
  "assessment-results",
];

// ============================================
// FRONTEND-ONLY STEPS (auto-skipped)
// ============================================
const FRONTEND_ONLY_STEPS = ["skill-index-intro", "assessment-intro"];

// ============================================
// HELPER: Get completion status from database
// ============================================
const getCompletionStatus = async (userId) => {
  try {
    const [
      demographics,
      education,
      experience,
      certifications,
      awards,
      projects,
      subscription,
      userDomainSkill,
      assessment,
    ] = await Promise.all([
      Demographics.findOne({ userId }).lean(),
      Education.findOne({ userId }).lean(),
      Experience.findOne({ userId }).lean(),
      Certification.findOne({ userId }).lean(),
      Award.findOne({ userId }).lean(),
      Project.findOne({ userId }).lean(),
      Subscription.findOne({ user: userId, status: "active" }).lean(),
      UserDomainSkill.findOne({ userId }).lean(), // ✅ Check UserDomainSkill
      SkillAssessment.findOne({ userId }).lean(),
    ]);

    console.log("📊 Completion Status Debug:", {
      demographics: !!demographics?._id,
      education: !!education?._id,
      experience: !!experience?._id,
      certifications: !!certifications?._id,
      awards: !!awards?._id,
      projects: !!projects?._id,
      paywall: !!subscription?._id,
      "job-domain": !!userDomainSkill?._id && !!userDomainSkill?.domainId && !!userDomainSkill?.subDomainId,
      skills: (userDomainSkill?.skills?.length || 0) > 0,
      assessment: !!assessment?.startedAt && !assessment?.completedAt,
      "assessment-results": !!assessment?.completedAt,
    });

    return {
      demographics: !!demographics?._id,
      education: !!education?._id,
      experience: !!experience?._id,
      certifications: !!certifications?._id,
      awards: !!awards?._id,
      projects: !!projects?._id,
      paywall: !!subscription?._id, // ✅ Mark paywall complete if subscription exists
      "job-domain": !!userDomainSkill?._id && !!userDomainSkill?.domainId && !!userDomainSkill?.subDomainId, // ✅ Check UserDomainSkill
      skills: (userDomainSkill?.skills?.length || 0) > 0, // ✅ Check skills array in UserDomainSkill
      assessment: !!assessment?.startedAt && !assessment?.completedAt,
      "assessment-results": !!assessment?.completedAt,
    };
  } catch (error) {
    console.error("❌ Error getting completion status:", error);
    return {};
  }
};

// ============================================
// HELPER: Calculate navigation from status
// ============================================
const calculateNavigation = (completionStatus) => {
  // Find first incomplete step (only from STEP_SEQUENCE)
  const currentStep =
    STEP_SEQUENCE.find((step) => !completionStatus[step]) ||
    "assessment-results";

  // Get all completed steps
  const completedSteps = STEP_SEQUENCE.filter(
    (step) => completionStatus[step]
  );

  // Map steps to routes
  const stepToRoute = {
    demographics: "/demographics",
    education: "/education",
    experience: "/experience",
    certifications: "/certifications",
    awards: "/awards",
    projects: "/projects",
    paywall: "/paywall",
    "job-domain": "/job-domain",
    skills: "/skills",
    assessment: "/assessment",
    "assessment-results": "/assessment-results",
  };

  // ✅ Handle frontend-only steps
  let nextRoute = stepToRoute[currentStep];

  // If next step is paywall and it's completed, skip to job-domain
  if (currentStep === "paywall" && completionStatus.paywall) {
    nextRoute = "/job-domain";
  }

  // If next step is job-domain and it's completed, skip to skills
  if (currentStep === "job-domain" && completionStatus["job-domain"]) {
    nextRoute = "/skills";
  }

  // If next step is skills and it's completed, skip to assessment
  if (currentStep === "skills" && completionStatus.skills) {
    nextRoute = "/assessment";
  }

  return {
    nextRoute: nextRoute || "/demographics",
    currentStep,
    completedSteps,
    isOnboardingComplete:
      currentStep === "assessment-results" &&
      completionStatus["assessment-results"],
    hasPayment: completionStatus.paywall || false,
  };
};

// ============================================
// LOGIN - Returns navigation info
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Get completion status
    const completionStatus = await getCompletionStatus(user._id);

    // Calculate navigation
    const navigation = calculateNavigation(completionStatus);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      navigation: {
        nextRoute: navigation.nextRoute,
        currentStep: navigation.currentStep,
        completedSteps: navigation.completedSteps,
        isOnboardingComplete: navigation.isOnboardingComplete,
        hasPayment: navigation.hasPayment,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ============================================
// GET USER STATUS - Called after saving steps
// ============================================
exports.getUserStatus = async (req, res) => {
  try {
    // Get userId from auth middleware
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - User not found",
      });
    }

    console.log("🔍 getUserStatus called for userId:", userId);

    // Get completion status
    const completionStatus = await getCompletionStatus(userId);
    console.log("📊 Completion status:", completionStatus);

    // Calculate navigation
    const navigation = calculateNavigation(completionStatus);
    console.log("🧭 Navigation:", navigation);

    res.status(200).json({
      success: true,
      navigation: {
        nextRoute: navigation.nextRoute,
        currentStep: navigation.currentStep,
        completedSteps: navigation.completedSteps,
        isOnboardingComplete: navigation.isOnboardingComplete,
        hasPayment: navigation.hasPayment,
      },
    });
  } catch (error) {
    console.error("❌ getUserStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user status",
    });
  }
};

// ============================================
// VERIFY ROUTE - Optional security check
// ============================================
exports.verifyRouteEndpoint = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const requestedRoute = req.body.route;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!requestedRoute) {
      return res.status(400).json({
        success: false,
        message: "Route parameter required",
      });
    }

    const completionStatus = await getCompletionStatus(userId);
    const navigation = calculateNavigation(completionStatus);

    const isAllowed = navigation.nextRoute === requestedRoute;

    res.status(200).json({
      success: true,
      allowed: isAllowed,
      nextRoute: navigation.nextRoute,
      currentStep: navigation.currentStep,
    });
  } catch (error) {
    console.error("❌ verifyRouteEndpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Route verification failed",
    });
  }
};

// ============================================
// SIGNUP
// ============================================
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      firstname,
      lastname,
      email,
      password,
      role: role || "student",
      isVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpire: Date.now() + 15 * 60 * 1000,
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your email address",
      html: verifyEmailTemplate({ firstname, verifyUrl }),
    });

    res.status(201).json({
      success: true,
      message: "Signup successful. Please verify your email.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// VERIFY EMAIL
// ============================================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: "Email already verified",
      });
    }

    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error("❌ Verify email error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");

    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your email (Resent)",
      html: `<a href="${verifyUrl}">Verify Email</a>`,
    });

    res.json({ success: true, message: "Verification email resent" });
  } catch (err) {
    console.error("❌ Resend verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// LOGOUT
// ============================================
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// EXPORT HELPERS (for testing/reuse)
// ============================================
exports.getCompletionStatus = getCompletionStatus;
exports.calculateNavigation = calculateNavigation;