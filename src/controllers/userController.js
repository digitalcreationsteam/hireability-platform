// const User = require('../models/userModel');
// const Demographics = require('../models/demographicsModel');
// const Education = require('../models/educationModel');
// const WorkExperience = require('../models/workModel');
// const Documents = require('../models/userDocumentModel');

// // Get all users
// const getUsers = async (req, res) => {
//     try {
//         const users = await User.find();
//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // get total count of user
// exports.getUserProfile = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         console.log(`📊 Fetching profile for user: ${userId}`);

//         // Fetch all user data in parallel
//         const [
//             user,
//             demographics,
//             education,
//             workExperience,
//             documents
//         ] = await Promise.all([
//             User.findById(userId).select('-password'),
//             Demographics.find({ userId }).sort({ createdAt: -1 }),
//             Education.find({ userId }).sort({ startYear: -1, startMonth: -1 }),
//             WorkExperience.find({ userId }).sort({ startYear: -1, startMonth: -1 }),
//             Documents.findOne({ userId })
//         ]);

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'User not found'
//             });
//         }

//         // Format the response
//         const profileData = {
//             userId: user._id,
//             data: {
//                 demographics: demographics.map(d => ({
//                     _id: d._id,
//                     fullName: d.fullName || `${user.firstName} ${user.lastName}`,
//                     email: d.email || user.email,
//                     phoneNumber: d.phoneNumber || '',
//                     country: d.country || '',
//                     state: d.state || '',
//                     city: d.city || '',
//                     headline: d.headline || 'Professional',
//                     bio: d.bio || '',
//                     createdAt: d.createdAt,
//                     updatedAt: d.updatedAt
//                 })),
//                 education: education.map(e => ({
//                     _id: e._id,
//                     degree: e.degree,
//                     fieldOfStudy: e.fieldOfStudy,
//                     schoolName: e.schoolName,
//                     startMonth: e.startMonth,
//                     startYear: e.startYear,
//                     endMonth: e.endMonth,
//                     endYear: e.endYear,
//                     currentlyStudying: e.currentlyStudying,
//                     gpa: e.gpa,
//                     duration: e.duration
//                 })),
//                 workExperience: workExperience.map(w => ({
//                     _id: w._id,
//                     jobTitle: w.jobTitle,
//                     companyName: w.companyName,
//                     startMonth: w.startMonth,
//                     startYear: w.startYear,
//                     endMonth: w.endMonth,
//                     endYear: w.endYear,
//                     currentlyWorking: w.currentlyWorking,
//                     description: w.description,
//                     typeOfRole: w.typeOfRole,
//                     duration: w.duration
//                 }))
//             },
//             documents: {
//                 profileUrl: documents?.profileUrl || '',
//                 resumeUrl: documents?.resumeUrl || '',
//                 profilePublicId: documents?.profilePublicId,
//                 resumePublicId: documents?.resumePublicId
//             }
//         };

//         console.log(`✅ Profile fetched successfully for user: ${userId}`);

//         return res.status(200).json({
//             success: true,
//             ...profileData
//         });

//     } catch (error) {
//         console.error('❌ Error fetching user profile:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch user profile',
//             error: error.message
//         });
//     }
// };

// /**
//  * Update user demographics
//  * POST /api/user/demographics
//  */
// exports.updateDemographics = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const {
//             fullName,
//             email,
//             phoneNumber,
//             country,
//             state,
//             city,
//             headline,
//             bio
//         } = req.body;

//         console.log(`📝 Updating demographics for user: ${userId}`);

//         // Find existing demographics or create new
//         let demographics = await Demographics.findOne({ userId });

//         if (demographics) {
//             // Update existing
//             demographics.fullName = fullName || demographics.fullName;
//             demographics.email = email || demographics.email;
//             demographics.phoneNumber = phoneNumber || demographics.phoneNumber;
//             demographics.country = country || demographics.country;
//             demographics.state = state || demographics.state;
//             demographics.city = city || demographics.city;
//             demographics.headline = headline || demographics.headline;
//             demographics.bio = bio || demographics.bio;
//         } else {
//             // Create new
//             demographics = new Demographics({
//                 userId,
//                 fullName,
//                 email,
//                 phoneNumber,
//                 country,
//                 state,
//                 city,
//                 headline,
//                 bio
//             });
//         }

