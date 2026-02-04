// controllers/authController.js - FIXED VERSION

const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const UserDocument = require("../models/userDocumentModel");
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
  "paywall",
  "resume",
  "demographics",
  "education",
  "experience",
  "certifications",
  "awards",
  "projects",
  "job-domain",
  "skills",
  "assessment",
  "assessment-results",
];

// ============================================
// FRONTEND-ONLY STEPS (auto-skipped)
// ============================================
const FRONTEND_ONLY_STEPS = [
  "talent-ranking-intro",
  "skill-index-intro",
  "assessment-intro",
];

// ============================================
// HELPER: Get completion status from database
// ============================================
const getCompletionStatus = async (userId) => {
  const [
    userDocument, //for resume
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
    UserDocument.findOne({ userId }), //for resume
    Demographics.findOne({ userId }),
    Education.findOne({ userId }),
    Experience.findOne({ userId }),
    Certification.findOne({ userId }),
    Award.findOne({ userId }),
    Project.findOne({ userId }),
    Subscription.findOne({ user: userId, status: "active" }),
    UserDomainSkill.findOne({ userId }),
    SkillAssessment.findOne({ userId }),
  ]);

  return {
    paywall: !!subscription, // ✅ THIS IS THE KEY
    resume: !!userDocument?.resumeUrl,
    demographics: !!demographics,
    education: !!education,
    experience: !!experience,
    certifications: !!certifications,
    awards: !!awards,
    projects: !!projects,
    // "job-domain": !!userDomainSkill?.domainId && !!userDomainSkill?.subDomainId,
    "job-domain": !!userDomainSkill?.domainId,

    skills: (userDomainSkill?.skills?.length || 0) > 0,
    assessment: !!assessment?.startedAt && !assessment?.completedAt,
    "assessment-results": !!assessment?.completedAt,
  };
};

// ================= NAVIGATION =================
// const calculateNavigation = (status) => {
//   const currentStep =
//     STEP_SEQUENCE.find((step) => !status[step]) || "assessment-results";

//   const stepToRoute = {
//     paywall: "/paywall",
//     resume: "/upload-resume",
//     demographics: "/demographics",
//     education: "/education",
//     experience: "/experience",
//     certifications: "/certifications",
//     awards: "/awards",
//     projects: "/projects",
//     "job-domain": "/job-domain",
//     skills: "/skills",
//     assessment: "/assessment",
//     "assessment-results": "/assessment-results",
//   };

//   let nextRoute = stepToRoute[currentStep];

//   // if (currentStep === "paywall" && status.paywall) {
//   //   nextRoute = "/job-domain";
//   // }

//   if (currentStep === "job-domain" && status["job-domain"]) {
//     nextRoute = "/skills";
//   }

//   if (currentStep === "skills" && status.skills) {
//     nextRoute = "/assessment";
//   }

//   return {
//     nextRoute,
//     currentStep,
//     completedSteps: STEP_SEQUENCE.filter((s) => status[s]),
//     hasPayment: status.paywall,
//     isOnboardingComplete:
//       currentStep === "assessment-results" &&
//       status["assessment-results"],
//   };
// };

const calculateNavigation = (status) => {
  // ✅ HARD STOP: onboarding fully completed
  if (status["assessment-results"]) {
    return {
      nextRoute: "/dashboard",
      currentStep: "completed",
      completedSteps: STEP_SEQUENCE,
      hasPayment: status.paywall,
      isOnboardingComplete: true,
    };
  }

  // ✅ Normal onboarding flow
  const currentStep = STEP_SEQUENCE.find((step) => !status[step]);

  const stepToRoute = {
    paywall: "/paywall",
    resume: "/upload-resume",
    demographics: "/demographics",
    education: "/education",
    experience: "/experience",
    certifications: "/certifications",
    awards: "/awards",
    projects: "/projects",
    "job-domain": "/job-domain",
    skills: "/skills",
    assessment: "/assessment",
    "assessment-results": "/assessment-results",
  };

  return {
    nextRoute: stepToRoute[currentStep],
    currentStep,
    completedSteps: STEP_SEQUENCE.filter((s) => status[s]),
    hasPayment: status.paywall,
    isOnboardingComplete: false,
  };
};

