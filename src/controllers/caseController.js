// const CaseStudy = require("../models/caseStudyModel");
// const CaseOpening = require("../models/caseOpeningModel");
// const CaseQuestion = require("../models/caseQuestionsModel");
// const CaseReveal = require("../models/caseReveal");
// const UserCaseAttempt = require("../models/userCaseAttemptModel");
// const userCaseAttemptModel = require("../models/userCaseAttemptModel");
// const UserScore = require("../models/userScoreModel");


// exports.startCase = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { caseId } = req.params;

//     const caseStudy = await CaseStudy.findById(caseId);
//     if (!caseStudy) {
//       return res.status(404).json({ message: "Case not found" });
//     }

//     const attemptsCount = await UserCaseAttempt.countDocuments({
//       userId,
//       caseId
//     });

//     if (attemptsCount >= caseStudy.maxAttempts) {
//       return res.status(400).json({
//         message: "Maximum attempts reached"
//       });
//     }

//     const attempt = await UserCaseAttempt.create({
//       userId,
//       caseId,
//       attemptNumber: attemptsCount + 1
//     });

//     const opening = await CaseOpening.findOne({ caseId });

//     res.status(201).json({
//       success: true,
//       attemptId: attempt._id,
//       opening
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getAllCases = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 10;

//     const cases = await CaseStudy.find()
//       .skip((page - 1) * limit)
//       .limit(limit);

//     // Get completed attempts of this user
//     const completedAttempts = await UserCaseAttempt.find({
//       userId,
//       isCompleted: true
//     }).select("caseId");

//     const completedCaseIds = completedAttempts.map(
//       attempt => attempt.caseId.toString()
//     );

//     // Attach submission status
//     const casesWithStatus = cases.map(c => ({
//       ...c.toObject(),
//       isSubmitted: completedCaseIds.includes(c._id.toString())
//     }));

//     res.status(200).json({
//       success: true,
//       data: casesWithStatus
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.getCurrentQuestion = async (req, res) => {
//   try {
//     const { attemptId } = req.params;

//     const attempt = await UserCaseAttempt.findById(attemptId);
//     if (!attempt || attempt.isCompleted) {
//       return res.status(400).json({ message: "Invalid attempt" });
//     }

//     // Fetch all questions for this case, sorted by order
//     const questions = await CaseQuestion.find({ caseId: attempt.caseId }).sort({ order: 1 });

//     // Find the first question that has NOT been answered yet
//     const nextQuestion = questions.find(
//       (q) => !attempt.answers.some(a => a.questionId.toString() === q._id.toString())
//     );

//     if (!nextQuestion) {
//       // ✅ All questions answered → return null or flag completed
//       return res.status(200).json({ success: true, data: null, completed: true, caseId: attempt.caseId });
//     }

//     // Return next unanswered question
//     res.status(200).json({
//       success: true,
//       data: {
//         _id: nextQuestion._id,
//         questionText: nextQuestion.questionText,
//         options: nextQuestion.options,
//         caseId: attempt.caseId // ✅ include caseId here
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.submitAnswer = async (req, res) => {
//   try {
//     const { attemptId } = req.params;
//     const { questionId, selectedOption } = req.body;

//     const attempt = await UserCaseAttempt.findById(attemptId);
//     if (!attempt || attempt.isCompleted) {
//       return res.status(400).json({ message: "Invalid attempt" });
//     }

//     const alreadyAnswered = attempt.answers.find(
//       (a) => a.questionId.toString() === questionId
//     );

//     if (alreadyAnswered) {
//       return res.status(400).json({
//         message: "Answer already submitted",
//         caseId: attempt.caseId, // ✅ include caseId
//       });
//     }

//     attempt.answers.push({
//       questionId,
//       selectedOption,
//     });

//     attempt.currentQuestion += 1;

//     await attempt.save();

//     res.status(200).json({
//       success: true,
//       message: "Answer saved",
//       caseId: attempt.caseId, // ✅ include caseId
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// exports.submitAttempt = async (req, res) => {
//   try {
//     const { attemptId } = req.params;

//     const attempt = await UserCaseAttempt.findById(attemptId);
//     if (!attempt) {
//       return res.status(404).json({ message: "Attempt not found" });
//     }

//     const questions = await CaseQuestion.find({
//       caseId: attempt.caseId
//     }).select("+correctOption");

//     let score = 0;

//     questions.forEach((question) => {
//       const userAnswer = attempt.answers.find(
//         (a) => a.questionId.toString() === question._id.toString()
//       );

//       if (userAnswer && userAnswer.selectedOption === question.correctOption) {
//         score += 2;
//       }
//     });

//     attempt.score = score;
//     attempt.isCompleted = true;

//     await attempt.save();

//     res.status(200).json({
//       success: true,
//       score,
//       retryAvailable: attempt.attemptNumber < 2,
//       caseId: attempt.caseId, // ✅ include caseId in response
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getCaseReveal = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { caseId } = req.params;

//     const attempt = await UserCaseAttempt.findOne({
//       userId,
//       caseId,
//       isCompleted: true
//     }).sort({ attemptNumber: -1 });

//     if (!attempt) {
//       return res.status(403).json({
//         message: "Complete the case to unlock reveal"
//       });
//     }

//     attempt.revealUnlocked = true;
//     await attempt.save();

//     const reveal = await CaseReveal.findOne({ caseId });

//     res.status(200).json({
//       success: true,
//       score: attempt.score,
//       reveal
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // get cases solve in one week
// exports.getWeeklyAttempts = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Validate ObjectId
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: "Invalid userId" });
//     }

