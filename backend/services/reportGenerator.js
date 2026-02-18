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
    doc.rect(0, 0, 600, 100).fill('#1e293b'); // Dark header background
    doc.fontSize(24).fillColor('#ffffff').text('Security Executive Summary', 50, 40);
    doc.fontSize(10).fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleString()}`, 50, 70);

    doc.moveDown(4);

    // --- Current Security Posture (Cards) ---
    const startY = 130;

    // Function to draw card
    const drawCard = (x, title, value, subtext, color) => {
        doc.roundedRect(x, startY, 150, 100, 8).fill('#f8fafc').stroke('#e2e8f0');
        doc.fontSize(10).fillColor('#64748b').text(title, x + 15, startY + 15);
        doc.fontSize(24).fillColor(color).text(value, x + 15, startY + 40);
        doc.fontSize(9).fillColor('#94a3b8').text(subtext, x + 15, startY + 75);
    };

    // Card 1: Secure Score
    drawCard(50, 'Microsoft Secure Score', `${data.secure_score || 0}%`, 'Target: 80%+', getScoreColor(data.secure_score));

    // Card 2: Exposure Score
    const hasScore = data.secure_score && data.secure_score > 0;
    const exposureDisplay = hasScore ? `${data.defender_exposure_score || 0}/100` : 'N/A';
    const exposureColor = hasScore ? getExposureColor(data.defender_exposure_score) : '#94a3b8';

    drawCard(220, 'Exposure Score', exposureDisplay, 'Lower is better', exposureColor);

    // Card 3: Active Alerts
    drawCard(390, 'High Sev Alerts', data.high_security_alerts || 0, 'Requires Attention', (data.high_security_alerts > 0 ? '#ef4444' : '#10b981'));

    doc.moveDown(8);

    // --- Critical Attention Areas (Table) ---
    doc.fontSize(16).fillColor('#1e293b').text('Critical Risks & Hygiene', 50, 260);

    let currentY = 290;

    // Draw Header
    doc.rect(50, currentY, 500, 25).fill('#f1f5f9');
    doc.fontSize(9).fillColor('#475569');
    doc.text('METRIC', 60, currentY + 7);
    doc.text('CATEGORY', 250, currentY + 7);
    doc.text('STATUS', 400, currentY + 7);
    doc.text('VALUE', 500, currentY + 7);

    currentY += 25;

    const metrics = [
        { label: 'High Risk Users', category: 'Identity', value: data.high_risk_users, threshold: 0 },
        { label: 'Risky Sign-ins (24h)', category: 'Identity', value: data.risky_signins_24h, threshold: 0 },
        { label: 'Non-Compliant Devices', category: 'Device', value: data.non_compliant_devices, threshold: 0 },
        { label: 'Privileged Users w/o MFA', category: 'Hygiene', value: data.privileged_no_mfa, threshold: 0 },
        { label: 'Dormant Users (>60d)', category: 'Hygiene', value: data.dormant_users_60d, threshold: 5 },
        { label: 'External Forwarding', category: 'DLP', value: data.external_forwarding_count, threshold: 0 },
    ];

    metrics.forEach((m, i) => {
        // Alternating row color
        if (i % 2 === 1) doc.rect(50, currentY, 500, 25).fill('#f8fafc');

        doc.fontSize(10).fillColor('#334155');
        doc.text(m.label, 60, currentY + 7);
        doc.text(m.category, 250, currentY + 7);

        const isBad = m.value > m.threshold;
        const statusText = isBad ? 'ATTENTION' : 'HEALTHY';
        const statusColor = isBad ? '#ef4444' : '#10b981';

        // Draw Status Badge
        doc.roundedRect(400, currentY + 5, 70, 15, 4).fill(isBad ? '#fef2f2' : '#f0fdf4');
        doc.fillColor(statusColor).text(statusText, 410, currentY + 8);

        doc.fillColor('#0f172a').text(m.value || 0, 500, currentY + 7);

        currentY += 25;
    });

    // --- Device Fleet Status ---
    doc.moveDown(3);
    const fleetY = currentY + 40;
    doc.fontSize(16).fillColor('#1e293b').text('Device Fleet Summary', 50, fleetY);

    const total = data.total_devices || 1;
    const win10 = data.win10_count || 0;
    const win11 = data.win11_count || 0;
    const encrypted = data.encrypted_devices || 0;

    doc.fontSize(10).fillColor('#64748b').text(`Total Managed Devices: ${data.total_devices || 0}`, 50, fleetY + 25);
    doc.text(`Encrypted: ${encrypted} (${((encrypted / total) * 100).toFixed(0)}%)`, 200, fleetY + 25);

    // OS Distribution Bar
    const barY = fleetY + 50;
    const barWidth = 500;
    const barHeight = 20;

    // Background
    doc.roundedRect(50, barY, barWidth, barHeight, 4).fill('#e2e8f0');

    if (total > 0) {
        const w11W = (win11 / total) * barWidth;
        const w10W = (win10 / total) * barWidth;

        if (win11 > 0) doc.rect(50, barY, w11W, barHeight).fill('#3b82f6');
        if (win10 > 0) doc.rect(50 + w11W, barY, w10W, barHeight).fill('#93c5fd');
    }

    // Legend
    doc.rect(50, barY + 30, 10, 10).fill('#3b82f6');
    doc.fillColor('#000').text(`Windows 11 (${win11})`, 65, barY + 30);

    doc.rect(200, barY + 30, 10, 10).fill('#93c5fd');
    doc.text(`Windows 10 (${win10})`, 215, barY + 30);

    // --- Footer ---
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Confidential - Unified User Lifecycle Dashboard', 50, 750, { align: 'center' });
    doc.text('This report contains sensitive security information.', 50, 765, { align: 'center' });

    doc.end();
};

function getScoreColor(score) {
    if (!score) return '#94a3b8';
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

function getExposureColor(score) {
    if (!score) return '#94a3b8';
    if (score <= 30) return '#10b981';
    if (score <= 60) return '#f59e0b';
    return '#ef4444';
}

module.exports = { generateSecurityReport };
