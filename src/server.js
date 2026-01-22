require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");
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
  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }));
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

// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const session = require("express-session");
// const passport = require("passport");
// const path = require("path");
// const http = require("http");
// const { Server } = require("socket.io");

// connectDB();
// require("./config/passport");

// const app = express();

// /* ================== MIDDLEWARE ================== */
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );

// app.use(express.json());

// app.use(
//   session({
//     name: "hireability.sid",
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false, // true only in HTTPS (prod)
//       maxAge: 1000 * 60 * 60 * 24, // 1 day
//     },
//   })
// );

// app.use(passport.initialize());
// // ⚠️ If you later need login sessions
// app.use(passport.session());

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// /* ================== ROUTES ================== */
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/user", require("./routes/userRoutes"));
// app.use("/api/chat", require("./routes/chatRoutes"));
// app.use("/api/subscription", require("./routes/subscriptionRoutes")); // NEW - Add this line


// app.get("/", (req, res) => {
//   res.json({ status: "OK", message: "Server is running" });
// });

// /* ================== SOCKET.IO ================== */
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     credentials: true,
//   },
// });

// io.on("connection", (socket) => {
//   console.log("🟢 User connected:", socket.id);

//   socket.on("join", (userId) => {
//     socket.join(userId);
//     console.log("User joined room:", userId);
//   });

//   socket.on("send-message", ({ senderId, receiverId, text }) => {
//     io.to(receiverId).emit("receive-message", {
//       senderId,
//       text,
//     });

//     io.to(senderId).emit("receive-message", {
//       senderId,
//       text,
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("🔴 User disconnected:", socket.id);
//   });
// });

// /* ================== START SERVER ================== */
// const PORT = process.env.PORT || 5001;

// server.listen(PORT, () => {
//   console.log(`✅ Server running at http://localhost:${PORT}`);
// });