//         await demographics.save();

//         // Also update user's basic info
//         if (fullName) {
//             const nameParts = fullName.split(' ');
//             const firstName = nameParts[0] || '';
//             const lastName = nameParts.slice(1).join(' ') || '';

//             await User.findByIdAndUpdate(userId, {
//                 firstName,
//                 lastName,
//                 email: email || undefined
//             });
//         } else if (email) {
//             await User.findByIdAndUpdate(userId, { email });
//         }

//         console.log(`✅ Demographics updated successfully for user: ${userId}`);

//         return res.status(200).json({
//             success: true,
//             message: 'Profile updated successfully',
//             data: demographics
//         });

//     } catch (error) {
//         console.error('❌ Error updating demographics:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to update profile',
//             error: error.message
//         });
//     }
// };

// // ============= EDUCATION CONTROLLERS =============

// /**
//  * Get user education
//  * GET /api/user/education
//  */
// exports.getEducation = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const education = await Education.find({ userId }).sort({ startYear: -1, startMonth: -1 });

//         return res.status(200).json({
//             success: true,
//             data: education
//         });
//     } catch (error) {
//         console.error('❌ Error fetching education:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch education',
//             error: error.message
//         });
//     }
// };

// /**
//  * Add education
//  * POST /api/user/education
//  */
// exports.addEducation = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const educationData = {
//             userId,
//             ...req.body
//         };

//         // Calculate duration if start and end dates are provided
//         if (educationData.startYear && educationData.endYear && !educationData.currentlyStudying) {
//             const startDate = new Date(educationData.startYear, educationData.startMonth || 0);
//             const endDate = new Date(educationData.endYear, educationData.endMonth || 0);
//             const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//                 (endDate.getMonth() - startDate.getMonth());
//             educationData.duration = Math.max(0, months);
//         }

//         const education = new Education(educationData);
//         await education.save();

//         return res.status(201).json({
//             success: true,
//             message: 'Education added successfully',
//             data: education
//         });
//     } catch (error) {
//         console.error('❌ Error adding education:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to add education',
//             error: error.message
//         });
//     }
// };

// /**
//  * Update education
//  * PUT /api/user/education/:id
//  */
// exports.updateEducation = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;
//         const educationId = req.params.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const education = await Education.findOne({ _id: educationId, userId });

//         if (!education) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Education record not found'
//             });
//         }

//         // Update fields
//         Object.keys(req.body).forEach(key => {
//             education[key] = req.body[key];
//         });

//         // Recalculate duration if needed
//         if (req.body.startYear || req.body.endYear || req.body.currentlyStudying !== undefined) {
//             if (!education.currentlyStudying && education.startYear && education.endYear) {
//                 const startDate = new Date(education.startYear, education.startMonth || 0);
//                 const endDate = new Date(education.endYear, education.endMonth || 0);
//                 const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//                     (endDate.getMonth() - startDate.getMonth());
//                 education.duration = Math.max(0, months);
//             } else {
//                 education.duration = undefined;
//             }
//         }

//         await education.save();

//         return res.status(200).json({
//             success: true,
//             message: 'Education updated successfully',
//             data: education
//         });
//     } catch (error) {
//         console.error('❌ Error updating education:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to update education',
//             error: error.message
//         });
//     }
// };

// /**
//  * Delete education
//  * DELETE /api/user/education/:id
//  */
// exports.deleteEducation = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;
//         const educationId = req.params.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const result = await Education.deleteOne({ _id: educationId, userId });

//         if (result.deletedCount === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Education record not found'
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Education deleted successfully'
//         });
//     } catch (error) {
//         console.error('❌ Error deleting education:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to delete education',
//             error: error.message
//         });
//     }
// };

// // ============= WORK EXPERIENCE CONTROLLERS =============

// /**
//  * Get work experience
//  * GET /api/user/work
//  */
// exports.getWorkExperience = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const workExperience = await WorkExperience.find({ userId }).sort({ startYear: -1, startMonth: -1 });

//         return res.status(200).json({
//             success: true,
//             data: workExperience
//         });
//     } catch (error) {
//         console.error('❌ Error fetching work experience:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch work experience',
//             error: error.message
//         });
//     }
// };

