const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("./services/chat.service");

let io;

exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user.id);

    socket.on("chat-message", async (message) => {
      const reply = await chatService.handleChat({
        userId: socket.user.id,
        role: socket.user.role,
        message
      });

      socket.emit("chat-reply", reply);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};
