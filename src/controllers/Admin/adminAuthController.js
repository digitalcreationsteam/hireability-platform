const User = require("../../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../../utils/sendEmail");
const verifyEmailTemplate = require("../../utils/verifyEmail");


// @desc    Admin Signup
// @route   POST /api/admin/signup
// @access  Public (you can restrict later)
// exports.adminSignup = async (req, res) => {
//   try {
//     const { firstname, lastname, email, password } = req.body;

//     // 1. Validate input
//     if (!firstname || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Firstname, email and password are required",
//       });
//     }

//     // 2. Check if admin already exists
//     const existingAdmin = await User.findOne({ email });

//     if (existingAdmin) {
//       return res.status(409).json({
//         success: false,
//         message: "Admin already exists with this email",
//       });
//     }

//     // 3. Create admin user
//     const admin = await User.create({
//       firstname,
//       lastname,
//       email,
//       password, // will be hashed by pre-save hook
//       role: "admin",
//       isVerified: true, // usually admins are auto-verified
//     });

//     // 4. Send response
//     res.status(201).json({
//       success: true,
//       message: "Admin registered successfully",
//       data: {
//         id: admin._id,
//         firstname: admin.firstname,
//         email: admin.email,
//         role: admin.role,
//       },
//     });
//   } catch (error) {
//     console.error("Admin Signup Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

exports.adminSignup = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;

    // 1. Validation
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 2. Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 3. Create email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    // 4. Create admin user
    const admin = await User.create({
      firstname,
      lastname,
      email,
      password,
      role: "admin",                // 🔥 FORCE ADMIN ROLE
      isVerified: false,             // admin also verifies email
      emailVerifyToken: verifyToken,
      emailVerifyExpire: Date.now() + 15 * 60 * 1000,
    });

    // 5. Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your admin account",
      html: verifyEmailTemplate({
        firstname,
        verifyUrl,
      }),
    });

    // 6. Create JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 7. Response
    res.status(201).json({
      success: true,
      message: "Admin signup successful. Please verify your email.",
      token,
      user: {
        id: admin._id,
        firstname: admin.firstname,
        lastname: admin.lastname,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (err) {
    console.error("Admin Signup Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Login User (Admin / Recruiter / Student)
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find user + explicitly select password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 3. Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 4. Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
