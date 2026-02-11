const XLSX = require("xlsx");
const fs = require("fs");
const path = require('path');
const CaseStudy = require("../models/caseStudyModel");
const CaseOpening = require("../models/caseOpeningModel");
const CaseQuestion = require("../models/caseQuestionsModel");
const CaseReveal = require("../models/caseReveal");
const domainModel = require("../models/domainModel");

exports.importCaseStudiesFromExcel = async (req, res) => {
  console.log('=== IMPORT CASE STUDIES START ===');
  
  try {
    // Validate file
    if (!req.file || !req.file.path) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    console.log(`File uploaded: ${req.file.path}`);
    console.log(`Original name: ${req.file.originalname}`);
    console.log(`Mimetype: ${req.file.mimetype}`);
    
    // Read and parse the file
    let rows = [];
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Read file content as text first for debugging
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`\n=== FILE CONTENT (first 500 chars) ===`);
    console.log(fileContent.substring(0, 500));
    
    if (fileExtension === '.csv' || fileContent.includes('CaseCode,Title')) {
      console.log('\nDetected CSV format or CSV content');
      rows = parseCSVContent(fileContent);
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      console.log('\nDetected Excel format');
      rows = parseExcelFile(filePath);
    } else {
      console.log('\nUnknown file format, trying both methods...');
      try {
        rows = parseCSVContent(fileContent);
      } catch (csvErr) {
        console.log('CSV parse failed, trying Excel...');
        rows = parseExcelFile(filePath);
      }
    }
    
    console.log(`\nParsed ${rows.length} rows from file`);
    
    if (rows.length === 0) {
      // Clean up file
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        error: 'No valid data found in file' 
      });
    }
    
    // Show sample of parsed data
    console.log('\n=== SAMPLE PARSED DATA ===');
    console.log('First row keys:', Object.keys(rows[0]));
    console.log('First row:', JSON.stringify(rows[0], null, 2));
    
    // Process the data
    const result = await processCaseStudyData(rows);
    
    // Clean up file
    fs.unlinkSync(filePath);
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    res.json(result);
    
  } catch (err) {
    console.error('\n=== IMPORT ERROR ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    
    // Clean up file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Helper function to parse CSV content
function parseCSVContent(content) {
  console.log('Parsing CSV content...');
  
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse headers (handle quoted strings and trim)
  const headers = lines[0].split(',').map(header => {
    // Remove quotes if present and trim
    let h = header.trim();
    if (h.startsWith('"') && h.endsWith('"')) {
      h = h.substring(1, h.length - 1);
    }
    return h.trim();
  });
  
  console.log('CSV Headers:', headers);
  
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Simple CSV parsing (for well-formatted CSV without commas in values)
    const values = line.split(',').map(value => {
      let v = value.trim();
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.substring(1, v.length - 1);
      }
      return v.trim();
    });
    
    // Create row object
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Only add row if it has data
    if (Object.values(row).some(val => val && val.toString().trim())) {
      rows.push(row);
    }
  }
  
  return rows;
}

// Helper function to parse Excel file
function parseExcelFile(filePath) {
  console.log('Parsing Excel file...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  console.log(`Sheet name: ${sheetName}`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with headers
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',        // Default value for empty cells
    raw: false,        // Convert numbers to strings
    dateNF: 'yyyy-mm-dd' // Date format
  });
  
  // Clean up keys (remove extra spaces)
  const cleanedRows = rows.map(row => {
    const cleaned = {};
    Object.keys(row).forEach(key => {
      const cleanedKey = key.toString().trim();
      const value = row[key];
      cleaned[cleanedKey] = typeof value === 'string' ? value.trim() : value;
    });
    return cleaned;
  });
  
  return cleanedRows;
}

