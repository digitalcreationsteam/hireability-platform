require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const session = require("express-session");
const passport = require("passport");
const path = require("path");



connectDB();

require("./config/passport");

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(passport.initialize());

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
