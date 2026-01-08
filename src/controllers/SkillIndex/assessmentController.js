const mongoose = require("mongoose");
const TestAttempt = require("../../models/testAttemptModel");
const McqQuestion = require("../../models/mcqQuestionModel");
const UserDomainSkill = require("../../models/userDomainSkillModel");
const { recalculateUserScore } = require("../../services/recalculateUserScore");


// START TEST
exports.startAssessment = async (req, res) => {
  try {
     const userId = req.headers["user-id"];

    // 1. Get user's selected domain & subdomain
    const userSkill = await UserDomainSkill.findOne({ userId });

    if (!userSkill || !userSkill.domainId || !userSkill.subDomainId) {
      return res.status(400).json({
        message: "Domain and Subdomain not selected",
      });
    }

    const { domainId, subDomainId } = userSkill;

    // 2. Prevent multiple active tests
    const existingAttempt = await TestAttempt.findOne({
      userId,
      domainId,
      subDomainId,
      status: "in_progress",
      expiresAt: { $gt: new Date() },
    });

    if (existingAttempt) {
      return res.json({
        attemptId: existingAttempt._id,
        expiresAt: existingAttempt.expiresAt,
      });
    }

    // 3. Fetch 20 random questions
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
      return res.status(400).json({
        message: "Not enough questions for assessment",
      });
    }

    // 4. Create test attempt
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000);

    const attempt = await TestAttempt.create({
      userId,
      domainId,
      subDomainId,
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

    // 5. Send questions (hide correct answers)
    res.status(201).json({
      attemptId: attempt._id,
      durationMinutes: 25,
      questions: questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: [q.option1, q.option2, q.option3, q.option4],
      })),
    });
  } catch (error) {
    console.error("Start Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAttemptQuestions = async (req, res) => {
  try {
    const { attemptId } = req.params; // get attemptId from URL params

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    // 1. Find the attempt
    const attempt = await TestAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({ message: "Test attempt not found" });
    }

    // 2. Get all question IDs from the attempt
    const questionIds = attempt.questions.map((q) => q.questionId);

    // 3. Fetch the questions from the database
    const questions = await McqQuestion.find({ _id: { $in: questionIds } });

    // 4. Map the questions to hide correct answers
    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      marks: attempt.questions.find((a) => a.questionId.toString() === q._id.toString())
        ?.marks,
    }));

    res.status(200).json({
      attemptId: attempt._id,
      durationMinutes: Math.ceil((attempt.expiresAt - attempt.createdAt) / (60 * 1000)),
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error("Get Attempt Questions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, selectedOption } = req.body;

    const attempt = await TestAttempt.findOne({
      _id: attemptId,
      status: "in_progress",
      expiresAt: { $gt: new Date() }
    });

    if (!attempt) {
      return res.status(400).json({ message: "Invalid or expired attempt" });
    }

    const question = attempt.questions.find(
      (q) => q.questionId.toString() === questionId
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found in attempt" });
    }

    question.selectedOption = selectedOption;

    await attempt.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Save Answer Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// SUBMIT TEST
exports.submitAssessment = async (req, res) => {
  try {
    console.log("===== SUBMIT ASSESSMENT CALLED =====");
    console.log("REQ BODY:", req.body);
    console.log("REQ PARAMS:", req.params);

    const { attemptId } = req.body;

    if (!attemptId) {
      console.error("❌ attemptId missing in request body");
      return res.status(400).json({ message: "attemptId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      console.error("❌ Invalid attemptId:", attemptId);
      return res.status(400).json({ message: "Invalid attempt ID" });
    }

    console.log("✅ attemptId is valid:", attemptId);

    const attempt = await TestAttempt.findById(attemptId)
      .populate("questions.questionId");

    if (!attempt) {
      console.error("❌ No attempt found for ID:", attemptId);
      return res.status(404).json({ message: "Assessment not found" });
    }

    console.log("✅ Attempt found:", {
      id: attempt._id.toString(),
      status: attempt.status,
      userId: attempt.userId.toString(),
    });

    // ✅ idempotency: already submitted
    if (attempt.status === "completed") {
      console.log("ℹ️ Attempt already completed. Returning existing result.");

      return res.json({
        attemptId,
        skillIndex: attempt.skillIndex,
        maxSkillIndex: 300,
      });
    }

    if (attempt.status !== "in_progress") {
      console.error("❌ Invalid attempt state:", attempt.status);
      return res.status(400).json({ message: "Invalid assessment state" });
    }

    let skillIndex = 0;
    let answeredCount = 0;

    attempt.questions.forEach((q, index) => {
      if (q.selectedOption == null) {
        console.log(`Q${index + 1}: Not answered`);
        return;
      }

      answeredCount++;

      q.isCorrect = q.selectedOption === q.questionId.correctAnswer;

      if (q.isCorrect) {
        skillIndex += q.marks;
        console.log(`Q${index + 1}: ✅ Correct (+${q.marks})`);
      } else {
        console.log(`Q${index + 1}: ❌ Wrong`);
      }
    });

    console.log("📊 Score calculation completed:", {
      answeredCount,
      skillIndex,
    });

    attempt.skillIndex = skillIndex;
    attempt.status = "completed";
    attempt.submittedAt = new Date();

    await attempt.save();
    await recalculateUserScore(attempt.userId);
    console.log("✅ Attempt saved as completed");

    const skillUpdateResult = await UserDomainSkill.updateOne(
      {
        userId: attempt.userId,
        domainId: attempt.domainId,
        subDomainId: attempt.subDomainId,
      },
      {
        $set: { skillIndex },
        $inc: { totalAttempts: 1 },
      },
      { upsert: true }
    );

    console.log("✅ UserDomainSkill updated:", skillUpdateResult);

    console.log("===== SUBMIT ASSESSMENT SUCCESS =====");

    res.json({
      attemptId,
      skillIndex,
      maxSkillIndex: 300,
    });
  } catch (error) {
    console.error("🔥 Submit Assessment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// RETAKE TEST ========================
exports.retakeAssessment = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { domainId, subDomainId, isPaid } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!domainId || !subDomainId) {
      return res.status(400).json({
        message: "domainId and subDomainId are required",
      });
    }

    // 1️⃣ Get or create retake limit
    let retakeLimit = await RetakeLimit.findOne({
      userId,
      domainId,
      subDomainId,
    });

    if (!retakeLimit) {
      retakeLimit = await RetakeLimit.create({
        userId,
        domainId,
        subDomainId,
        freeUsed: 0,
        paidUsed: 0,
      });
    }

    // 2️⃣ Validate retake rules
    if (!isPaid && retakeLimit.freeUsed >= 1) {
      return res.status(403).json({
        message: "Free retake already used",
        requirePayment: true,
      });
    }

    if (isPaid && retakeLimit.paidUsed >= 1) {
      return res.status(403).json({
        message: "No retakes remaining",
      });
    }

    // 3️⃣ Expire any running attempt
    await TestAttempt.updateMany(
      {
        userId,
        domainId,
        subDomainId,
        status: "in_progress",
      },
      { status: "expired" }
    );

    // 4️⃣ Create new attempt
    const durationMinutes = 25;
    const expiresAt = new Date(
      Date.now() + durationMinutes * 60 * 1000
    );

    const newAttempt = await TestAttempt.create({
      userId,
      domainId,
      subDomainId,
      testStatus: isPaid ? "paid" : "free",
      status: "in_progress",
      expiresAt,
      totalQuestions: 20,
      durationMinutes,
      questions: [],
      skillIndex: 0,
      rawSkillScore: 0,
      normalizedSkillScore: 0,
    });

    // 5️⃣ Update counters
    if (isPaid) {
      retakeLimit.paidUsed += 1;
    } else {
      retakeLimit.freeUsed += 1;
    }

    await retakeLimit.save();

    // 6️⃣ Response
    return res.status(201).json({
      message: "Retake started",
      attemptId: newAttempt._id,
      expiresAt,
      freeRetakesLeft: 1 - retakeLimit.freeUsed,
      paidRetakesLeft: 1 - retakeLimit.paidUsed,
    });

  } catch (err) {
    console.error("Retake assessment error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
