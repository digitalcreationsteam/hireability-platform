require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo").default;
const mongoose = require("mongoose");
const path = require("path");
const connectDB = require("./config/db");
const app = express();
/* =======================
   Database - WAIT for connection
======================= */
connectDB().then(() => {
  /* =======================
     Global Middlewares
  ======================= */


  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  );
  // app.use(cors({
  //   origin: process.env.CLIENT_URL,
  //   credentials: true,
  // }));
  app.use(express.json());
  /* =======================
     Session (MUST be before passport)
  ======================= */
  app.use(
    session({
      name: "hiring.sid",
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        autoRemove: "disabled",
        touchAfter: 24 * 3600,
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24,
      },
    })
  );
  /* =======================
     Passport
  ======================= */
  require("./config/passport");
  app.use(passport.initialize());
  app.use(passport.session());
  /* =======================
     Static files
  ======================= */
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  /* =======================
     Routes
  ======================= */
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/user", require("./routes/userRoutes"));
  app.get("/", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
  });
  /* =======================
     Server
  ======================= */
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);  // FIXED: Changed backticks to parentheses
  });
});
