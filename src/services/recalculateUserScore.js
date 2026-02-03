const Education = require("../models/educationModel");
const Work = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");
const UserScore = require("../models/userScoreModel");
const TestScore = require("../models/testAttemptModel");


exports.recalculateUserScore = async (userId) => {
  const [
    educations,
    works,
    certifications,
    awards,
    projects,
    completedTests
  ] = await Promise.all([
    Education.find({ userId }),
    Work.find({ userId }),
    Certification.find({ userId }),
    Award.find({ userId }),
    Project.find({ userId }),
    TestScore.find({
      userId,
      status: "completed",
    }),
  ]);

  const educationScore = educations.reduce((t, e) => t + (e.educationScore || 0), 0);
  const workScore = works.reduce((t, w) => t + (w.workScore || 0), 0);
  const certificationScore = certifications.reduce((t, c) => t + (c.certificationScore || 0), 0);
  const awardScore = awards.reduce((t, a) => t + (a.awardScore || 0), 0);
  const projectScore = projects.reduce((t, p) => t + (p.projectScore || 0), 0);

  // ✅ CORRECT SKILL INDEX
  // const skillIndexScore = completedTests.reduce(
  //   (t, s) => t + (s.skillIndex || 0),
  //   0
  // );

  // ✅ CORRECT SKILL INDEX (LATEST ATTEMPT ONLY)
  let skillIndexScore = 0;

  if (completedTests.length > 0) {
    const latestTest = completedTests.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    )[0];

    skillIndexScore = latestTest.skillIndex || 0;
  }


  const experienceIndexScore =
    educationScore +
    workScore +
    certificationScore +
    awardScore +
    projectScore;

  const hireabilityIndex =
    0.35 * experienceIndexScore +
    0.65 * skillIndexScore;


  await UserScore.findOneAndUpdate(
    { userId },
    {
      educationScore,
      workScore,
      certificationScore,
      awardScore,
      projectScore,
      skillIndexScore,
      experienceIndexScore,
      hireabilityIndex
    },
    { upsert: true, new: true }
  );
};
