const Subscription = require("../models/subscriptionModel");
const PlanFeature = require("../models/planFeatureModel");

const checkFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const userId = req.user._id;

      // ✅ find active subscription
      const subscription = await Subscription.findOne({
        user: userId,
        status: "active",
      });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: "Active subscription required",
        });
      }

      // ✅ get plan features document
      const planFeature = await PlanFeature.findOne({
        subscriptionPlanId: subscription.plan,
      });

      if (!planFeature) {
        return res.status(403).json({
          success: false,
          message: "Plan features not configured",
        });
      }

      // ✅ map featureKey → actual text
      const featureMap = {
        caseStudyAccess: "Unlimited access to Case studies",
        hackathonAccess: "Unlimited access to Hackathons and competitions",
      };

      const requiredFeatureText = featureMap[featureKey];

      const hasAccess =
        requiredFeatureText &&
        planFeature.features.includes(requiredFeatureText);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Your plan does not include ${featureKey}`,
        });
      }

      req.subscription = subscription;
      next();
    } catch (err) {
      console.error("Feature check error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
};

module.exports = checkFeature;