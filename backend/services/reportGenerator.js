const PDFDocument = require('pdfkit');

/**
 * Generates a Security Executive Summary PDF
 * @param {Object} data - The security snapshot data
 * @param {Object} res - Express response object
 */
const generateSecurityReport = (data, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream directly to response
    doc.pipe(res);

    // --- Header ---
    doc.fontSize(20).text('Security Executive Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center', color: 'gray' });
    doc.moveDown(2);

    // --- High Level Score ---
    doc.fontSize(16).text('Current Security Posture');
    doc.roundedRect(50, 140, 500, 80, 5).stroke('#e2e8f0');

    // Secure Score
    doc.fontSize(10).text('Microsoft Secure Score', 70, 160);
    doc.fontSize(24).fillColor(getScoreColor(data.secure_score)).text(`${data.secure_score}%`, 70, 180).fillColor('black');

    // Defender Score
    doc.fontSize(10).text('Exposure Score', 250, 160);
    doc.fontSize(24).fillColor(getExposureColor(data.defender_exposure_score)).text(`${data.defender_exposure_score}/100`, 250, 180).fillColor('black');

    // Active Alerts
    doc.fontSize(10).text('High Sev Alerts', 430, 160);
    doc.fontSize(24).fillColor(data.high_security_alerts > 0 ? '#ef4444' : '#10b981').text(data.high_security_alerts, 430, 180).fillColor('black');

    doc.moveDown(5);

    // --- Critical Attention Areas ---
    doc.fontSize(16).text('Critical Attention Areas', 50, 250);
    doc.moveDown(0.5);

    const startY = 280;
    let currentY = startY;

    // Draw Table Header
    doc.fontSize(10).fillColor('#64748b').text('METRIC', 60, currentY);
    doc.text('STATUS', 250, currentY);
    doc.text('VALUE', 450, currentY);
    currentY += 20;
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#e2e8f0');
    currentY += 10;

    // Table Content
    const metrics = [
        { label: 'High Risk Users', value: data.high_risk_users, threshold: 0 },
        { label: 'Risky Sign-ins (24h)', value: data.risky_signins_24h, threshold: 0 },
        { label: 'Non-Compliant Devices', value: data.non_compliant_devices, threshold: 0 },
        { label: 'Privileged Users w/o MFA', value: data.privileged_no_mfa, threshold: 0 },
        { label: 'Dormant Users (>60d)', value: data.dormant_users_60d, threshold: 5 },
    ];

    doc.fillColor('black');
    metrics.forEach(m => {
        doc.text(m.label, 60, currentY);

        const isBad = m.value > m.threshold;
        const statusText = isBad ? 'ATTENTION' : 'OK';
        const statusColor = isBad ? '#ef4444' : '#10b981';

        doc.fillColor(statusColor).text(statusText, 250, currentY);
        doc.fillColor('black').text(m.value.toString(), 450, currentY);

        currentY += 25;
        doc.moveTo(50, currentY - 5).lineTo(550, currentY - 5).strokeColor('#f1f5f9').stroke().strokeColor('black');
    });

    doc.moveDown(2);

    // --- Device Fleet Status ---
    doc.fontSize(16).text('Device Fleet Status', 50, 450);
    doc.fontSize(10).text(`Total Managed Devices: ${data.total_devices || 0}`, 50, 470);

    // Simple ASCII Bar Chart for OS
    const win10 = data.win10_count || 0;
    const win11 = data.win11_count || 0;
    const totalWindows = win10 + win11 || 1; // avoid divide by zero

    doc.rect(50, 500, 400, 20).fill('#e2e8f0'); // Background
    const win11Width = (win11 / totalWindows) * 400;
    doc.rect(50, 500, win11Width, 20).fill('#3b82f6'); // Win11 Bar

    doc.fillColor('black').text(`Windows 11: ${win11}`, 50, 530);
    doc.text(`Windows 10: ${win10}`, 50 + win11Width + 10, 530);

    // --- Footer ---
    doc.fontSize(8).text('Confidential - For Internal Use Only', 50, 750, { align: 'center' });

    doc.end();
};

function getScoreColor(score) {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

function getExposureColor(score) {
    if (score <= 30) return '#10b981';
    if (score <= 60) return '#f59e0b';
    return '#ef4444';
}

module.exports = { generateSecurityReport };
