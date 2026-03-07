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
const STEP_SEQUENCE = [
  "resume",
  "demographics",
  "education",      // ← REQUIRED — cannot be skipped
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
const FRONTEND_ONLY_STEPS = [
  "talent-ranking-intro",
  "skill-index-intro",
  "assessment-intro",
];

// ============================================
// SKIPPABLE STEPS
// NOTE: "education" and "experience" are intentionally excluded — they are REQUIRED
// ============================================
const SKIPPABLE_STEPS = ["certifications", "awards", "projects"];

// ============================================
// HELPER: Get completion status from database
// ============================================
const getCompletionStatus = async (userId) => {
  let objectId = new mongoose.Types.ObjectId(userId);

  const [
    user,
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
    User.findById(objectId).select("skippedSteps"),
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

  const skipped = user?.skippedSteps || [];

  const status = {
    paywall: !!subscription,
    resume: !!userDocument?.resumeUrl,
    demographics: !!demographics,
    // ─── Education and Experience are REQUIRED — no skipped fallback ───
    education: !!education,
    experience: !!experience,
    certifications: !!certifications || skipped.includes("certifications"),
    awards: !!awards || skipped.includes("awards"),
    projects: !!projects || skipped.includes("projects"),
    "job-domain": !!userDomainSkill?.domainId,
    skills: (userDomainSkill?.skills?.length || 0) > 0,
    assessment: !!assessment?.startedAt && !assessment?.completedAt,
    "assessment-results": !!assessment?.completedAt,
  };

  return status;
};

// ============================================
// SKIP STEP
// NOTE: "education" is NOT in SKIPPABLE_STEPS — requests to skip
// education will be rejected with a 400 error.
// ============================================
exports.skipStep = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { step } = req.body;

    if (!SKIPPABLE_STEPS.includes(step)) {
      return res.status(400).json({
        success: false,
        message: `"${step}" cannot be skipped. ${step === "education" || step === "experience"
          ? `${step.charAt(0).toUpperCase() + step.slice(1)} is a required step.`
          : "This step is required."
          }`,
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { skippedSteps: step },
    });

    const status = await getCompletionStatus(userId);
    const navigation = calculateNavigation(status);

    res.status(200).json({
      success: true,
      message: `${step} skipped successfully`,
      navigation,
    });
  } catch (error) {
    console.error("❌ skipStep error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to skip step",
    });
  }
};

// ============================================
// NAVIGATION
// ============================================
// const calculateNavigation = (status) => {
//   // ✅ HARD STOP: onboarding fully completed
//   if (status["assessment-results"]) {
//     return {
//       nextRoute: "/dashboard",
//       currentStep: "completed",
//       completedSteps: STEP_SEQUENCE,
//       hasPayment: status.paywall,
//       isOnboardingComplete: true,
//     };
//   }

//   // ✅ Normal onboarding flow
//   const currentStep = STEP_SEQUENCE.find((step) => !status[step]);

//   if (!currentStep) {
//     return {
//       nextRoute: "/assessment-results",
//       currentStep: "assessment-results",
//       completedSteps: STEP_SEQUENCE,
//       hasPayment: status.paywall,
//       isOnboardingComplete: false,
//     };
//   }

//   const stepToRoute = {
//     resume: "/upload-resume",
//     demographics: "/demographics",
//     education: "/education",
//     experience: "/experience",
//     certifications: "/certifications",
//     awards: "/awards",
//     projects: "/projects",
//     "job-domain": "/job-domain",
//     skills: "/skills",
//     paywall: "/paywall",
//     assessment: "/assessment",
//     "assessment-results": "/assessment-results",
//   };

//   return {
//     nextRoute: stepToRoute[currentStep],
//     currentStep,
//     completedSteps: STEP_SEQUENCE.filter((s) => status[s]),
//     hasPayment: status.paywall,
//     isOnboardingComplete: false,
//   };
// };

