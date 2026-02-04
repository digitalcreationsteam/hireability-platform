const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("./services/chat.service");
const Chat = require("./models/chatModel"); // adjust path if your model folder differs

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

async function saveMessageToDB({ senderId, receiverId, text }) {
  const sId = new mongoose.Types.ObjectId(senderId);
  const rId = new mongoose.Types.ObjectId(receiverId);

  let chat = await Chat.findOne({ participants: { $all: [sId, rId] } });

  if (!chat) {
    chat = await Chat.create({
      participants: [sId, rId],
      messages: []
    });
  }

  const msg = {
    senderId: sId,
    receiverId: rId,
    text,
    read: false,
    createdAt: new Date()
  };

  chat.messages.push(msg);
  chat.updatedAt = new Date();
  await chat.save();

  return chat.messages[chat.messages.length - 1]; // return saved message
}


  io.on("connection", (socket) => {
const userId = socket.user.id || socket.user._id;
console.log("User connected:", userId);
          socket.join(socket.user.id.toString()); // join personal room

          socket.on("send-message", async (data, callback) => {
  try {
    const { senderId, receiverId, text } = data;

    const savedMsg = await saveMessageToDB({ senderId, receiverId, text });

    // ACK to sender (stops "Sending...")
    if (callback) callback(savedMsg);

    // Send to receiver
    io.to(receiverId.toString()).emit("receive-message", savedMsg);

  } catch (err) {
    console.error("send-message error:", err);
    if (callback) callback({ error: "Failed to send" });
  }
});


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
