require('dotenv').config();

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD TYPE:", typeof process.env.DB_PASSWORD);
console.log("DB_PASSWORD VALUE:", process.env.DB_PASSWORD);

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'dashboard_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'unified_dashboard',
});

pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL'))
    .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

module.exports = pool;