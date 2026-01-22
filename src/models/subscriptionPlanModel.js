const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Basic', 'Premium'], // Add more as needed
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR'],
  },
  billingPeriod: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    default: 'monthly',
  },
  features: [
    {
      name: String,
      included: Boolean,
      description: String,
      limits: {
        type: String, // e.g., "100 assessments/month", "Unlimited"
        default: 'Unlimited',
      },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  maxAssessments: {
    type: Number,
    default: 0, // 0 means unlimited
  },
  maxCandidates: {
    type: Number,
    default: 0,
  },
  skillIndexAccess: {
    type: Boolean,
    default: false,
  },
  advancedAnalytics: {
    type: Boolean,
    default: false,
  },
  prioritySupport: {
    type: Boolean,
    default: false,
  },
  customBranding: {
    type: Boolean,
    default: false,
  },
  apiAccess: {
    type: Boolean,
    default: false,
  },
  trialPeriod: {
    type: Number, // days
    default: 0,
  },
  order: {
    type: Number,
    default: 0, // For sorting plans
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp on save
subscriptionPlanSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
module.exports = SubscriptionPlan;