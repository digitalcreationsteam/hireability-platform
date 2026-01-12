require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

connectDB();
require("./config/passport");

const app = express();

/* ================== MIDDLEWARE ================== */
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "user-id", "attemptid"],
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================== ROUTES ================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
  });
});

app.use("/api/chat", require("./routes/chatRoutes"));


/* ================== SOCKET.IO ================== */

// 1️⃣ Create HTTP server
const server = http.createServer(app);

// 2️⃣ Attach socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// 3️⃣ Socket logic
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId); // 🔑 private room
    console.log("User joined room:", userId);
  });

  socket.on("send-message", ({ senderId, receiverId, text }) => {
    console.log("📩 Message:", text);

    // Send to receiver
    io.to(receiverId).emit("receive-message", {
      senderId,
      text
    });

    // Send back to sender (sync UI)
    io.to(senderId).emit("receive-message", {
      senderId,
      text
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });
});


/* ================== START SERVER ================== */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