// /**
//  * Add work experience
//  * POST /api/user/work
//  */
// exports.addWorkExperience = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const workData = {
//             userId,
//             ...req.body
//         };

//         // Calculate duration if start and end dates are provided
//         if (workData.startYear && workData.endYear && !workData.currentlyWorking) {
//             const startDate = new Date(workData.startYear, workData.startMonth || 0);
//             const endDate = new Date(workData.endYear, workData.endMonth || 0);
//             const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//                 (endDate.getMonth() - startDate.getMonth());
//             workData.duration = Math.max(0, months);
//         }

//         const workExperience = new WorkExperience(workData);
//         await workExperience.save();

//         return res.status(201).json({
//             success: true,
//             message: 'Work experience added successfully',
//             data: workExperience
//         });
//     } catch (error) {
//         console.error('❌ Error adding work experience:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to add work experience',
//             error: error.message
//         });
//     }
// };

// /**
//  * Update work experience
//  * PUT /api/user/work/:id
//  */
// exports.updateWorkExperience = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;
//         const workId = req.params.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const workExperience = await WorkExperience.findOne({ _id: workId, userId });

//         if (!workExperience) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Work experience record not found'
//             });
//         }

//         // Update fields
//         Object.keys(req.body).forEach(key => {
//             workExperience[key] = req.body[key];
//         });

//         // Recalculate duration if needed
//         if (req.body.startYear || req.body.endYear || req.body.currentlyWorking !== undefined) {
//             if (!workExperience.currentlyWorking && workExperience.startYear && workExperience.endYear) {
//                 const startDate = new Date(workExperience.startYear, workExperience.startMonth || 0);
//                 const endDate = new Date(workExperience.endYear, workExperience.endMonth || 0);
//                 const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
//                     (endDate.getMonth() - startDate.getMonth());
//                 workExperience.duration = Math.max(0, months);
//             } else {
//                 workExperience.duration = undefined;
//             }
//         }

//         await workExperience.save();

//         return res.status(200).json({
//             success: true,
//             message: 'Work experience updated successfully',
//             data: workExperience
//         });
//     } catch (error) {
//         console.error('❌ Error updating work experience:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to update work experience',
//             error: error.message
//         });
//     }
// };

// /**
//  * Delete work experience
//  * DELETE /api/user/work/:id
//  */
// exports.deleteWorkExperience = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;
//         const workId = req.params.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const result = await WorkExperience.deleteOne({ _id: workId, userId });

//         if (result.deletedCount === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Work experience record not found'
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Work experience deleted successfully'
//         });
//     } catch (error) {
//         console.error('❌ Error deleting work experience:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to delete work experience',
//             error: error.message
//         });
//     }
// };

// // ============= RESUME CONTROLLERS =============

// /**
//  * Upload resume
//  * POST /api/user/resume
//  */
// exports.uploadResume = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'No file uploaded'
//             });
//         }

//         console.log(`📄 Uploading resume for user: ${userId}`);

//         const resumeUrl = req.file.path;
//         const resumePublicId = req.file.filename;

//         // Update or create documents record
//         let documents = await Documents.findOne({ userId });

//         if (documents) {
//             documents.resumeUrl = resumeUrl;
//             documents.resumePublicId = resumePublicId;
//         } else {
//             documents = new Documents({
//                 userId,
//                 resumeUrl,
//                 resumePublicId
//             });
//         }

//         await documents.save();

//         return res.status(200).json({
//             success: true,
//             message: 'Resume uploaded successfully',
//             data: {
//                 resumeUrl,
//                 resumePublicId
//             }
//         });
//     } catch (error) {
//         console.error('❌ Error uploading resume:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to upload resume',
//             error: error.message
//         });
//     }
// };

// /**
//  * Get resume
//  * GET /api/user/resume
//  */
// exports.getResume = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         const documents = await Documents.findOne({ userId });

//         return res.status(200).json({
//             success: true,
//             data: {
//                 resumeUrl: documents?.resumeUrl || '',
//                 resumePublicId: documents?.resumePublicId || ''
//             }
//         });
//     } catch (error) {
//         console.error('❌ Error fetching resume:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch resume',
//             error: error.message
//         });
//     }
// };

