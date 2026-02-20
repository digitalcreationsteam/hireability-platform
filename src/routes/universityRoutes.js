// routes/universityRoutes.js
const express = require("express");
const router = express.Router();
const educationController = require("../controllers/educationController");
const UniversitySyncService = require("../services/universitySyncService");

// Search universities (for autocomplete)
router.get("/search", educationController.searchUniversities);

// Sync universities from API
router.post("/sync", async (req, res) => {
    try {
        const count = await UniversitySyncService.syncAll();
        res.json({
            success: true,
            message: `Synced ${count} universities successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get university by name
router.get("/:name", async (req, res) => {
    try {
        const University = require("../models/universityModel");
        const university = await University.findOne({
            name: { $regex: req.params.name, $options: "i" }
        });
        res.json({ success: true, data: university });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;