//     // Date 7 days ago
//     const oneWeekAgo = new Date();
//     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

//     // Fetch attempts in last 7 days
//     const attempts = await UserCaseAttempt.find({
//       userId,
//       createdAt: { $gte: oneWeekAgo },
//     });

//     res.status(200).json({
//       success: true,
//       totalAttempts: attempts.length,
//       attempts, // optional: remove if only count needed
//     });
//   } catch (error) {
//     console.error("❌ Error fetching weekly attempts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

const mongoose = require("mongoose");
const CaseStudy = require("../models/caseStudyModel")
const Question = require("../models/caseQuestionModel")
const CaseAttempt = require("../models/userCaseAttemptModel")
const userCaseAttemptModel = require("../models/userCaseAttemptModel")
const caseQuestionModel = require("../models/caseQuestionModel")

/*
========================================================
1️⃣ GET ALL ACTIVE CASES
========================================================
*/
exports.getCases = async (req, res) => {
  try {
    const cases = await CaseStudy.find({ isActive: true })
      .select("title slug totalQuestions maxAttempts")

    res.json(cases)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
2️⃣ START CASE ATTEMPT
========================================================
*/
exports.startCase = async (req, res) => {
  try {
    const { caseId } = req.params
    const userId = req.user._id

    const caseStudy = await CaseStudy.findById(caseId)
    if (!caseStudy) {
      return res.status(404).json({ message: "Case not found" })
    }

    const attemptCount = await CaseAttempt.countDocuments({
      userId,
      caseStudyId: caseId
    })

    if (attemptCount >= caseStudy.maxAttempts) {
      return res.status(400).json({
        message: "Maximum attempts reached"
      })
    }

    const newAttempt = await CaseAttempt.create({
      userId,
      caseStudyId: caseId,
      attemptNumber: attemptCount + 1
    })

    res.json({
      message: "Case started",
      attemptId: newAttempt._id,   
      attemptNumber: newAttempt.attemptNumber
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
3️⃣ GET OPENING IMAGE
========================================================
*/
exports.getOpening = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.caseId)

    if (!caseStudy) {
      return res.status(404).json({ message: "Case not found" })
    }

    res.json({
      openingImageUrl: caseStudy.openingImageUrl,
      totalQuestions: caseStudy.totalQuestions
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
4️⃣ GET QUESTION (SEQUENTIAL LOCK)
========================================================
*/
exports.getQuestion = async (req, res) => {
  try {
    const { caseId, number } = req.params
    const userId = req.user._id

    const attempt = await CaseAttempt.findOne({
      userId,
      caseStudyId: caseId,
      isCompleted: false
    })

    if (!attempt) {
      return res.status(400).json({
        message: "Start case first"
      })
    }

    const answeredCount = attempt.answers.length

    if (parseInt(number) > answeredCount + 1) {
      return res.status(403).json({
        message: "Complete previous question first"
      })
    }

    const question = await Question.findOne({
      caseStudyId: caseId,
      questionNumber: number
    })

    if (!question) {
      return res.status(404).json({
        message: "Question not found"
      })
    }

    res.json(question)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
5️⃣ SUBMIT ANSWER
========================================================
*/
exports.submitAnswer = async (req, res) => {
  try {
    const { caseId, questionId } = req.params
    const { selectedOption } = req.body
    const userId = req.user._id

    const attempt = await CaseAttempt.findOne({
      userId,
      caseStudyId: caseId,
      isCompleted: false
    })

    if (!attempt) {
      return res.status(400).json({
        message: "No active attempt"
      })
    }

    const alreadyAnswered = attempt.answers.find(
      ans => ans.questionId.toString() === questionId
    )

    if (alreadyAnswered) {
      return res.status(400).json({
        message: "Answer already submitted"
      })
    }

    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({
        message: "Question not found"
      })
    }

    const isCorrect = selectedOption === question.correctOption
    const pointsEarned = isCorrect ? question.points : 0

    attempt.answers.push({
      questionId,
      selectedOption,
      isCorrect,
      pointsEarned
    })

    // If all questions answered → complete attempt
    if (attempt.answers.length === question.points * 5 || attempt.answers.length === 10) {
      attempt.isCompleted = true
      attempt.totalScore = attempt.answers.reduce(
        (sum, ans) => sum + ans.pointsEarned,
        0
      )
    }

    await attempt.save()

    res.json({
      message: "Answer submitted",
      completed: attempt.isCompleted
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
6️⃣ RETRY CASE (ATTEMPT 2)
========================================================
*/
exports.retryCase = async (req, res) => {
  try {
    const { caseId } = req.params
    const userId = req.user._id

    const caseStudy = await CaseStudy.findById(caseId)
    if (!caseStudy) {
      return res.status(404).json({ message: "Case not found" })
    }

    const attempts = await CaseAttempt.find({
      userId,
      caseStudyId: caseId
    })

    if (attempts.length >= caseStudy.maxAttempts) {
      return res.status(400).json({
        message: "No retry attempts left"
      })
    }

    const lastAttempt = attempts[attempts.length - 1]

    if (!lastAttempt.isCompleted) {
      return res.status(400).json({
        message: "Complete current attempt first"
      })
    }

    const newAttempt = await CaseAttempt.create({
      userId,
      caseStudyId: caseId,
      attemptNumber: attempts.length + 1
    })

    res.json({
      message: "Retry started",
      attemptNumber: newAttempt.attemptNumber
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

/*
========================================================
7️⃣ GET REVEAL (LOCKED)
========================================================
*/
exports.getReveal = async (req, res) => {
  try {
    const { caseId } = req.params
    const userId = req.user._id

    const attempt = await CaseAttempt.findOne({
      userId,
      caseStudyId: caseId,
      isCompleted: true
    })

    if (!attempt) {
      return res.status(403).json({
        message: "Complete case first"
      })
    }

    if (attempt.revealViewed) {
      return res.status(400).json({
        message: "Reveal already viewed"
      })
    }

    attempt.revealViewed = true
    await attempt.save()

    const caseStudy = await CaseStudy.findById(caseId)

    res.json({
      revealImageUrl: caseStudy.revealImageUrl,
      score: attempt.totalScore
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await userCaseAttemptModel.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = await caseQuestionModel.find({
      caseId: attempt.caseId
    }).select("+correctOption");

    let score = 0;

    questions.forEach((question) => {
      const userAnswer = attempt.answers.find(
        (a) => a.questionId.toString() === question._id.toString()
      );

      if (userAnswer && userAnswer.selectedOption === question.correctOption) {
        score += 2;
      }
    });

    attempt.score = score;
    attempt.isCompleted = true;

    await attempt.save();

    res.status(200).json({
      success: true,
      score,
      retryAvailable: attempt.attemptNumber < 2,
      caseId: attempt.caseId, // ✅ include caseId in response
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get cases solve in one week
exports.getWeeklyAttempts = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    // Date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch attempts in last 7 days
    const attempts = await CaseAttempt.find({
      userId,
      createdAt: { $gte: oneWeekAgo },
    });

    res.status(200).json({
      success: true,
      totalAttempts: attempts.length,
      attempts, // optional: remove if only count needed
    });
  } catch (error) {
    console.error("❌ Error fetching weekly attempts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

