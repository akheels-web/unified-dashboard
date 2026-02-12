const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certs');

if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Identify platform
const isWindows = process.platform === 'win32';

try {
    console.log('Generating self-signed certificate...');

    // Check if openssl is available
    try {
        execSync('openssl version');
    } catch (e) {
        console.error('Error: OpenSSL is not installed or not in PATH.');
        console.error('Please install OpenSSL (e.g., enable via Git Bash or install generic executable) or manually generate certs.');
        process.exit(1);
    }

    // Generate cert using openssl
    // Defines a self-signed cert valid for 365 days
    const cmd = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

    execSync(cmd, { stdio: 'inherit' });

    console.log('\nSuccess! Certificates generated at:');
    console.log(`Key: ${keyPath}`);
    console.log(`Cert: ${certPath}`);
} catch (error) {
    console.error('Failed to generate certificates:', error.message);
}
