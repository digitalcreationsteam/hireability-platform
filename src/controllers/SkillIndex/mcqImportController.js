const XLSX = require("xlsx");
const fs = require("fs");
const Domain = require("../../models/domainModel");
const SubDomain = require("../../models/subDomainModel");
const McqQuestion = require("../../models/mcqQuestionModel");

exports.importMcqFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let inserted = 0;
    let skipped = 0;
    let domainCreated = 0;
    let subDomainCreated = 0;

    for (const [index, row] of rows.entries()) {
      const domainName = row.Domain?.toString().trim();
      const subDomainName = row.SubDomain?.toString().trim();
      const question = row.Question?.toString().trim();

      // ❌ Required fields check
      if (!domainName || !subDomainName || !question) {
        console.log(`Row ${index + 2} skipped: Missing Domain/SubDomain/Question`);
        skipped++;
        continue;
      }

      // ❌ Options check
      if (
        !row.Option1 ||
        !row.Option2 ||
        !row.Option3 ||
        !row.Option4
      ) {
        console.log(`Row ${index + 2} skipped: Missing options`);
        skipped++;
        continue;
      }

      const correctAnswer = Number(row.CorrectAnswer);
      if (![1, 2, 3, 4].includes(correctAnswer)) {
        console.log(`Row ${index + 2} skipped: Invalid CorrectAnswer`);
        skipped++;
        continue;
      }

      // 1️⃣ Domain
      let domain = await Domain.findOne({ name: domainName });
      if (!domain) {
        domain = await Domain.create({ name: domainName });
        domainCreated++;
      }

      // 2️⃣ SubDomain
      let subDomain = await SubDomain.findOne({
        name: subDomainName,
        domainId: domain._id,
      });

      if (!subDomain) {
        subDomain = await SubDomain.create({
          name: subDomainName,
          domainId: domain._id,
        });
        subDomainCreated++;
      }

      // 3️⃣ Duplicate check
      const exists = await McqQuestion.findOne({
        domainId: domain._id,
        subDomainId: subDomain._id,
        question,
      });

      if (exists) {
        console.log(`Row ${index + 2} skipped: Duplicate question`);
        skipped++;
        continue;
      }

      // 4️⃣ Insert MCQ
      await McqQuestion.create({
        domainId: domain._id,
        subDomainId: subDomain._id,
        question,
        description: "", // 🔥 Excel doesn't have description
        option1: row.Option1,
        option2: row.Option2,
        option3: row.Option3,
        option4: row.Option4,
        correctAnswer,
        difficulty: row.Difficulty || "Medium",
      });

      inserted++;
    }

    fs.unlinkSync(req.file.path);

    res.json({
      inserted,
      skipped,
      domainCreated,
      subDomainCreated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};