// /**
//  * Upload profile picture
//  * POST /api/user/profile
//  */
// exports.uploadProfilePicture = async (req, res) => {
//     try {
//         const userId = req.headers['user-id'] || req.user?.id;

//         if (!userId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'User ID is required'
//             });
//         }

//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'No file uploaded'
//             });
//         }

//         console.log(`📸 Uploading profile picture for user: ${userId}`);

//         const profileUrl = req.file.path;
//         const profilePublicId = req.file.filename;

//         // Update or create documents record
//         let documents = await Documents.findOne({ userId });

//         if (documents) {
//             documents.profileUrl = profileUrl;
//             documents.profilePublicId = profilePublicId;
//         } else {
//             documents = new Documents({
//                 userId,
//                 profileUrl,
//                 profilePublicId
//             });
//         }

//         await documents.save();

//         return res.status(200).json({
//             success: true,
//             message: 'Profile picture uploaded successfully',
//             data: {
//                 profileUrl,
//                 profilePublicId
//             }
//         });
//     } catch (error) {
//         console.error('❌ Error uploading profile picture:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to upload profile picture',
//             error: error.message
//         });
//     }
// };



const User = require('../models/userModel');
const Demographics = require('../models/demographicsModel');
const Education = require('../models/educationModel');
const WorkExperience = require('../models/workModel');
const Document = require('../models/userDocumentModel');
const Certification = require('../models/certificationModel');
const Award = require('../models/awardModel');
const Project = require('../models/projectModel');


// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get user profile with all related data
 * GET /api/user/my-profile
 */
// controllers/userController.js

/**
 * Get user profile with all sections
 * GET /api/user/my-profile
 */
