import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * CareLog — Weekly Clinical Report Service
 * Fetches patient bio from Firestore patients collection and includes it in the PDF header.
 */
export const generateWeeklyReport = async (patientId, patientName) => {
    const pdf = new jsPDF();
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── 1. Fetch Patient Bio ──────────────────────────────────────
    let bio = null;
    try {
        const snap = await getDoc(doc(db, 'patients', patientId));
        if (snap.exists()) bio = snap.data();
    } catch (e) { /* non-fatal — continue without bio */ }

    // ── 2. Fetch Clinical Data ────────────────────────────────────
    // No orderBy — avoids composite index. Sorted client-side.
    const vitalsSnap = await getDocs(query(collection(db, 'vitals'), where('patientId', '==', patientId), limit(50)));
    const vitalsData = vitalsSnap.docs.map(d => d.data()).sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const tb = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return tb - ta;
    });

    const alertsSnap = await getDocs(query(collection(db, 'alerts'), where('patientId', '==', patientId), limit(20)));
    const alertsData = alertsSnap.docs.map(d => d.data()).sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
        const tb = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
        return tb - ta;
    });

    const logsSnap = await getDocs(query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), limit(7)));
    const logsData = logsSnap.docs.map(d => d.data()).sort((a, b) => {
        const ta = a.date ? new Date(a.date) : new Date(0);
        const tb = b.date ? new Date(b.date) : new Date(0);
        return tb - ta;
    });

    // ── 3. PDF Header Bar ─────────────────────────────────────────
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, 210, 34, 'F');
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CareLog Clinical Report', 14, 14);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${today.toLocaleString()}`, 14, 22);
    pdf.text(`Period: ${lastWeek.toLocaleDateString()} – ${today.toLocaleDateString()}`, 14, 28);

    let y = 42;

    // ── 4. Patient Bio Card ───────────────────────────────────────
    const bioH = bio ? 56 : 22;
    pdf.setFillColor(238, 242, 255);
    pdf.roundedRect(12, y, 186, bioH, 3, 3, 'F');
    pdf.setTextColor(30, 64, 175);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Patient Information', 18, y + 9);

    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);

    if (bio) {
        const displayName = bio.name || patientName;
        const ageLine = [
            bio.age ? `${bio.age} yrs` : '',
            bio.gender || '',
            bio.bloodGroup ? `Blood: ${bio.bloodGroup}` : '',
        ].filter(Boolean).join('  ·  ');

        pdf.setFont('helvetica', 'bold');
        pdf.text(displayName, 18, y + 18);
        pdf.setFont('helvetica', 'normal');
        if (ageLine) pdf.text(ageLine, 18, y + 25);

        const cond = bio.conditions || bio.condition || '';
        if (cond) pdf.text(`Conditions: ${cond.length > 80 ? cond.slice(0, 77) + '...' : cond}`, 18, y + 32);

        const allergies = bio.allergies || '';
        if (allergies) pdf.text(`Allergies: ${allergies}`, 18, y + 39);

        const meds = bio.medications || '';
        if (meds) pdf.text(`Medications: ${meds.length > 80 ? meds.slice(0, 77) + '...' : meds}`, 18, y + 46);

        if (bio.emergencyContact) {
            const em = `Emergency: ${bio.emergencyContact}${bio.emergencyPhone ? ' · ' + bio.emergencyPhone : ''}`;
            pdf.text(em, 110, y + 18);
        }
        y += bioH + 8;
    } else {
        pdf.setFont('helvetica', 'bold');
        pdf.text(patientName, 18, y + 15);
        y += bioH + 8;
    }

    // ── 5. Vitals Summary Table ───────────────────────────────────
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Vitals Summary', 14, y);
    y += 4;

    const vitalsRows = vitalsData.map(v => [
        v.timestamp?.toDate ? v.timestamp.toDate().toLocaleString() : 'N/A',
        `${v.bloodPressure?.systolic || v.bpSystolic || '--'}/${v.bloodPressure?.diastolic || v.bpDiastolic || '--'} mmHg`,
        `${v.heartRate || '--'} bpm`,
        `${v.temperature || '--'}°C`,
    ]);

    autoTable(pdf, {
        startY: y,
        head: [['Timestamp', 'Blood Pressure', 'Heart Rate', 'Temperature']],
        body: vitalsRows.length > 0 ? vitalsRows : [['No vitals data', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219], fontStyle: 'bold' },
    });

    // ── 6. Alerts Table ───────────────────────────────────────────
    let finalY = pdf.lastAutoTable.finalY + 12;
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Recent Alerts', 14, finalY);

    const alertRows = alertsData.map(a => [
        a.timestamp?.toDate ? a.timestamp.toDate().toLocaleDateString() : (a.timestamp ? new Date(a.timestamp).toLocaleDateString() : 'N/A'),
        (a.type || a.severity || 'unknown').toUpperCase(),
        a.message || 'No details',
        a.isRead ? 'Resolved' : 'Active',
    ]);

    autoTable(pdf, {
        startY: finalY + 5,
        head: [['Date', 'Severity', 'Issue', 'Status']],
        body: alertRows.length > 0 ? alertRows : [['No alerts recorded', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60], fontStyle: 'bold' },
    });

    // ── 7. Care Coordination Summary ──────────────────────────────
    finalY = pdf.lastAutoTable.finalY + 12;
    if (finalY > 250) { pdf.addPage(); finalY = 20; }
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59);
    pdf.text('Care Coordination Summary', 14, finalY);

    const logRows = logsData.map(l => [
        l.date || 'N/A',
        l.careScore || 'N/A',
        l.observations?.length || 0,
        l.observations?.[0]?.mood || 'Stable',
    ]);

    autoTable(pdf, {
        startY: finalY + 5,
        head: [['Date', 'Care Score', 'Observations', 'Last Status']],
        body: logRows.length > 0 ? logRows : [['No logs', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113], fontStyle: 'bold' },
    });

    // ── 8. Footer on every page ───────────────────────────────────
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.width - 32, pdf.internal.pageSize.height - 8);
        pdf.text('Confidential Medical Document — CareLog System', 14, pdf.internal.pageSize.height - 8);
    }

    // ── 9. Save ───────────────────────────────────────────────────
    pdf.save(`CareLog_Report_${(bio?.name || patientName).replace(/ /g, '_')}_${today.toISOString().split('T')[0]}.pdf`);
};
