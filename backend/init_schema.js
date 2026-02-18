const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'dashboard_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'unified_dashboard',
});

const schema = `
-- Security Snapshots (High frequency)
CREATE TABLE IF NOT EXISTS security_snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    high_security_alerts INT DEFAULT 0,
    medium_security_alerts INT DEFAULT 0,
    high_risk_users INT DEFAULT 0,
    risky_signins_24h INT DEFAULT 0,
    dlp_high_incidents INT DEFAULT 0,
    secure_score DECIMAL(5,2) DEFAULT 0,
    defender_exposure_score DECIMAL(5,2) DEFAULT 0
);

-- Device Health Snapshots (Every 4 hours)
CREATE TABLE IF NOT EXISTS device_snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    total_devices INT DEFAULT 0,
    compliant_devices INT DEFAULT 0,
    non_compliant_devices INT DEFAULT 0,
    encrypted_devices INT DEFAULT 0,
    win10_count INT DEFAULT 0,
    win11_count INT DEFAULT 0,
    outdated_builds_count INT DEFAULT 0
);

-- Identity & Mailbox Hygiene (Daily)
CREATE TABLE IF NOT EXISTS hygiene_snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    mfa_coverage_percent DECIMAL(5,2) DEFAULT 0,
    privileged_no_mfa INT DEFAULT 0,
    dormant_users_60d INT DEFAULT 0,
    guest_inactive_90d INT DEFAULT 0,
    mailbox_usage_over_90 INT DEFAULT 0,
    external_forwarding_count INT DEFAULT 0
);
`;

async function initDB() {
    try {
        console.log(`Connecting via host: ${pool.options.host}`);
        console.log(`Connecting to database '${pool.options.database}' as user '${pool.options.user}'...`);
        await pool.connect();
        console.log('Connected. Creating tables if they do not exist...');
        await pool.query(schema);
        console.log('✅ Schema initialization successful.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to initialize schema:', error);
        process.exit(1);
    }
}

initDB();