exports.getUserProfiles = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📊 [getUserProfile] Fetching profile for user: ${userId}`);

        // Fetch all user data in parallel
        const [
            user,
            demographics,
            education,
            workExperience,
            certifications,
            awards,
            projects,
            documents
        ] = await Promise.all([
            User.findById(userId).select('-password'),
            Demographics.findOne({ userId }),
            Education.find({ userId }).sort({ startYear: -1 }),
            WorkExperience.find({ userId }).sort({ startYear: -1, startMonth: -1 }),
            Certification.find({ userId }).sort({ issueDate: -1 }),
            Award.find({ userId }).sort({ year: -1 }),
            Project.find({ userId }).sort({ createdAt: -1 }),
            Document.findOne({ userId })
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Format the response
        const profileData = {
            userId: user._id,
            data: {
                demographics: demographics ? {
                    _id: demographics._id,
                    fullName: demographics.fullName || `${user.firstname} ${user.lastname}`,
                    email: demographics.email || user.email,
                    phoneNumber: demographics.phoneNumber || '',
                    country: demographics.country || '',
                    state: demographics.state || '',
                    city: demographics.city || '',
                    phoneVisibleToRecruiters: demographics.phoneVisibleToRecruiters || false,
                    createdAt: demographics.createdAt,
                    updatedAt: demographics.updatedAt
                } : null,
                education: education.map(e => ({
                    _id: e._id,
                    degree: e.degree,
                    fieldOfStudy: e.fieldOfStudy,
                    schoolName: e.schoolName,
                    startYear: e.startYear,
                    endYear: e.endYear,
                    currentlyStudying: e.currentlyStudying,
                    gpa: e.gpa,
                    duration: e.duration,
                    educationScore: e.educationScore,
                    schoolImage: e.schoolImage
                })),
                workExperience: workExperience.map(w => ({
                    _id: w._id,
                    jobTitle: w.jobTitle,
                    companyName: w.companyName,
                    startMonth: w.startMonth,
                    startYear: w.startYear,
                    endMonth: w.endMonth,
                    endYear: w.endYear,
                    currentlyWorking: w.currentlyWorking,
                    description: w.description,
                    typeOfRole: w.typeOfRole,
                    duration: w.duration,
                    workScore: w.workScore
                })),
                certifications: certifications.map(c => ({
                    _id: c._id,
                    certificationName: c.certificationName,
                    issuer: c.issuer,
                    issueDate: c.issueDate,
                    credentialLink: c.credentialLink,
                    certificateFileUrl: c.certificateFileUrl,
                    certificationScore: c.certificationScore
                })),
                awards: awards.map(a => ({
                    _id: a._id,
                    awardName: a.awardName,
                    description: a.description,
                    year: a.year,
                    awardScore: a.awardScore
                })),
                projects: projects.map(p => ({
                    _id: p._id,
                    projectName: p.projectName,
                    role: p.role,
                    summary: p.summary,
                    outcome: p.outcome,
                    link: p.link,
                    projectScore: p.projectScore
                }))
            },
            documents: {
                resumeUrl: documents?.resumeUrl || '',
                profileUrl: documents?.profileUrl || '',
                resumeOriginalName: documents?.resumeOriginalName || ''
            }
        };

        return res.status(200).json({
            success: true,
            ...profileData
        });

    } catch (error) {
        console.error('❌ [getUserProfile] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
};

/**
 * Update user demographics
 * POST /api/user/demographics
 */
exports.updateDemographics = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const {
            fullName,
            email,
            phoneNumber,
            country,
            state,
            city,
            phoneVisibleToRecruiters
        } = req.body;

        console.log(`📝 [updateDemographics] Updating demographics for user: ${userId}`);

        // Find existing demographics or create new
        let demographics = await Demographics.findOne({ userId });

        if (demographics) {
            // Update existing
            if (fullName) demographics.fullName = fullName;
            if (email) demographics.email = email;
            if (phoneNumber !== undefined) demographics.phoneNumber = phoneNumber;
            if (country) demographics.country = country;
            if (state) demographics.state = state;
            if (city) demographics.city = city;
            if (phoneVisibleToRecruiters !== undefined) {
                demographics.phoneVisibleToRecruiters = phoneVisibleToRecruiters;
            }
        } else {
            // Create new
            demographics = new Demographics({
                userId,
                fullName,
                email,
                phoneNumber,
                country,
                state,
                city,
                phoneVisibleToRecruiters: phoneVisibleToRecruiters || false
            });
        }

        await demographics.save();

        return res.status(200).json({
            success: true,
            message: 'Demographics updated successfully',
            data: demographics
        });

    } catch (error) {
        console.error('❌ [updateDemographics] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update demographics',
            error: error.message
        });
    }
};

// ==================== EDUCATION CONTROLLERS ====================

/**
 * Get all education for a user
 * GET /api/user/education
 */
exports.getEducation = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const education = await Education.find({ userId }).sort({ startYear: -1 });

        return res.status(200).json({
            success: true,
            data: education
        });

    } catch (error) {
        console.error('❌ [getEducation] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch education',
            error: error.message
        });
    }
};

/**
 * Create education entry
 * POST /api/user/education
 */
exports.createEducation = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { educations } = req.body;

        if (!educations || !Array.isArray(educations)) {
            return res.status(400).json({
                success: false,
                message: 'educations array is required'
            });
        }

        console.log(`📝 [createEducation] Creating ${educations.length} education entries for user: ${userId}`);

        const createdEducations = [];

        for (const edu of educations) {
            // Calculate duration if not provided
            let duration = edu.duration;
            if (!duration && edu.startYear) {
                const endYear = edu.currentlyStudying ? new Date().getFullYear() : edu.endYear;
                duration = Math.max(0, endYear - edu.startYear);
            }

            const education = new Education({
                userId,
                degree: edu.degree,
                fieldOfStudy: edu.fieldOfStudy,
                schoolName: edu.schoolName,
                startYear: edu.startYear,
                endYear: edu.currentlyStudying ? null : edu.endYear,
                currentlyStudying: edu.currentlyStudying || false,
                gpa: edu.gpa,
                duration: duration || 0,
                educationScore: edu.educationScore || 0,
                schoolImage: edu.schoolImage
            });

            await education.save();
            createdEducations.push(education);
        }

        return res.status(201).json({
            success: true,
            message: 'Education created successfully',
            data: createdEducations
        });

    } catch (error) {
        console.error('❌ [createEducation] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create education',
            error: error.message
        });
    }
};

/**
 * Update education entry
 * PUT /api/user/education/:id
 */
exports.updateEducation = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const updateData = req.body;

        console.log(`📝 [updateEducation] Updating education ID: ${id} for user: ${userId}`);

        // Recalculate duration if years changed
        if (updateData.startYear || updateData.endYear) {
            const endYear = updateData.currentlyStudying ? new Date().getFullYear() : updateData.endYear;
            updateData.duration = Math.max(0, (endYear || 0) - (updateData.startYear || 0));
        }

        const education = await Education.findOneAndUpdate(
            { _id: id, userId },
            updateData,
            { new: true }
        );

        if (!education) {
            return res.status(404).json({
                success: false,
                message: 'Education not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Education updated successfully',
            data: education
        });

    } catch (error) {
        console.error('❌ [updateEducation] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update education',
            error: error.message
        });
    }
};

/**
 * Delete education entry
 * DELETE /api/user/education/:id
 */
exports.deleteEducation = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🗑️ [deleteEducation] Deleting education ID: ${id} for user: ${userId}`);

        const education = await Education.findOneAndDelete({ _id: id, userId });

        if (!education) {
            return res.status(404).json({
                success: false,
                message: 'Education not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Education deleted successfully'
        });

    } catch (error) {
        console.error('❌ [deleteEducation] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete education',
            error: error.message
        });
    }
};

