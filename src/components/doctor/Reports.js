import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS, card, sectionLabel } from './ds';
import DoctorShell from './DoctorShell';
import { FileText, Download, Eye, Calendar } from 'lucide-react';

const MOCK_REPORTS = [
    { id: 'r1', patientName: 'Tella Sriramulu', title: 'Week 1 Summary Report', period: 'Mar 24–30, 2026', status: 'Ready', fileUrl: '#', createdAt: '2026-03-30' },
    { id: 'r2', patientName: 'Priya Sharma', title: 'Week 1 Summary Report', period: 'Mar 24–30, 2026', status: 'Ready', fileUrl: '#', createdAt: '2026-03-30' },
    { id: 'r3', patientName: 'Ravi Kumar', title: 'Biweekly Clinical Report', period: 'Mar 17–30, 2026', status: 'Ready', fileUrl: '#', createdAt: '2026-03-31' },
    { id: 'r4', patientName: 'Sunita Devi', title: 'Week 2 Summary Report', period: 'Mar 31–Apr 6, 2026', status: 'Generating', fileUrl: null, createdAt: '2026-04-06' },
    { id: 'r5', patientName: 'Mohan Reddy', title: 'Emergency Vitals Report', period: 'Apr 1, 2026', status: 'Ready', fileUrl: '#', createdAt: '2026-04-01' },
];

export default function DoctorReports() {
    const [alertCount, setAlertCount] = useState(0);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        const u = onSnapshot(collection(db, 'alerts'), s => setAlertCount(s.docs.filter(d => !d.data().isRead).length));
        return () => u();
    }, []);

    const filtered = MOCK_REPORTS.filter(r => filter === 'All' || r.patientName.includes(filter));
    const patients = [...new Set(MOCK_REPORTS.map(r => r.patientName))];

    const handleDownload = (report) => {
        if (!report.fileUrl || report.fileUrl === '#') {
            // Generate a simple text-based dummy PDF info
            alert(`PDF Export — ${report.title}\nPatient: ${report.patientName}\nPeriod: ${report.period}\n\nThis would download the actual PDF from Firebase Storage in production.`);
            return;
        }
        window.open(report.fileUrl, '_blank');
    };

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 6px 0', letterSpacing: '-0.6px' }}>Reports</h1>
                    <p style={{ fontSize: '14px', color: DS.textMuted, fontWeight: '500', margin: '0 0 28px 0' }}>View and download patient summary reports.</p>

                    {/* Filter by Patient */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        {['All', ...patients].map(name => (
                            <button key={name} onClick={() => setFilter(name)} style={{
                                padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '13px', fontWeight: '700', transition: 'all 0.2s',
                                backgroundColor: filter === name ? DS.primaryContainer : DS.surfaceLowest,
                                color: filter === name ? 'white' : DS.textSecondary,
                                boxShadow: filter === name ? `0 4px 16px ${DS.primaryContainer}40` : '0 2px 8px rgba(25,28,30,0.04)',
                            }}>
                                {name === 'All' ? 'All Patients' : name.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Reports Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {filtered.map(report => (
                            <div key={report.id} style={{ ...card(), display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: report.status === 'Ready' ? '#EEF2FF' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <FileText size={22} color={report.status === 'Ready' ? DS.primaryContainer : DS.warning} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: DS.textPrimary, marginBottom: '3px' }}>{report.title}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: DS.textMuted }}>{report.patientName}</span>
                                            <span style={{ fontSize: '11px', color: DS.textMuted }}>·</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: DS.textMuted, fontWeight: '600' }}>
                                                <Calendar size={11} /> {report.period}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px',
                                        color: report.status === 'Ready' ? DS.success : DS.warning,
                                        backgroundColor: report.status === 'Ready' ? '#DCFCE7' : '#FEF3C7',
                                        padding: '4px 10px', borderRadius: '8px',
                                    }}>
                                        {report.status}
                                    </span>
                                    {report.status === 'Ready' && (
                                        <>
                                            <button onClick={() => handleDownload(report)} title="View" style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#EEF2FF', color: DS.primaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => handleDownload(report)} title="Download PDF" style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: `${DS.primaryContainer}15`, color: DS.primaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                <Download size={16} />
                                            </button>
                                        </>
                                    )}
                                    {report.status === 'Generating' && (
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: DS.warning }}>Processing...</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', color: DS.textMuted }}>
                            <FileText size={44} color={DS.surfaceHigh} style={{ display: 'block', margin: '0 auto 16px' }} />
                            <p style={{ fontWeight: '700', fontSize: '16px', margin: 0 }}>No reports found</p>
                        </div>
                    )}
                </div>
            </div>
        </DoctorShell>
    );
}
