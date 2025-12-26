const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, trim: true },
    lastname: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Invalid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    socialLogin: {
      type: String,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifyToken: {
      type: String,
    },
    
    emailVerifyExpire: {
      type: Date,
    },

  },
  { timestamps: true }
);

// ✅ ✅ ✅ WORKING PRE SAVE HOOK (NO NEXT!)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ✅ PASSWORD MATCH METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
