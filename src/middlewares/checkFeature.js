const Subscription = require("../models/subscriptionPlanModel");

const checkFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id; // make sure auth middleware sets this

      const subscription = await Subscription.findOne({
        user: userId,
        status: "active",
      });

      if (!subscription) {
        return res.status(403).json({
          message: "No active subscription found",
        });
      }

      if (!subscription.features?.[featureName]) {
        return res.status(403).json({
          message: "This feature is not included in your plan",
        });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };
};

module.exports = checkFeature;
