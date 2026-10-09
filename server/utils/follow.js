const Follow = require("../models/Follow");

async function relationship(meId, otherId) {
  const [a, b] = await Promise.all([
    Follow.exists({ follower: meId, following: otherId }),
    Follow.exists({ follower: otherId, following: meId }),
  ]);
  return { iFollowThem: !!a, theyFollowMe: !!b, mutual: !!(a && b) };
}

async function areMutual(a, b) {
  const r = await relationship(a, b);
  return r.mutual;
}

module.exports = { relationship, areMutual };
