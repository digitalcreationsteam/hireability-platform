// controllers/authController.js - FIXED VERSION
const mongoose = require("mongoose");

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
const otpEmailTemplate = require("./../utils/otpEmailTemplate");
// ============================================
// STEP SEQUENCE - ONLY REAL DATA STEPS
// ============================================
// REMOVED: skill-index-intro, assessment-intro (frontend-only)
// These are auto-skipped, not tracked in database
const STEP_SEQUENCE = [
  "resume",
  "demographics",
  "education",
  "experience",
  "certifications",
  "awards",
  "projects",
  "job-domain",
  "skills",
  "paywall",        // ✅ MOVED HERE - after skills
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
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 getCompletionStatus - Input userId:", userId);
  console.log("🔍 userId type:", typeof userId);

  // ✅ Ensure userId is ObjectId
  let objectId;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    objectId = userId instanceof mongoose.Types.ObjectId
      ? userId
      : new mongoose.Types.ObjectId(userId);
  } else {
    throw new Error("Invalid userId format");
  }

  console.log("🔍 Converted to ObjectId:", objectId);

  const [
    userDocument,
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
    UserDocument.findOne({ userId: objectId }),
    Demographics.findOne({ userId: objectId }),
    Education.findOne({ userId: objectId }),
    Experience.findOne({ userId: objectId }),
    Certification.findOne({ userId: objectId }),
    Award.findOne({ userId: objectId }),
    Project.findOne({ userId: objectId }),
    Subscription.findOne({ user: objectId, status: "active" }),
    UserDomainSkill.findOne({ userId: objectId }),
    SkillAssessment.findOne({ userId: objectId }),
  ]);

  console.log("📄 UserDocument found:", !!userDocument);
  if (userDocument) {
    console.log("📄 UserDocument details:", {
      _id: userDocument._id,
      userId: userDocument.userId,
      resumeUrl: userDocument.resumeUrl,
      resumeOriginalName: userDocument.resumeOriginalName,
    });
  } else {
    console.log("❌ NO UserDocument found for userId:", objectId);

    // Debug: Check what's in the database
    const count = await UserDocument.countDocuments();
    console.log("📊 Total UserDocuments in database:", count);

    if (count > 0) {
      const sample = await UserDocument.findOne();
      console.log("📄 Sample document userId type:", typeof sample.userId);
      console.log("📄 Sample document userId:", sample.userId);
    }
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const status = {
    paywall: !!subscription,
    resume: !!userDocument?.resumeUrl,
    demographics: !!demographics,
    education: !!education,
    experience: !!experience,
    certifications: !!certifications,
    awards: !!awards,
    projects: !!projects,
    "job-domain": !!userDomainSkill?.domainId,
    skills: (userDomainSkill?.skills?.length || 0) > 0,
    assessment: !!assessment?.startedAt && !assessment?.completedAt,
    "assessment-results": !!assessment?.completedAt,
  };

  console.log("✅ Completion status:", status);
  return status;
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

  // If all steps are completed but not assessment-results, 
  // they should go to assessment-results
  if (!currentStep) {
    return {
      nextRoute: "/assessment-results",
      currentStep: "assessment-results",
      completedSteps: STEP_SEQUENCE,
      hasPayment: status.paywall,
      isOnboardingComplete: false,
    };
  }

  const stepToRoute = {
    resume: "/upload-resume",
    demographics: "/demographics",
    education: "/education",
    experience: "/experience",
    certifications: "/certifications",
    awards: "/awards",
    projects: "/projects",
    "job-domain": "/job-domain",
    skills: "/skills",
    paywall: "/paywall",
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
  try {
    const userId = req.user._id || req.user.id;

    console.log("🔍 getUserStatus called for userId:", userId);
    console.log("🔍 userId type:", typeof userId);

    const status = await getCompletionStatus(userId);
    const navigation = calculateNavigation(status);

    console.log("📊 Status:", status);
    console.log("📊 Navigation:", navigation);

    res.status(200).json({
      success: true,
      navigation,
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

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
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
      userId: user.id,
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

    // Calculate allowed routes based on current step
    const currentStepIndex = STEP_SEQUENCE.indexOf(navigation.currentStep);

    // Allowed routes:
    // 1. Current step route
    // 2. Next step route (for forward navigation)
    // 3. Previous completed steps (for backward navigation)
    const allowedRoutes = [];

    // Add current step
    if (navigation.currentStep) {
      allowedRoutes.push(`/${navigation.currentStep}`);
    }

    // Add next step
    if (navigation.nextRoute) {
      allowedRoutes.push(navigation.nextRoute);
    }

    // Add all previous completed steps (allow going back)
    const completedSteps = STEP_SEQUENCE.filter((step, index) =>
      index < currentStepIndex && status[step]
    );

    completedSteps.forEach(step => {
      allowedRoutes.push(`/${step}`);
    });

    // Remove duplicates
    const uniqueAllowedRoutes = [...new Set(allowedRoutes)];

    // Special case: If paywall is the current step, allow access
    if (navigation.currentStep === "paywall") {
      uniqueAllowedRoutes.push("/paywall");
    }

    const isAllowed = uniqueAllowedRoutes.includes(requestedRoute);

    console.log("📍 Route verification:", {
      requested: requestedRoute,
      allowed: isAllowed,
      currentStep: navigation.currentStep,
      allowedRoutes: uniqueAllowedRoutes
    });

    res.status(200).json({
      success: true,
      allowed: isAllowed,
      nextRoute: navigation.nextRoute,
      currentStep: navigation.currentStep,
      allowedRoutes: uniqueAllowedRoutes, // Send to frontend for hydration
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

// Update your signup function
// controllers/authController.js - Updated signup function
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    // Validation
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log('📝 Creating user with:');
    console.log('   Email:', email.toLowerCase());
    console.log('   OTP:', otp);
    console.log('   Expiry:', new Date(otpExpiry));

    // Create user
    const user = await User.create({
      firstname,
      lastname,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
      isVerified: false,
      otp: otp,
      otpExpiry: otpExpiry,
    });

    console.log('✅ User created with ID:', user._id);
    console.log('✅ OTP saved in DB:', user.otp);
    console.log('✅ Expiry saved:', user.otpExpiry);

    // Send OTP via email
    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email Address - OTP",
        html: otpEmailTemplate({ firstname, otp }),
      });
      console.log(`✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Signup successful. Please verify your email with OTP.",
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });

  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({
      success: false,
      message: "Server error during signup"
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
// controllers/authController.js - Updated verifyOTP function
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('\n========== OTP VERIFICATION ==========');
    console.log('📧 Email:', email);
    console.log('🔑 Received OTP:', otp);
    console.log('🔑 OTP Type:', typeof otp);
    console.log('======================================\n');

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+otp +otpExpiry');  // ← Add this line

    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      isVerified: user.isVerified,
      hasOTP: !!user.otp,
      storedOTP: user.otp,
      otpExpiry: user.otpExpiry,
      currentTime: new Date(),
      expiryTime: user.otpExpiry ? new Date(user.otpExpiry) : null
    });

    // Check if already verified
    if (user.isVerified) {
      console.log('⚠️ User already verified');
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // Check if OTP exists
    if (!user.otp) {
      console.log('❌ No OTP found in database');
      console.log('💡 Possible reasons:');
      console.log('   - OTP expired and was cleared');
      console.log('   - OTP was not saved during signup');
      console.log('   - User is already verified');

      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one."
      });
    }

    // Check OTP expiry
    if (user.otpExpiry < Date.now()) {
      console.log('❌ OTP expired');
      console.log('   Expiry:', new Date(user.otpExpiry));
      console.log('   Now:', new Date());

      // Clear expired OTP
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Compare OTP (convert both to string and trim)
    const storedOTP = String(user.otp).trim();
    const receivedOTP = String(otp).trim();

    console.log('🔍 OTP Comparison:');
    console.log('   Stored OTP:', storedOTP);
    console.log('   Received OTP:', receivedOTP);
    console.log('   Match:', storedOTP === receivedOTP);

    if (storedOTP !== receivedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log('✅ Email verified successfully for:', user.email);
    console.log('======================================\n');

    res.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error('❌ Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: "Server error during verification"
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
// controllers/authController.js - Updated resendOTP function
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('\n========== RESEND OTP ==========');
    console.log('📧 Email:', email);
    console.log('================================\n');

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+isVerified');

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      console.log('⚠️ User already verified');
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log('🆕 New OTP generated:', otp);
    console.log('⏰ New expiry:', new Date(otpExpiry));

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log('✅ OTP saved to database');

    // Send new OTP via email
    try {
      await sendEmail({
        to: email,
        subject: "New OTP for Email Verification",
        html: otpEmailTemplate({ firstname: user.firstname, otp }),
      });
      console.log('✅ OTP email sent');
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
    }

    res.json({
      success: true,
      message: "New OTP sent successfully"
    });

  } catch (err) {
    console.error('❌ Resend OTP error:', err);
    res.status(500).json({
      success: false,
      message: "Server error while resending OTP"
    });
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


// Add this to your auth routes file
// router.get('/verify/:token', async (req, res) => {
//   try {
//     const { token } = req.params;

//     const user = await User.findOne({
//       emailVerifyToken: token,
//       emailVerifyExpire: { $gt: Date.now() }
//     });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or expired verification link'
//       });
//     }

//     user.isVerified = true;
//     user.emailVerifyToken = undefined;
//     user.emailVerifyExpire = undefined;
//     await user.save();

//     res.json({
//       success: true,
//       message: 'Email verified successfully'
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// Add resend verification route
// router.post('/resend-verification', async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     if (user.isVerified) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email already verified'
//       });
//     }

//     const verifyToken = crypto.randomBytes(32).toString('hex');

//     user.emailVerifyToken = verifyToken;
//     user.emailVerifyExpire = Date.now() + 15 * 60 * 1000;
//     await user.save();

//     const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;

//     await sendEmail({
//       to: email,
//       subject: 'Verify your email address',
//       html: verifyEmailTemplate({ firstname: user.firstname, verifyUrl })
//     });

//     res.json({
//       success: true,
//       message: 'Verification email sent'
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// Add check verification status route
// router.get('/verification-status', async (req, res) => {
//   try {
//     const userId = req.headers['user-id'];

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     res.json({
//       success: true,
//       isVerified: user.isVerified
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });
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

    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify/${verifyToken}`;

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
