const express = require("express");
const router = express.Router();
const { searchUniversities } = require("../controllers/universityController");

// GET /universities?query=harv&country=United%20States&limit=20
router.get("/", searchUniversities);

module.exports = router;
