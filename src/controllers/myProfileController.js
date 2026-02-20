// controllers/userController.js
// const User = require('../models/User');
// const Demographics = require('../models/Demographics');
// const Education = require('../models/Education');
// const WorkExperience = require('../models/WorkExperience');
// const Documents = require('../models/Documents');

// /**
//  * Get user profile with all related data
//  * GET /api/user/my-profile
//  */
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
//                     startYear: e.startYear,
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

//         // Here you would typically upload to cloud storage (Cloudinary, S3, etc.)
//         // For this example, we'll assume you're using Cloudinary
//         const profileUrl = req.file.path; // or Cloudinary URL
//         const profilePublicId = req.file.filename; // or Cloudinary public_id

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

//         console.log(`✅ Profile picture uploaded successfully for user: ${userId}`);

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