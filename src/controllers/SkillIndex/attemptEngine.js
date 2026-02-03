const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const mongoose = require("mongoose");

async function createAttempt({ userId, domainId }) {

  // 1️⃣ Expire any running attempt for same user + domain
  await TestAttempt.updateMany(
    { userId, domainId, status: "in_progress" },
    { status: "expired" }
  );

  // 2️⃣ Difficulty configuration
  const config = [
    { difficulty: "Easy", count: 5, marks: 10 },
    { difficulty: "Medium", count: 10, marks: 15 },
    { difficulty: "Hard", count: 5, marks: 20 },
  ];

  let selectedQuestions = [];

  // 3️⃣ Fetch questions difficulty-wise
  for (const level of config) {
    const questions = await McqQuestion.aggregate([
      {
        $match: {
          domainId: new mongoose.Types.ObjectId(domainId),
          difficulty: level.difficulty,
        },
      },
      { $sample: { size: level.count } },
    ]);

    if (questions.length < level.count) {
      throw new Error(
        `Not enough ${level.difficulty} questions`
      );
    }

    questions.forEach((q) => {
      selectedQuestions.push({
        questionId: q._id,
        difficulty: level.difficulty,
        marks: level.marks,
        selectedAnswer: null,
        isCorrect: null,
      });
    });
  }

  // 4️⃣ Create new attempt
  const expiresAt = new Date(Date.now() + 25 * 60 * 1000); // 25 mins

  const attempt = await TestAttempt.create({
    userId,
    domainId,
    status: "in_progress",
    testStatus: "free",
    totalQuestions: 20,
    totalMarks: 300,
    expiresAt,
    questions: selectedQuestions,
  });

  return attempt;
}

module.exports = { createAttempt };
