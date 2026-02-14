const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'dashboard_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'unified_dashboard',
});

// pool.connect()
//     .then(() => console.log('✅ Connected to PostgreSQL'))
//     .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

module.exports = pool;