// ==================== WORK EXPERIENCE CONTROLLERS ====================

/**
 * Get all work experiences
 * GET /api/user/experience
 */
exports.getWorkExperiences = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const experiences = await WorkExperience.find({ userId }).sort({ startYear: -1, startMonth: -1 });

        return res.status(200).json({
            success: true,
            data: experiences
        });

    } catch (error) {
        console.error('❌ [getWorkExperiences] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch work experiences',
            error: error.message
        });
    }
};

/**
 * Create work experience
 * POST /api/user/experience
 */
exports.createWorkExperience = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { workExperiences } = req.body;

        if (!workExperiences || !Array.isArray(workExperiences)) {
            return res.status(400).json({
                success: false,
                message: 'workExperiences array is required'
            });
        }

        console.log(`📝 [createWorkExperience] Creating ${workExperiences.length} experiences for user: ${userId}`);

        const createdExperiences = [];

        for (const exp of workExperiences) {
            // Calculate duration in months
            let duration = exp.duration;
            if (!duration && exp.startYear && exp.startMonth) {
                const startDate = new Date(exp.startYear, exp.startMonth - 1);
                const endDate = exp.currentlyWorking
                    ? new Date()
                    : new Date(exp.endYear, exp.endMonth - 1);

                duration = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                    (endDate.getMonth() - startDate.getMonth());
                duration = Math.max(0, duration);
            }

            const experience = new WorkExperience({
                userId,
                jobTitle: exp.jobTitle,
                companyName: exp.companyName,
                startMonth: exp.startMonth,
                startYear: exp.startYear,
                endMonth: exp.currentlyWorking ? null : exp.endMonth,
                endYear: exp.currentlyWorking ? null : exp.endYear,
                currentlyWorking: exp.currentlyWorking || false,
                description: exp.description,
                typeOfRole: exp.typeOfRole,
                duration: duration || 0,
                workScore: exp.workScore || 0
            });

            await experience.save();
            createdExperiences.push(experience);
        }

        return res.status(201).json({
            success: true,
            message: 'Work experiences created successfully',
            data: createdExperiences
        });

    } catch (error) {
        console.error('❌ [createWorkExperience] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create work experience',
            error: error.message
        });
    }
};

/**
 * Update work experience
 * PUT /api/user/experience/:id
 */
exports.updateWorkExperience = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const updateData = req.body;

        console.log(`📝 [updateWorkExperience] Updating experience ID: ${id} for user: ${userId}`);

        // Recalculate duration if dates changed
        if (updateData.startYear || updateData.startMonth || updateData.endYear || updateData.endMonth) {
            const startDate = new Date(updateData.startYear || 0, (updateData.startMonth || 1) - 1);
            const endDate = updateData.currentlyWorking
                ? new Date()
                : new Date(updateData.endYear || 0, (updateData.endMonth || 12) - 1);

            updateData.duration = Math.max(0,
                (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth())
            );
        }

        const experience = await WorkExperience.findOneAndUpdate(
            { _id: id, userId },
            updateData,
            { new: true }
        );

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Work experience not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Work experience updated successfully',
            data: experience
        });

    } catch (error) {
        console.error('❌ [updateWorkExperience] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update work experience',
            error: error.message
        });
    }
};

/**
 * Delete work experience
 * DELETE /api/user/experience/:id
 */
