const User = require("../models/userModel");
const Education = require("../models/educationModel");
const WorkExperience = require("../models/workModel");
const Certification = require("../models/certificationModel");
const Award = require("../models/awardModel");
const Project = require("../models/projectModel");

exports.getCompleteExperienceIndex = async (req, res) => {
    try {
        const userId = req.headers["user-id"];
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID missing"
            });
        }

        console.log(`\n========== 📊 FETCHING COMPLETE EXPERIENCE INDEX ==========`);
        console.log(`👤 User ID: ${userId}`);

        // Fetch user to get demographics score
        const user = await User.findById(userId);

        // Fetch all sections in parallel for better performance
        const [educations, workExperiences, certifications, awards, projects] = await Promise.all([
            Education.find({ userId }),
            WorkExperience.find({ userId }),
            Certification.find({ userId }),
            Award.find({ userId }),
            Project.find({ userId })
        ]);

        // Calculate scores for each section
        const demographicsScore = user?.experienceIndex?.demographicsScore || 0;

        const educationScore = educations.reduce((sum, edu) =>
            sum + (edu.educationScore || 0), 0);

        const workScore = workExperiences.reduce((sum, exp) =>
            sum + (exp.workScore || 0), 0);

        const certificationScore = certifications.reduce((sum, cert) =>
            sum + (cert.certificationScore || 5), 0);

        const awardScore = awards.reduce((sum, award) =>
            sum + (award.awardScore || 5), 0);

        const projectScore = projects.reduce((sum, project) =>
            sum + (project.projectScore || 3), 0);

        // Calculate total score
        const totalScore = demographicsScore + educationScore + workScore +
            certificationScore + awardScore + projectScore;

        console.log("📊 Scores Breakdown:");
        console.log(`   Demographics: ${demographicsScore}`);
        console.log(`   Education: ${educationScore}`);
        console.log(`   Work Experience: ${workScore}`);
        console.log(`   Certifications: ${certificationScore}`);
        console.log(`   Awards: ${awardScore}`);
        console.log(`   Projects: ${projectScore}`);
        console.log(`   Total: ${totalScore}`);

        // Return in the format your frontend expects
        return res.status(200).json({
            points: {
                demographics: demographicsScore,
                education: educationScore,
                workExperience: workScore,
                certifications: certificationScore,
                awards: awardScore,
                projects: projectScore,
                total: totalScore
            },
            total: totalScore
        });

    } catch (error) {
        console.error("❌ Error calculating experience index:", error);
        return res.status(500).json({
            success: false,
            message: "Error calculating experience index",
            error: error.message
        });
    }
};