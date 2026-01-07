const UserScore = require("../models/userScoreModel");

exports.recalculateRanks = async () => {

  /* 🔹 GLOBAL RANK */
  const globalUsers = await UserScore.find()
    .sort({ hireabilityIndex: -1 });

  for (let i = 0; i < globalUsers.length; i++) {
    await UserScore.updateOne(
      { _id: globalUsers[i]._id },
      { globalRank: i + 1 }
    );
  }

  /* 🔹 COUNTRY RANK */
  const countries = await UserScore.distinct("country");

  for (const country of countries) {
    const users = await UserScore.find({ country })
      .sort({ hireabilityIndex: -1 });

    for (let i = 0; i < users.length; i++) {
      await UserScore.updateOne(
        { _id: users[i]._id },
        { countryRank: i + 1 }
      );
    }
  }

  /* 🔹 STATE RANK */
  const states = await UserScore.distinct("state");

  for (const state of states) {
    const users = await UserScore.find({ state })
      .sort({ hireabilityIndex: -1 });

    for (let i = 0; i < users.length; i++) {
      await UserScore.updateOne(
        { _id: users[i]._id },
        { stateRank: i + 1 }
      );
    }
  }

  /* 🔹 CITY RANK */
  const cities = await UserScore.distinct("city");

  for (const city of cities) {
    const users = await UserScore.find({ city })
      .sort({ hireabilityIndex: -1 });

    for (let i = 0; i < users.length; i++) {
      await UserScore.updateOne(
        { _id: users[i]._id },
        { cityRank: i + 1 }
      );
    }
  }
};