// Main processing function
async function processCaseStudyData(rows) {
  console.log('\n=== PROCESSING DATA ===');
  
  let casesInserted = 0;
  let questionsInserted = 0;
  let openingsInserted = 0;
  let revealsInserted = 0;
  let skipped = 0;
  
  const caseMap = {}; // Track cases by caseCode in this session
  const domainCache = {}; // Cache domains by name
  
  // First, get all existing caseCodes for quick lookup
  const existingCaseCodes = await CaseStudy.find({}, 'caseCode').lean();
  const existingCaseCodeSet = new Set(existingCaseCodes.map(c => c.caseCode));
  console.log(`Existing caseCodes in DB: ${Array.from(existingCaseCodeSet).join(', ')}`);
  
  for (const [index, row] of rows.entries()) {
    console.log(`\n--- Processing Row ${index + 1} (Excel row ${index + 2}) ---`);
    
    // Extract and normalize data
    const caseCode = (row.CaseCode || row.caseCode || '').toString().trim().toUpperCase();
    const title = (row.Title || row.title || '').toString().trim();
    const description = (row.Description || row.description || '').toString().trim();
    const maxAttempts = parseInt(row.MaxAttempts || row.maxAttempts || '2');
    
    // Domain can be from Domain, DomainName, or DomainId column
    const domainNameFromExcel = (row.Domain || row.DomainName || row.domain || '').toString().trim();
    const domainIdFromExcel = (row.DomainId || row.domainId || '').toString().trim();
    
    console.log(`CaseCode: "${caseCode}"`);
    console.log(`Title: "${title}"`);
    console.log(`Domain Name: "${domainNameFromExcel}"`);
    console.log(`Domain ID: "${domainIdFromExcel}"`);
    
    // VALIDATION 1: Check required fields
    if (!caseCode) {
      console.log(`❌ SKIP: Missing CaseCode`);
      skipped++;
      continue;
    }
    
    if (!title) {
      console.log(`❌ SKIP: Missing Title`);
      skipped++;
      continue;
    }
    
    if (!domainNameFromExcel && !domainIdFromExcel) {
      console.log(`❌ SKIP: Missing Domain (both name and ID)`);
      skipped++;
      continue;
    }
    
    console.log(`✅ Validation passed`);
    
    /* ---------------- DOMAIN HANDLING ---------------- */
    let domain;
    
    try {
      if (domainIdFromExcel) {
        // Find domain by ID
        domain = await domainModel.findById(domainIdFromExcel);
        if (!domain) {
          console.log(`❌ SKIP: Domain ID "${domainIdFromExcel}" not found`);
          skipped++;
          continue;
        }
        console.log(`Found domain by ID: ${domain.name} (${domain._id})`);
      } else {
        // Find or create domain by name (case-insensitive)
        const domainKey = domainNameFromExcel.toLowerCase().trim();
        
        if (domainCache[domainKey]) {
          domain = domainCache[domainKey];
          console.log(`Using cached domain: ${domain.name}`);
        } else {
          // Find existing domain (case-insensitive)
          domain = await domainModel.findOne({
            name: { $regex: new RegExp(`^${domainNameFromExcel}$`, 'i') }
          });
          
          if (!domain) {
            console.log(`Creating new domain: "${domainNameFromExcel}"`);
            domain = await domainModel.create({
              name: domainNameFromExcel,
              description: `Domain for ${domainNameFromExcel} case studies`
            });
          } else {
            console.log(`Found existing domain: ${domain.name}`);
          }
          
          domainCache[domainKey] = domain;
        }
      }
    } catch (domainErr) {
      console.log(`❌ SKIP: Domain error - ${domainErr.message}`);
      skipped++;
      continue;
    }
    
    /* ---------------- CASE STUDY HANDLING ---------------- */
    let caseId;
    let isCaseNew = false;
    
    // Check if we've already processed this caseCode in current session
    if (caseMap[caseCode]) {
      caseId = caseMap[caseCode];
      console.log(`Using case from current session: ${caseCode} -> ${caseId}`);
    } else {
      // Check if case already exists in database
      if (existingCaseCodeSet.has(caseCode)) {
        const existingCase = await CaseStudy.findOne({ caseCode });
        caseId = existingCase._id;
        console.log(`Case exists in DB: ${caseCode} -> ${caseId}`);
        
        // Update existing case if needed
        await CaseStudy.updateOne(
          { _id: caseId },
          {
            title,
            description,
            maxAttempts,
            domainId: domain._id,
            domainName: domain.name
          }
        );
      } else {
        // Create new case
        const newCase = await CaseStudy.create({
          caseCode,
          title,
          description,
          maxAttempts,
          domainId: domain._id,
          domainName: domain.name,
          isActive: false
        });
        caseId = newCase._id;
        casesInserted++;
        isCaseNew = true;
        existingCaseCodeSet.add(caseCode); // Add to set to prevent duplicate creation
        console.log(`Created new case: ${caseCode} -> ${caseId}`);
      }
      
      caseMap[caseCode] = caseId;
    }
    
    /* ---------------- OPENING HANDLING ---------------- */
    const openingText = (row.OpeningText || row.openingText || '').toString().trim();
    const year = (row.Year || row.year || '').toString().trim();
    const marketContext = (row.MarketContext || row.marketContext || '').toString().trim();
    
    if (openingText) {
      const existingOpening = await CaseOpening.findOne({ caseCode });
      
      if (!existingOpening) {
        await CaseOpening.create({
          caseId,
          caseCode,
          openingText,
          year,
          marketContext
        });
        openingsInserted++;
        console.log(`Created opening for ${caseCode}`);
      } else {
        console.log(`Opening already exists for ${caseCode}`);
      }
    }
    
    /* ---------------- QUESTION HANDLING ---------------- */
    const questionText = (row.QuestionText || row.questionText || '').toString().trim();
    const correctOption = (row.CorrectOption || row.correctOption || '').toString().trim();
    const questionOrder = parseInt(row.QuestionOrder || row.questionOrder || '1');
    const contextText = (row.ContextText || row.contextText || '').toString().trim();
    
    if (questionText && correctOption) {
      // Build options array
      const options = [];
      
      // Check all possible option columns
      const optionKeys = ['Option1', 'Option2', 'Option3', 'Option4',
                         'option1', 'option2', 'option3', 'option4'];
      
      for (let i = 0; i < 4; i++) {
        const optionText = (row[`Option${i+1}`] || row[`option${i+1}`] || '').toString().trim();
        if (optionText) {
          options.push({
            key: String(i + 1),
            text: optionText
          });
        }
      }
      
      if (options.length < 2) {
        console.log(`⚠️  SKIP QUESTION: Need at least 2 options for question`);
        // Don't skip the entire row, just this question
      } else {
        // Check if this specific question already exists
        const existingQuestion = await CaseQuestion.findOne({
          caseId,
          order: questionOrder
        });
        
        if (!existingQuestion) {
          await CaseQuestion.create({
            caseId,
            caseCode,
            order: questionOrder,
            questionText,
            contextText,
            options,
            correctOption
          });
          questionsInserted++;
          console.log(`Created question ${questionOrder} for ${caseCode}`);
        } else {
          console.log(`Question ${questionOrder} already exists for ${caseCode}`);
        }
      }
    } else {
      console.log(`⚠️  No question data in this row`);
    }
    
    /* ---------------- REVEAL HANDLING ---------------- */
    const revealCompany = (row.RevealCompany || row.revealCompany || '').toString().trim();
    const fullStory = (row.FullStory || row.fullStory || '').toString().trim();
    const lesson = (row.Lesson || row.lesson || '').toString().trim();
    
    if (revealCompany) {
      const existingReveal = await CaseReveal.findOne({ caseCode });
      
      if (!existingReveal) {
        // Prepare decision breakdown
        const decisionBreakdown = [];
        
        if (questionOrder && correctOption) {
          decisionBreakdown.push({
            questionOrder,
            correctAnswer: correctOption,
            explanation: contextText || '',
            lesson: lesson || ''
          });
        }
        
        await CaseReveal.create({
          caseId,
          caseCode,
          realCompanyName: revealCompany,
          fullStory,
          decisionBreakdown
        });
        revealsInserted++;
        console.log(`Created reveal for ${caseCode}`);
      } else {
        console.log(`Reveal already exists for ${caseCode}`);
      }
    }
  }
  
  console.log('\n=== PROCESSING COMPLETE ===');
  
  return {
    success: true,
    casesInserted,
    openingsInserted,
    questionsInserted,
    revealsInserted,
    skipped,
    totalRows: rows.length,
    message: `Processed ${rows.length} rows. ${casesInserted} new cases added.`
  };
}

// Optional: Add a test route to check file format
exports.testFileFormat = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Clean up
    fs.unlinkSync(filePath);
    
    res.json({
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      first500Chars: content.substring(0, 500),
      isCSV: content.includes(','),
      lineCount: content.split('\n').length,
      firstLine: content.split('\n')[0]
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Optional: Clear all data (for testing)
exports.clearAllData = async (req, res) => {
  try {
    const caseCount = await CaseStudy.countDocuments();
    const openingCount = await CaseOpening.countDocuments();
    const questionCount = await CaseQuestion.countDocuments();
    const revealCount = await CaseReveal.countDocuments();
    
    await CaseStudy.deleteMany({});
    await CaseOpening.deleteMany({});
    await CaseQuestion.deleteMany({});
    await CaseReveal.deleteMany({});
    
    res.json({
      success: true,
      message: 'All data cleared',
      deleted: {
        cases: caseCount,
        openings: openingCount,
        questions: questionCount,
        reveals: revealCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
