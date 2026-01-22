// const TestAttempt = require("../../models/testAttemptModel");
// const AttemptLimit = require("../../models/attemptLimitModel");
// const McqQuestion = require("../../models/mcqQuestionModel");
// const mongoose = require("mongoose");


// /**
//  * type:
//  *  - "default"
//  *  - "freeRetake"
//  *  - "paidRetake"
//  */
// async function createAttempt({ userId, domainId, subDomainId, type }) {
//   // 1️⃣ Get or create limit row
//   // let limit = await AttemptLimit.findOne({ userId, domainId, subDomainId });

//   // if (!limit) {
//   //   limit = await AttemptLimit.create({ userId, domainId, subDomainId });
//   // }

//   const limit = await AttemptLimit.findOneAndUpdate(
//   { userId, domainId, subDomainId },
//   {
//     $setOnInsert: {
//       userId,
//       domainId,
//       subDomainId,
//       defaultUsed: false,
//       freeRetakeUsed: false,
//       paidRetakeUsed: false,
//     },
//   },
//   { upsert: true, new: true }
// );


//   // 2️⃣ Enforce rules
//   if (type === "default" && limit.defaultUsed) {
//     throw new Error("Default attempt already used");
//   }
//   if (type === "freeRetake" && limit.freeRetakeUsed) {
//     throw new Error("Free retake already used");
//   }
//   if (type === "paidRetake" && limit.paidRetakeUsed) {
//     throw new Error("Paid retake already used");
//   }

//   // 3️⃣ Kill any running attempt
//   await TestAttempt.updateMany(
//     { userId, domainId, subDomainId, status: "in_progress" },
//     { status: "expired" }
//   );

//   // 4️⃣ Fetch questions (THIS WAS MISSING EARLIER)
//   const questions = await McqQuestion.aggregate([
//     {
//       $match: {
//         domainId: new mongoose.Types.ObjectId(domainId),
//         subDomainId: new mongoose.Types.ObjectId(subDomainId),
//       },
//     },
//     { $sample: { size: 20 } },
//   ]);

//   if (questions.length < 20) {
//     throw new Error("Not enough questions for assessment");
//   }

//   // 5️⃣ Create attempt with questions
//   const expiresAt = new Date(Date.now() + 25 * 60 * 1000);

//   const attempt = await TestAttempt.create({
//     userId,
//     domainId,
//     subDomainId,
//     testStatus: type === "paidRetake" ? "paid" : "free",
//     status: "in_progress",
//     expiresAt,
//     questions: questions.map((q) => ({
//       questionId: q._id,
//       marks: q.difficulty === "Easy" ? 10 : q.difficulty === "Medium" ? 15 : 20,
//     })),
//   });

//   // 6️⃣ Update limit flags
//   if (type === "default") limit.defaultUsed = true;
//   if (type === "freeRetake") limit.freeRetakeUsed = true;
//   if (type === "paidRetake") limit.paidRetakeUsed = true;

//   await limit.save();

//   return attempt;
// }

// module.exports = { createAttempt };




const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const mongoose = require("mongoose");

async function createAttempt({ userId, domainId, subDomainId }) {

  // 1️⃣ Expire any running attempt
  await TestAttempt.updateMany(
    { userId, domainId, subDomainId, status: "in_progress" },
    { status: "expired" }
  );

  // 2️⃣ Fetch questions
  const questions = await McqQuestion.aggregate([
    {
      $match: {
        domainId: new mongoose.Types.ObjectId(domainId),
        subDomainId: new mongoose.Types.ObjectId(subDomainId),
      },
    },
    { $sample: { size: 20 } },
  ]);

  if (questions.length < 20) {
    throw new Error("Not enough questions for assessment");
  }

  // 3️⃣ Create new attempt
  const expiresAt = new Date(Date.now() + 25 * 60 * 1000);

  const attempt = await TestAttempt.create({
    userId,
    domainId,
    subDomainId,
    status: "in_progress",
    testStatus: "free",
    expiresAt,
    questions: questions.map((q) => ({
      questionId: q._id,
      marks:
        q.difficulty === "Easy"
          ? 10
          : q.difficulty === "Medium"
          ? 15
          : 20,
    })),
  });

  return attempt;
}

module.exports = { createAttempt };

