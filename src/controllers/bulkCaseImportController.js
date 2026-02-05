const XLSX = require("xlsx");
const fs = require("fs");
const CaseStudy = require("../models/caseStudyModel");
const CaseOpening = require("../models/caseOpeningModel");
const CaseQuestion = require("../models/caseQuestionsModel");
const CaseReveal = require("../models/caseReveal");

exports.importCaseStudiesFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let casesInserted = 0;
    let questionsInserted = 0;
    let openingsInserted = 0;
    let revealsInserted = 0;
    let skipped = 0;

    const caseMap = {}; // Map caseCode => caseId

    for (const [index, row] of rows.entries()) {
      const caseCode = row.CaseCode?.toString().trim().toUpperCase();
      const title = row.Title?.toString().trim();
      const description = row.Description?.toString().trim();
      const maxAttempts = Number(row.MaxAttempts) || 2;

      if (!caseCode || !title) {
        console.log(`Row ${index + 2} skipped: Missing CaseCode or Title`);
        skipped++;
        continue;
      }

      let caseId;
      // ✅ Create case if not already created
      if (!caseMap[caseCode]) {
        const existingCase = await CaseStudy.findOne({ caseCode });
        if (existingCase) {
          caseId = existingCase._id;
        } else {
          const newCase = await CaseStudy.create({
            caseCode,
            title,
            description,
            maxAttempts,
            isActive: false
          });
          caseId = newCase._id;
          casesInserted++;
        }
        caseMap[caseCode] = caseId;
      } else {
        caseId = caseMap[caseCode];
      }

      // 1️⃣ Create opening if provided (only once per case)
      if (row.OpeningText && !await CaseOpening.findOne({ caseCode })) {
        await CaseOpening.create({
          caseId,
          caseCode,
          openingText: row.OpeningText,
          year: row.Year,
          marketContext: row.MarketContext
        });
        openingsInserted++;
      }

      // 2️⃣ Create question if provided
      if (row.QuestionText && row.CorrectOption) {
        // Prepare options array
        const options = [];
        ["Option1", "Option2", "Option3", "Option4"].forEach((key, i) => {
          if (row[key]) options.push({ key: String(i + 1), text: row[key] });
        });

        if (options.length < 2) {
          console.log(`Row ${index + 2} skipped: Not enough options`);
          skipped++;
          continue;
        }

        await CaseQuestion.create({
          caseId,
          caseCode,
          order: Number(row.QuestionOrder) || 1,
          questionText: row.QuestionText,
          contextText: row.ContextText || "",
          options,
          correctOption: row.CorrectOption.toString()
        });
        questionsInserted++;
      }

      // 3️⃣ Create reveal if provided (only once per case)
      if (row.RevealCompany && !await CaseReveal.findOne({ caseCode })) {
        await CaseReveal.create({
          caseId,
          caseCode,
          realCompanyName: row.RevealCompany,
          fullStory: row.FullStory,
          decisionBreakdown: [
            {
              questionOrder: row.QuestionOrder || 1,
              correctAnswer: row.CorrectOption,
              explanation: row.Explanation || "",
              lesson: row.Lesson || ""
            }
          ]
        });
        revealsInserted++;
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      casesInserted,
      openingsInserted,
      questionsInserted,
      revealsInserted,
      skipped
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
