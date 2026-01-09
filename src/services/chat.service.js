const OpenAI = require("openai");
const ChatSession = require("../models/chatSession.model");
const User = require("../models/userModel");
const UserScore = require("../models/userScoreModel");
const { studentPrompt, recruiterPrompt } = require("../utils/prompts");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.handleChat = async ({ userId, role, message }) => {
  let session = await ChatSession.findOne({ userId });
  if (!session) session = await ChatSession.create({ userId, role, messages: [] });

  let systemPrompt = "";

  if (role === "student") {
    const user = await User.findById(userId);
    const score = await UserScore.findOne({ userId });
    systemPrompt = studentPrompt(user, score);
  } else {
    systemPrompt = recruiterPrompt();
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...session.messages,
    { role: "user", content: message }
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4
  });

  const reply = res.choices[0].message.content;

  session.messages.push(
    { role: "user", content: message },
    { role: "assistant", content: reply }
  );

  await session.save();
  return reply;
};