const calculateNavigation = (status) => {

  console.log("LinkedIn Status:", status);

  // ✅ Redirect new Google users to Talent Ranking
  const isFreshUser =
  !status.resume &&
  !status.demographics &&
  !status.education &&
  !status.experience &&
  !status["job-domain"] &&
  !status.skills;

if (isFreshUser) {
  return {
    nextRoute: "/talent-ranking",
    currentStep: "talent-ranking",
    completedSteps: [],
    hasPayment: status.paywall,
    isOnboardingComplete: false,
  };
}

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

  const currentStep = STEP_SEQUENCE.find((step) => !status[step]);

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

// ============================================
// GET USER STATUS
// ============================================
exports.getUserStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    console.log("🔍 getUserStatus called for userId:", userId);

    const [user, demographics] = await Promise.all([
      User.findById(userId).select("firstname lastname email role"),
      Demographics.findOne({ userId })
    ]);

    const status = await getCompletionStatus(userId);
    const navigation = calculateNavigation(status);

    console.log("📊 Status:", status);
    console.log("📊 Navigation:", navigation);

    res.status(200).json({
      success: true,
      navigation,
      fullName: demographics?.fullName || null,
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
// LOGIN
// ============================================
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password required",
//       });
//     }

//     const user = await User.findOne({ email }).select("+password");

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (!user.isVerified) {
//       return res.status(403).json({
//         success: false,
//         message: "Please verify your email before login",
//       });
//     }

//     const isPasswordValid = await user.matchPassword(password);
//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     user.lastLogin = new Date();
//     await user.save({ validateBeforeSave: false });

//     const token = generateToken(user._id);
//     const completionStatus = await getCompletionStatus(user._id);
//     const navigation = calculateNavigation(completionStatus);

//     res.status(200).json({
//       success: true,
//       token,
//       user: {
//         _id: user._id,
//         firstname: user.firstname,
//         lastname: user.lastname,
//         email: user.email,
//         role: user.role,
//       },
//       navigation: {
//         nextRoute: navigation.nextRoute,
//         currentStep: navigation.currentStep,
//         completedSteps: navigation.completedSteps,
//         isOnboardingComplete: navigation.isOnboardingComplete,
//         hasPayment: navigation.hasPayment,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Login error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Login failed",
//     });
//   }
// };

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

    const token = generateToken(user._id);
    const completionStatus = await getCompletionStatus(user._id);
    const navigation = calculateNavigation(completionStatus);

    // 👇 ADD THIS — fetch fullName from demographics
    // const Demographics = require("../models/Demographics"); // adjust path if needed
    const demographics = await Demographics.findOne({ userId: user._id });

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        // firstname: user.firstname,
        // lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      fullName: demographics?.fullName || null,
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
// CHECK EMAIL VERIFICATION
// ============================================
exports.checkEmailVerification = async (req, res) => {
  try {
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
// VERIFY ROUTE
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

    if (navigation.isOnboardingComplete) {
      return res.status(200).json({
        success: true,
        allowed: requestedRoute === "/dashboard",
        nextRoute: "/dashboard",
        currentStep: "completed",
      });
    }

    const currentStepIndex = STEP_SEQUENCE.indexOf(navigation.currentStep);

    const allowedRoutes = [];

    if (navigation.currentStep) {
      allowedRoutes.push(`/${navigation.currentStep}`);
    }

    if (navigation.nextRoute) {
      allowedRoutes.push(navigation.nextRoute);
    }

    const completedSteps = STEP_SEQUENCE.filter(
      (step, index) => index < currentStepIndex && completionStatus[step]
    );

    completedSteps.forEach((step) => {
      allowedRoutes.push(`/${step}`);
    });

    const uniqueAllowedRoutes = [...new Set(allowedRoutes)];

    if (navigation.currentStep === "paywall") {
      uniqueAllowedRoutes.push("/paywall");
    }

    const isAllowed = uniqueAllowedRoutes.includes(requestedRoute);

    console.log("📍 Route verification:", {
      requested: requestedRoute,
      allowed: isAllowed,
      currentStep: navigation.currentStep,
      allowedRoutes: uniqueAllowedRoutes,
    });

    res.status(200).json({
      success: true,
      allowed: isAllowed,
      nextRoute: navigation.nextRoute,
      currentStep: navigation.currentStep,
      allowedRoutes: uniqueAllowedRoutes,
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

    console.log("\n========== SIGNUP ATTEMPT ==========");
    console.log("📧 Email:", email);
    console.log("👤 Name:", firstname, lastname);
    console.log("====================================\n");

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log("❌ Email already registered:", email);
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    console.log("📝 Creating user with:");
    console.log("   Email:", email.toLowerCase());
    console.log("   OTP:", otp);
    console.log("   Expiry:", new Date(otpExpiry));

    const user = await User.create({
      firstname,
      lastname,
      email: email.toLowerCase(),
      password: password,
      role: role || "student",
      isVerified: false,
      otp: otp,
      otpExpiry: otpExpiry,
    });

    console.log("✅ User created with ID:", user._id);

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email Address - OTP",
        html: otpEmailTemplate({ firstname, otp }),
      });
      console.log(`✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
    }

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
        // firstname: user.firstname,
        // lastname: user.lastname,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// ============================================
// VERIFY OTP
// ============================================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("\n========== OTP VERIFICATION ==========");
    console.log("📧 Email:", email);
    console.log("🔑 Received OTP:", otp);
    console.log("======================================\n");

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+otp +otpExpiry"
    );

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (user.otpExpiry < Date.now()) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const storedOTP = String(user.otp).trim();
    const receivedOTP = String(otp).trim();

    if (storedOTP !== receivedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    console.log("✅ Email verified successfully for:", user.email);

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
};

// ============================================
// RESEND OTP
// ============================================
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+isVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: "New OTP for Email Verification",
        html: otpEmailTemplate({ firstname: user.firstname, otp }),
      });
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
    }

    res.json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while resending OTP",
    });
  }
};

// ============================================
// VERIFY EMAIL (token-based)
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
// FORGOT PASSWORD FLOW
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
    await user.save({ validateBeforeSave: false });

    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="background:#4a6cf7;color:#ffffff;padding:25px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">Password Reset Request</h1>
              <p style="margin-top:8px;font-size:15px;opacity:0.9;">Your OTP for password reset</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:#333;">
              <p style="font-size:18px;margin-bottom:15px;">
                Hello <strong style="color:#4a6cf7;">${user.firstname || "User"}</strong>,
              </p>
              <p style="font-size:15px;line-height:1.6;color:#555;">
                We received a request to reset your password for your <strong>UniTalent.Cloud</strong> account.
                Please use the following OTP to reset your password:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <div style="
                      background:#f0f4ff;
                      border:2px dashed #4a6cf7;
                      border-radius:10px;
                      padding:20px;
                      font-size:36px;
                      font-weight:bold;
                      letter-spacing:8px;
                      color:#4a6cf7;
                      display:inline-block;
                    ">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#777;">⏰ This OTP will expire in <strong>10 minutes</strong>.</p>
              <p style="font-size:13px;color:#999;margin-top:25px;">
                If you did not request this password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9fa;text-align:center;padding:15px;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} UniTalent.Cloud. All rights reserved.<br>
              This is an automated email, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP - UniTalent.Cloud",
      html: htmlTemplate,
    });

    console.log("✅ OTP GENERATED:", otp);
    console.log("✅ Email sent to:", email);

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
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
// EXPORT HELPERS
// ============================================
exports.getCompletionStatus = getCompletionStatus;
exports.calculateNavigation = calculateNavigation;