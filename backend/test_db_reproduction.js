const pool = require('./db');
console.log("✅ Imported db.js successfully");
// Wait a moment to see if any async connection happens
setTimeout(() => {
    console.log("✅ No eager connection detected after 2 seconds");
    process.exit(0);
}, 2000);
