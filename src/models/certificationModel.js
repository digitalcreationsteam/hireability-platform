const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  certificationName: {
    type: String,
    required: true,
  },

  issuer: {
    type: String,
    required: true,
  },

  issueDate: {
    type: String,   // Format: MM/YYYY
    required: true,
  },

  credentialLink: {
    type: String,
    default: null,
  },

  certificateFileUrl: {
    type: String,   // Cloud URL / local URL
    default: null,
  },

  certificationScore: {
    type: Number,
    default: 5, // Each certification = 50 points
  },

}, { timestamps: true });

module.exports = mongoose.model("Certification", certificationSchema);
