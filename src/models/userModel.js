// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const validator = require("validator");

// const userSchema = new mongoose.Schema(
//   {
//     firstname: { type: String, required: true, trim: true },

//     lastname: {
//       type: String,
//       trim: true,
//       default: "",
//     },

//     lastLogin: {
//       type: Date,
//       default: null,
//     },
//     // Add these fields for Google OAuth
//     googleId: {
//       type: String,
//       sparse: true // Allows null values while keeping unique constraint
//     },

//     email: {
//       type: String,
//       required: function () {
//         return !this.googleId;
//       },// Required only if not using Google
//       unique: true,
//       lowercase: true,
//       validate: [validator.isEmail, "Invalid email"],
//     },

//     password: {
//       type: String,
//       required: function () {
//         return !this.googleId;
//       }, // Required only if not using Google
//       minlength: 6,
//       select: false,
//     },

//     // ✅ ROLE FIELD
//     role: {
//       type: String,
//       enum: ["student", "recruiter", "admin"],
//       default: "student",
//     },

//     country: {
//       type: String, // "IN", "US", "UK"
//       default: "IN",
//     },

//     socialLogin: { type: String, default: null },

//     isVerified: { type: Boolean, default: false },

//     emailVerifyToken: String,
//     emailVerifyExpire: Date,

//     /* ================= FORGOT PASSWORD (OTP) ================= */
//     forgotPasswordOTP: {
//       type: String,
//     },
//     forgotPasswordOTPExpire: {
//       type: Date,
//     },
//   },
//   { timestamps: true }
// );
// /* ============================================================= */

// // ✅ ✅ ✅ WORKING PRE SAVE HOOK (NO NEXT!)
// userSchema.pre("save", async function () {
//   if (!this.isModified("password")) return;