exports.deleteWorkExperience = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🗑️ [deleteWorkExperience] Deleting experience ID: ${id} for user: ${userId}`);

        const experience = await WorkExperience.findOneAndDelete({ _id: id, userId });

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Work experience not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Work experience deleted successfully'
        });

    } catch (error) {
        console.error('❌ [deleteWorkExperience] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete work experience',
            error: error.message
        });
    }
};

// ==================== CERTIFICATION CONTROLLERS ====================

/**
 * Get all certifications
 * GET /api/user/certifications
 */
exports.getCertifications = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const certifications = await Certification.find({ userId }).sort({ issueDate: -1 });

        return res.status(200).json({
            success: true,
            data: certifications
        });

    } catch (error) {
        console.error('❌ [getCertifications] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch certifications',
            error: error.message
        });
    }
};

/**
 * Create certification
 * POST /api/user/certifications
 */
exports.createCertification = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { certifications } = req.body;

        if (!certifications || !Array.isArray(certifications)) {
            return res.status(400).json({
                success: false,
                message: 'certifications array is required'
            });
        }

        console.log(`📝 [createCertification] Creating ${certifications.length} certifications for user: ${userId}`);

        const createdCertifications = [];

        for (const cert of certifications) {
            const certification = new Certification({
                userId,
                certificationName: cert.certificationName,
                issuer: cert.issuer,
                issueDate: cert.issueDate,
                credentialLink: cert.credentialLink,
                certificateFileUrl: cert.certificateFileUrl,
                certificationScore: cert.certificationScore || 5
            });

            await certification.save();
            createdCertifications.push(certification);
        }

        return res.status(201).json({
            success: true,
            message: 'Certifications created successfully',
            data: createdCertifications
        });

    } catch (error) {
        console.error('❌ [createCertification] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create certification',
            error: error.message
        });
    }
};

/**
 * Update certification
 * PUT /api/user/certifications/:id
 */
exports.updateCertification = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📝 [updateCertification] Updating certification ID: ${id} for user: ${userId}`);

        const certification = await Certification.findOneAndUpdate(
            { _id: id, userId },
            req.body,
            { new: true }
        );

        if (!certification) {
            return res.status(404).json({
                success: false,
                message: 'Certification not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Certification updated successfully',
            data: certification
        });

    } catch (error) {
        console.error('❌ [updateCertification] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update certification',
            error: error.message
        });
    }
};

/**
 * Delete certification
 * DELETE /api/user/certifications/:id
 */
exports.deleteCertification = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🗑️ [deleteCertification] Deleting certification ID: ${id} for user: ${userId}`);

        const certification = await Certification.findOneAndDelete({ _id: id, userId });

        if (!certification) {
            return res.status(404).json({
                success: false,
                message: 'Certification not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Certification deleted successfully'
        });

    } catch (error) {
        console.error('❌ [deleteCertification] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete certification',
            error: error.message
        });
    }
};

// ==================== AWARD CONTROLLERS ====================

/**
 * Get all awards
 * GET /api/user/awards
 */
exports.getAwards = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const awards = await Award.find({ userId }).sort({ year: -1 });

        return res.status(200).json({
            success: true,
            data: awards
        });

    } catch (error) {
        console.error('❌ [getAwards] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch awards',
            error: error.message
        });
    }
};

/**
 * Create award
 * POST /api/user/awards
 */
exports.createAward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { awards } = req.body;

        if (!awards || !Array.isArray(awards)) {
            return res.status(400).json({
                success: false,
                message: 'awards array is required'
            });
        }

        console.log(`📝 [createAward] Creating ${awards.length} awards for user: ${userId}`);

        const createdAwards = [];

        for (const aw of awards) {
            const award = new Award({
                userId,
                awardName: aw.awardName,
                description: aw.description,
                year: aw.year,
                awardScore: aw.awardScore || 5
            });

            await award.save();
            createdAwards.push(award);
        }

        return res.status(201).json({
            success: true,
            message: 'Awards created successfully',
            data: createdAwards
        });

    } catch (error) {
        console.error('❌ [createAward] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create award',
            error: error.message
        });
    }
};

/**
 * Update award
 * PUT /api/user/awards/:id
 */
exports.updateAward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📝 [updateAward] Updating award ID: ${id} for user: ${userId}`);

        const award = await Award.findOneAndUpdate(
            { _id: id, userId },
            req.body,
            { new: true }
        );

        if (!award) {
            return res.status(404).json({
                success: false,
                message: 'Award not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Award updated successfully',
            data: award
        });

    } catch (error) {
        console.error('❌ [updateAward] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update award',
            error: error.message
        });
    }
};

