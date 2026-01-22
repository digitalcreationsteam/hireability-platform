// middleware/auth.js
// ✅ REFINED VERSION

const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login first.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Set req.user with decoded token
    // This makes userId available to all protected routes
    req.user = {
      id: decoded.id || decoded._id,  // Handle both formats
      _id: decoded.id || decoded._id,
    };

    console.log("✅ Auth middleware: User authenticated -", req.user.id);
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);

    // Handle different error types
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = auth;