//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// // ✅ PASSWORD MATCH METHOD
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // // ✅ PASSWORD MATCH METHOD
// // userSchema.methods.matchPassword = async function (enteredPassword) {
// //   return await bcrypt.compare(enteredPassword, this.password);
// // };

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true
    },

    lastname: {
      type: String,
      trim: true,
      default: "",
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    googleId: {
      type: String,
      sparse: true,
    },

    email: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Invalid email"],
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "recruiter", "admin"],
      default: "student",
    },

    country: {
      type: String,
      default: "IN",
    },

    socialLogin: {
      type: String,
      default: null
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,

    },

    otpExpiry: {
      type: Date,

    },

    emailVerifyToken: String,
    emailVerifyExpire: Date,

    forgotPasswordOTP: {
      type: String,
      select: false,
    },
    forgotPasswordOTPExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstname} ${this.lastname}`.trim();
});

// ========== INDEXES ==========
userSchema.index({ googleId: 1 }, {
  sparse: true,
  unique: true,
  name: 'googleId_unique_idx'
});

userSchema.index({ role: 1 }, { name: 'role_idx' });
userSchema.index({ isVerified: 1 }, { name: 'isVerified_idx' });
userSchema.index({ role: 1, isVerified: 1 }, { name: 'role_verified_idx' });
userSchema.index({ createdAt: -1 }, { name: 'createdAt_idx' });
userSchema.index({ email: 1, isVerified: 1 }, { name: 'email_verified_idx' });

// ========== PRE-SAVE HOOK - FIXED VERSION ==========
// Using async/await without next() parameter
userSchema.pre('save', async function () {
  try {
    console.log('\n========== USER MODEL - PRE SAVE HOOK ==========');
    console.log('📝 Operation:', this.isNew ? 'CREATE' : 'UPDATE');
    console.log('👤 User ID:', this._id || 'New User');
    console.log('📧 Email:', this.email);
    console.log('🔑 Has Password:', !!this.password);
    console.log('✅ isVerified:', this.isVerified);
    console.log('🔢 Has OTP:', !!this.otp);
    console.log('⏰ OTP Expiry:', this.otpExpiry);
    console.log('🔑 Has Google ID:', !!this.googleId);
    console.log('👤 Role:', this.role);

    // Only hash if password is modified
    if (this.isModified('password')) {
      console.log('🔐 Password modified - hashing...');
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      console.log('✅ Password hashed successfully');
    } else {
      console.log('⏭️ Password not modified - skipping hash');
    }

    console.log('================================================\n');
    // No need to call next() - just return
  } catch (error) {
    console.error('❌ Error in pre-save hook:', error);
    throw error; // Throw error instead of passing to next()
  }
});

// Log after save
userSchema.post('save', function (doc) {
  console.log('\n========== USER MODEL - POST SAVE HOOK ==========');
  console.log('✅ User saved successfully');
  console.log('👤 User ID:', doc._id);
  console.log('📧 Email:', doc.email);
  console.log('✅ isVerified:', doc.isVerified);
  console.log('👤 Role:', doc.role);
  console.log('================================================\n');
});

// Log find operations
userSchema.post('find', function (docs) {
  console.log('\n========== USER MODEL - FIND OPERATION ==========');
  console.log('📊 Found', docs.length, 'users');
  if (docs.length > 0) {
    console.log('📧 First user:', docs[0]?.email);
  }
  console.log('===============================================\n');
});

userSchema.post('findOne', function (doc) {
  if (doc) {
    console.log('\n========== USER MODEL - FIND ONE ==========');
    console.log('👤 User found:', doc.email);
    console.log('✅ isVerified:', doc.isVerified);
    console.log('🔢 Has OTP:', !!doc.otp);
    console.log('👤 Role:', doc.role);
    console.log('==========================================\n');
  } else {
    console.log('\n========== USER MODEL - FIND ONE ==========');
    console.log('❌ No user found');
    console.log('==========================================\n');
  }
});

// ========== INSTANCE METHODS ==========
userSchema.methods.matchPassword = async function (enteredPassword) {
  console.log('\n========== PASSWORD MATCH CHECK ==========');
  console.log('👤 User:', this.email);
  console.log('🔑 Checking password...');

  try {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log('✅ Password match:', isMatch);
    console.log('=========================================\n');
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    console.log('=========================================\n');
    throw error;
  }
};

userSchema.methods.generateOTP = function () {
  console.log('\n========== GENERATING OTP ==========');
  console.log('👤 User:', this.email);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  console.log('🔢 Generated OTP:', otp);
  console.log('⏰ Expires at:', new Date(this.otpExpiry));
  console.log('====================================\n');

  return otp;
};

userSchema.methods.verifyOTP = function (enteredOTP) {
  console.log('\n========== VERIFYING OTP ==========');
  console.log('👤 User:', this.email);
  console.log('🔢 Entered OTP:', enteredOTP);
  console.log('💾 Stored OTP:', this.otp);
  console.log('⏰ OTP Expiry:', this.otpExpiry);
  console.log('🕒 Current time:', new Date());

  if (!this.otp || !this.otpExpiry) {
    console.log('❌ No OTP found');
    console.log('==================================\n');
    return false;
  }

  if (this.otpExpiry < Date.now()) {
    console.log('❌ OTP expired');
    console.log('==================================\n');
    return false;
  }

  const isValid = this.otp === enteredOTP;
  console.log('✅ OTP valid:', isValid);
  console.log('==================================\n');

  return isValid;
};

userSchema.methods.clearOTP = function () {
  console.log('\n========== CLEARING OTP ==========');
  console.log('👤 User:', this.email);
  console.log('🔢 Clearing OTP fields');

  this.otp = undefined;
  this.otpExpiry = undefined;

  console.log('✅ OTP cleared');
  console.log('================================\n');
};

userSchema.methods.markAsVerified = function () {
  console.log('\n========== MARKING AS VERIFIED ==========');
  console.log('👤 User:', this.email);

  this.isVerified = true;
  this.otp = undefined;
  this.otpExpiry = undefined;

  console.log('✅ User marked as verified');
  console.log('======================================\n');
};

userSchema.methods.isEmailVerified = function () {
  return this.isVerified === true;
};

userSchema.methods.updateLastLogin = function () {
  this.lastLogin = Date.now();
  console.log('\n========== UPDATE LAST LOGIN ==========');
  console.log('👤 User:', this.email);
  console.log('🕒 Last login:', new Date(this.lastLogin));
  console.log('======================================\n');
};

userSchema.methods.generateForgotPasswordOTP = function () {
  console.log('\n========== GENERATING FORGOT PASSWORD OTP ==========');
  console.log('👤 User:', this.email);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.forgotPasswordOTP = otp;
  this.forgotPasswordOTPExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  console.log('🔢 Generated OTP:', otp);
  console.log('⏰ Expires at:', new Date(this.forgotPasswordOTPExpire));
  console.log('================================================\n');

  return otp;
};

userSchema.methods.verifyForgotPasswordOTP = function (enteredOTP) {
  console.log('\n========== VERIFYING FORGOT PASSWORD OTP ==========');
  console.log('👤 User:', this.email);

  if (!this.forgotPasswordOTP || !this.forgotPasswordOTPExpire) {
    console.log('❌ No forgot password OTP found');
    console.log('================================================\n');
    return false;
  }

  if (this.forgotPasswordOTPExpire < Date.now()) {
    console.log('❌ Forgot password OTP expired');
    console.log('================================================\n');
    return false;
  }

  const isValid = this.forgotPasswordOTP === enteredOTP;
  console.log('✅ OTP valid:', isValid);
  console.log('================================================\n');

  return isValid;
};

// ========== STATIC METHODS ==========
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findVerifiedByRole = function (role) {
  return this.find({ role, isVerified: true });
};

console.log('\n========== USER MODEL INITIALIZED ==========');
console.log('✅ User model loaded successfully');
console.log('============================================\n');

module.exports = mongoose.model("User", userSchema);