/**
 * Delete award
 * DELETE /api/user/awards/:id
 */
exports.deleteAward = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🗑️ [deleteAward] Deleting award ID: ${id} for user: ${userId}`);

        const award = await Award.findOneAndDelete({ _id: id, userId });

        if (!award) {
            return res.status(404).json({
                success: false,
                message: 'Award not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Award deleted successfully'
        });

    } catch (error) {
        console.error('❌ [deleteAward] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete award',
            error: error.message
        });
    }
};

// ==================== PROJECT CONTROLLERS ====================

/**
 * Get all projects
 * GET /api/user/projects
 */
exports.getProjects = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const projects = await Project.find({ userId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: projects
        });

    } catch (error) {
        console.error('❌ [getProjects] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: error.message
        });
    }
};

/**
 * Create project
 * POST /api/user/projects
 */
exports.createProject = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { projects } = req.body;

        if (!projects || !Array.isArray(projects)) {
            return res.status(400).json({
                success: false,
                message: 'projects array is required'
            });
        }

        console.log(`📝 [createProject] Creating ${projects.length} projects for user: ${userId}`);

        const createdProjects = [];

        for (const proj of projects) {
            const project = new Project({
                userId,
                projectName: proj.projectName,
                role: proj.role,
                summary: proj.summary,
                outcome: proj.outcome,
                link: proj.link,
                projectScore: proj.projectScore || 3
            });

            await project.save();
            createdProjects.push(project);
        }

        return res.status(201).json({
            success: true,
            message: 'Projects created successfully',
            data: createdProjects
        });

    } catch (error) {
        console.error('❌ [createProject] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create project',
            error: error.message
        });
    }
};

/**
 * Update project
 * PUT /api/user/projects/:id
 */
exports.updateProject = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`📝 [updateProject] Updating project ID: ${id} for user: ${userId}`);

        const project = await Project.findOneAndUpdate(
            { _id: id, userId },
            req.body,
            { new: true }
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });

    } catch (error) {
        console.error('❌ [updateProject] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update project',
            error: error.message
        });
    }
};

/**
 * Delete project
 * DELETE /api/user/projects/:id
 */
exports.deleteProject = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🗑️ [deleteProject] Deleting project ID: ${id} for user: ${userId}`);

        const project = await Project.findOneAndDelete({ _id: id, userId });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('❌ [deleteProject] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete project',
            error: error.message
        });
    }
};

// ==================== DOCUMENT CONTROLLERS ====================

/**
 * Upload profile picture
 * POST /api/user/profile-picture
 */
exports.uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log(`📸 [uploadProfilePicture] Uploading for user: ${userId}`);

        const profileUrl = req.file.path;

        // Update or create document record
        let document = await Document.findOne({ userId });

        if (document) {
            document.profileUrl = profileUrl;
        } else {
            document = new Document({
                userId,
                profileUrl
            });
        }

        await document.save();

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { profileUrl }
        });

    } catch (error) {
        console.error('❌ [uploadProfilePicture] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture',
            error: error.message
        });
    }
};

/**
 * Upload resume
 * POST /api/user/resume
 */
exports.uploadResume = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log(`📄 [uploadResume] Uploading for user: ${userId}`);

        const resumeUrl = req.file.path;
        const resumeOriginalName = req.file.originalname;

        // Update or create document record
        let document = await Document.findOne({ userId });

        if (document) {
            document.resumeUrl = resumeUrl;
            document.resumeOriginalName = resumeOriginalName;
        } else {
            document = new Document({
                userId,
                resumeUrl,
                resumeOriginalName
            });
        }

        await document.save();

        return res.status(200).json({
            success: true,
            message: 'Resume uploaded successfully',
            data: { resumeUrl, resumeOriginalName }
        });

    } catch (error) {
        console.error('❌ [uploadResume] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload resume',
            error: error.message
        });
    }
};

// At the bottom of your userController.js file


