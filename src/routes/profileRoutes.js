// // routes/userRoutes.js
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const path = require('path');
// const userController = require('../controllers/myProfileController');
// const authMiddleware = require('../middleware/authMiddleware');

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });

// const fileFilter = (req, file, cb) => {
//     const allowedTypes = /jpeg|jpg|png|gif/;
//     const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = allowedTypes.test(file.mimetype);

//     if (mimetype && extname) {
//         return cb(null, true);
//     } else {
//         cb(new Error('Only image files are allowed'));
//     }
// };

// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     fileFilter: fileFilter
// });

// // Public routes (if any)
// // router.get('/public/:id', userController.getPublicProfile);

// // Protected routes - require authentication
// router.use(authMiddleware.verifyToken);

// // Profile routes
// router.get('/my-profile', userController.getUserProfile);
// router.post('/demographics', userController.updateDemographics);
// router.post('/profile', upload.single('profile'), userController.uploadProfilePicture);

// // Education routes
// router.get('/education', userController.getEducation);
// router.post('/education', userController.addEducation);
// router.put('/education/:id', userController.updateEducation);
// router.delete('/education/:id', userController.deleteEducation);

// // Work Experience routes
// router.get('/work', userController.getWorkExperience);
// router.post('/work', userController.addWorkExperience);
// router.put('/work/:id', userController.updateWorkExperience);
// router.delete('/work/:id', userController.deleteWorkExperience);

// // Resume routes
// router.post('/resume', upload.single('resume'), userController.uploadResume);
// router.get('/resume', userController.getResume);

// module.exports = router;