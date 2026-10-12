// One-time script: fill lastActiveAt for sessions created before we tracked it.
// Run: node scripts/backfillLastActive.js
require("dotenv").config();
const mongoose = require("mongoose");
const Session = require("../models/Session");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Backfilling…");

  const result = await Session.updateMany(
    { lastActiveAt: { $exists: false } },
    [{ $set: { lastActiveAt: "$createdAt" } }]
  );

  console.log(`Updated ${result.modifiedCount} session(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});