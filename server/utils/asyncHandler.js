// Express 4 does not catch errors thrown in async handlers by itself.
// This wrapper forwards them to the error middleware in app.js.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