// ================= GET USER STATUS =================
exports.getUserStatus = async (req, res) => {
  const userId = req.user._id;

  const status = await getCompletionStatus(userId);
  const navigation = calculateNavigation(status);

  res.status(200).json({
    success: true,
    navigation,
  });
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
exports.checkEmailVerification = async (req, res) => {
  try {
    // req.user is set by auth middleware (JWT)
    const user = await User.findById(req.user.id).select("isVerified");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      userId:user.id,
      isVerified: user.isVerified,
    });
  } catch (err) {
    console.error("❌ Check verification error:", err);
    res.status(500).json({ message: "Server error" });
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

    // 🚫 Block onboarding routes once completed
    if (navigation.isOnboardingComplete) {
      return res.status(200).json({
        success: true,
        allowed: requestedRoute === "/dashboard",
        nextRoute: "/dashboard",
        currentStep: "completed",
      });
    }

    // const isAllowed = navigation.nextRoute === requestedRoute;

    const currentRoute =
      navigation.currentStep && navigation.currentStep !== "completed"
        ? `/${navigation.currentStep}`
        : null;

    const allowedRoutes = [navigation.nextRoute, currentRoute].filter(Boolean);

    const isAllowed = allowedRoutes.includes(requestedRoute);

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
// exports.signup = async (req, res) => {
//   try {
//     const { firstname, lastname, email, password, role } = req.body;

//     if (!firstname || !lastname || !email || !password) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(409).json({ message: "Email already registered" });
//     }

//     const verifyToken = crypto.randomBytes(32).toString("hex");

//     const user = await User.create({
//       firstname,
//       lastname,
//       email,
//       password,
//       role: role || "student",
//       isVerified: false,
//       emailVerifyToken: verifyToken,
//       emailVerifyExpire: Date.now() + 15 * 60 * 1000,
//     });

//     const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;

//     await sendEmail({
//       to: email,
//       subject: "Verify your email address",
//       html: verifyEmailTemplate({ firstname, verifyUrl }),
//     });

//     res.status(201).json({
//       success: true,
//       message: "Signup successful. Please verify your email.",
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your email address",
      html: verifyEmailTemplate({ firstname, verifyUrl }),
    });

    // 🔐 CREATE JWT TOKEN
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Signup successful. Please verify your email.",
      token,                 // ✅ send token
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// exports.signup = async (req, res) => {
//   try {
//     const { firstname, lastname, email, password, role } = req.body;

//     if (!firstname || !lastname || !email || !password) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(409).json({ message: "Email already registered" });
//     }

//     const verifyToken = crypto.randomBytes(32).toString("hex");

//     const user = await User.create({
//       firstname,
//       lastname,
//       email,
//       password,
//       role: role || "student",
//       isVerified: false,
//       emailVerifyToken: verifyToken,
//       emailVerifyExpire: Date.now() + 15 * 60 * 1000,
//     });

//     const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;

//     await sendEmail({
//       to: email,
//       subject: "Verify your email address",
//       html: verifyEmailTemplate({ firstname, verifyUrl }),
//     });

//     res.status(201).json({
//       success: true,
//       message: "Signup successful. Please verify your email.",
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;

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
// FORGOT PASSWORD FLOW (REQUIRED)
// ============================================

exports.forgotPasswordNew = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.forgotPasswordOTP = otp;
    user.forgotPasswordOTPExpire = Date.now() + 10 * 60 * 1000;
    // 10 min
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: `<h3>Your OTP is: ${otp}</h3>`,
    });
    console.log("✅ OTP GENERATED:", otp);
    console.log("✅ Email sended to:", email);

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    // catch (error) {
    //   console.error("❌ Forgot password error:", error);
    //   res.status(500).json({
    //     success: false,
    //     message: "Unable to send reset code",
    //   });
    // }
    console.error("❌ EMAIL ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to send reset code",
    });
  }
};

exports.verifyResetCode = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      forgotPasswordOTP: String(otp),
      forgotPasswordOTPExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code",
      });
    }

    user.forgotPasswordOTP = undefined;
    user.forgotPasswordOTPExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("VERIFY RESET ERROR:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

exports.resetPasswordNew = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.password = password;
  user.forgotPasswordOTP = undefined;
  user.forgotPasswordOTPExpire = undefined;

  await user.save();

  res.json({ success: true, message: "Password reset successful" });
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
