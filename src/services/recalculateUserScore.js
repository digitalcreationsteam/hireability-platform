const Education = require("../models/educationModel");
const Work = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");
const UserScore = require("../models/userScoreModel");
const Skill = require("../models/skillModel");

exports.recalculateUserScore = async (userId) => {
  const [
    educations,
    works,
    certifications,
    awards,
    projects,
    skills // new
  ] = await Promise.all([
    Education.find({ userId }),
    Work.find({ userId }),
    Certification.find({ userId }),
    Award.find({ userId }),
    Project.find({ userId }),
    Skill.find({ userId }) // new
  ]);

  const educationScore = educations.reduce((t, e) => t + (e.educationScore || 0), 0);
  const workScore = works.reduce((t, w) => t + (w.workScore || 0), 0);
  const certificationScore = certifications.reduce((t, c) => t + (c.certificationScore || 0), 0);
  const awardScore = awards.reduce((t, a) => t + (a.awardScore || 0), 0);
  const projectScore = projects.reduce((t, p) => t + (p.projectScore || 0), 0);
  const skillIndexScore = skills.reduce((t, s) => t + (s.skillScore || 0), 0); // new

  const experienceIndexScore =
    educationScore +
    workScore +
    certificationScore +
    awardScore +
    projectScore;

  const hireabilityIndex = experienceIndexScore + skillIndexScore; // now includes skills

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
