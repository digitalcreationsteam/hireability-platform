require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

// ✅ connect-mongo@6 (Node 22 compatible CJS import)
const ConnectMongo = require("connect-mongo");
const MongoStore = ConnectMongo.default ?? ConnectMongo;

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

      // ✅ connect-mongo@6 store
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        autoRemove: "disabled",
        touchAfter: 24 * 3600, // seconds
      }),

      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
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
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  /* =======================
     Routes
  ======================= */
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/user", require("./routes/userRoutes"));
  app.use("/api/subscription", require("./routes/subscriptionRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/recruiter", require("./routes/recruiterRoutes"));

  app.get("/", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
  });
  // console.log("CLIENT_URL:", process.env.CLIENT_URL);
  // console.log("BACKEND_URL:", process.env.BACKEND_URL);
  /* =======================
     Server
  ======================= */
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

// ✅ connect-mongo@6 (Node 22 compatible CJS import)
const ConnectMongo = require("connect-mongo");
const MongoStore = ConnectMongo.default ?? ConnectMongo;

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

      // ✅ connect-mongo@6 store
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: "sessions",
        autoRemove: "disabled",
        touchAfter: 24 * 3600, // seconds
      }),

      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24, // 1 day
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
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  /* =======================
     Routes
  ======================= */
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/user", require("./routes/userRoutes"));
  app.use("/api/subscription", require("./routes/subscriptionRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/recruiter", require("./routes/recruiterRoutes"));

  app.get("/", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
  });
// console.log("CLIENT_URL:", process.env.CLIENT_URL);
// console.log("BACKEND_URL:", process.env.BACKEND_URL);
  /* =======================
     Server
  ======================= */
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
