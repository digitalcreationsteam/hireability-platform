const Domain = require("../../models/domainModel");

// CREATE
exports.createDomain = async (req, res) => {
  try {
    const domain = await Domain.create({ name: req.body.name });
    res.status(201).json(domain);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ (List all)
exports.getAllDomains = async (req, res) => {
  try {
    const domains = await Domain.find({ isActive: true }).sort({ name: 1 });
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ (Single)
exports.getDomainById = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    res.json(domain);
  } catch (err) {
    res.status(404).json({ error: "Domain not found" });
  }
};

// UPDATE
exports.updateDomain = async (req, res) => {
  try {
    const domain = await Domain.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    res.json(domain);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE (Soft delete)
exports.deleteDomain = async (req, res) => {
  try {
    await Domain.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Domain disabled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
