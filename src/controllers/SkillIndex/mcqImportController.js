const XLSX = require("xlsx");
const fs = require("fs");
const Domain = require("../../models/domainModel");
const McqQuestion = require("../../models/mcqQuestionModel");

exports.importMcqFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let inserted = 0;
    let skipped = 0;
    let domainCreated = 0;

    for (const row of rows) {
      const domainName = row.Domain?.trim();
      const question = row.Question?.trim();

      if (!domainName || !question) {
        skipped++;
        continue;
      }

      // 1️⃣ Find or Create Domain
      let domain = await Domain.findOne({ name: domainName });

      if (!domain) {
        domain = await Domain.create({ name: domainName });
        domainCreated++;
      }

      // 2️⃣ Check duplicate question in SAME domain
      const exists = await McqQuestion.findOne({
        domainId: domain._id,
        question,
      });

      if (exists) {
        skipped++;
        continue;
      }

      // 3️⃣ Create Question
      await McqQuestion.create({
        domainId: domain._id,
        question,
        description: row.Description || "",
        option1: row.Option1,
        option2: row.Option2,
        option3: row.Option3,
        option4: row.Option4,
        correctAnswer: Number(row.CorrectAnswer),
      });

      inserted++;
    }

    fs.unlinkSync(req.file.path);

    res.json({
      inserted,
      skipped,
      domainCreated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
