import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS, card, sectionLabel } from './ds';
import DoctorShell from './DoctorShell';
import { FileText, Download, Eye, Calendar, User, Search, Filter } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';

export default function DoctorReports() {
    const { user } = useAuthContext();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alertCount, setAlertCount] = useState(0);
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Alert count subscription for DoctorShell
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'alerts'), where('isRead', '==', false), where('doctorId', '==', user.uid));
        return onSnapshot(q, s => setAlertCount(s.size));
    }, [user?.uid]);

    // Fetch My Reports
    useEffect(() => {
        if (!user?.uid) return;
        setLoading(true);
        const q = query(
            collection(db, 'reports'),
            where('doctorId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReports(data);
            setLoading(false);
        }, (err) => {
            console.error("Failed to load reports:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.uid]);

    const filtered = reports.filter(r => {
        const matchesFilter = filter === 'All' || r.patientId === filter;
        const matchesSearch = !searchQuery || r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || r.patientName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const uniquePatients = Array.from(new Set(reports.map(r => JSON.stringify({ id: r.patientId, name: r.patientName }))))
        .map(s => JSON.parse(s));

    const handleDownload = (report) => {
        if (!report.fileUrl || report.fileUrl === '#') {
            alert(`Report is still processing or not found.`);
            return;
        }
        window.open(report.fileUrl, '_blank');
    };

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto' }}>
                    
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 8px 0', letterSpacing: '-0.8px' }}>Reports Library</h1>
                            <p style={{ fontSize: '15px', color: DS.textMuted, fontWeight: '500', margin: 0 }}>Review clinical summaries and generated health insights.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                             <div style={{ position: 'relative' }}>
                                <Search size={14} color={DS.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    placeholder="Search reports..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '10px 12px 10px 36px', borderRadius: '12px',
                                        border: `1px solid ${DS.outlineVariant}`, backgroundColor: 'white',
                                        fontSize: '13px', outline: 'none', width: '220px', fontFamily: 'inherit'
                                    }}
                                />
                             </div>
                        </div>
                    </div>

                    {/* Patient Quick Filter */}
                    {uniquePatients.length > 0 && (
                        <div style={{ marginBottom: '28px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Filter size={12} /> Filter by Patient
                            </div>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                <button onClick={() => setFilter('All')} style={{
                                    padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    fontSize: '13px', fontWeight: '700', transition: 'all 0.2s',
                                    backgroundColor: filter === 'All' ? DS.primaryContainer : 'white',
                                    color: filter === 'All' ? 'white' : DS.textSecondary,
                                    border: filter === 'All' ? 'none' : `1px solid ${DS.outlineVariant}`
                                }}>
                                    All Patients
                                </button>
                                {uniquePatients.map(p => (
                                    <button key={p.id} onClick={() => setFilter(p.id)} style={{
                                        padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                        fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                        backgroundColor: filter === p.id ? DS.primaryContainer : 'white',
                                        color: filter === p.id ? 'white' : DS.textSecondary,
                                        border: filter === p.id ? 'none' : `1px solid ${DS.outlineVariant}`
                                    }}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reports Inventory */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {loading ? (
                            [1,2,3].map(i => <div key={i} style={{ height: '88px', backgroundColor: '#F1F5F9', borderRadius: '18px', animation: 'pulse 1.5s infinite' }} />)
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '24px', border: `1px dashed ${DS.outlineVariant}` }}>
                                <FileText size={48} color={DS.surfaceHigh} style={{ margin: '0 auto 16px', display: 'block' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: DS.textPrimary, margin: '0 0 8px 0' }}>No reports found</h3>
                                <p style={{ fontSize: '14px', color: DS.textMuted, maxWidth: '300px', margin: '0 auto' }}> {searchQuery || filter !== 'All' ? "Try adjusting your filters or search terms." : "Generated reports will appear here once clinical summaries are completed."}</p>
                            </div>
                        ) : (
                            filtered.map(report => (
                                <div key={report.id} style={{ 
                                    backgroundColor: 'white', padding: '18px 24px', borderRadius: '18px', 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: `1px solid ${DS.outlineVariant}`,
                                    transition: 'transform 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                    <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flex: 1 }}>
                                        <div style={{ 
                                            width: '52px', height: '52px', borderRadius: '14px', 
                                            backgroundColor: report.status === 'Ready' ? '#EEF2FF' : '#FEF3C7', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                        }}>
                                            <FileText size={24} color={report.status === 'Ready' ? DS.primaryContainer : DS.warning} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: DS.textPrimary, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: '700', color: DS.primaryContainer }}>
                                                    <User size={12} /> {report.patientName}
                                                </span>
                                                <span style={{ fontSize: '12px', color: DS.textMuted }}>·</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: DS.textMuted, fontWeight: '600' }}>
                                                    <Calendar size={12} /> {report.period}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ 
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', 
                                            textTransform: 'uppercase', letterSpacing: '0.4px',
                                            backgroundColor: report.status === 'Ready' ? '#DCFCE7' : '#FEF3C7',
                                            color: report.status === 'Ready' ? DS.success : DS.warning, marginRIght: '12px'
                                        }}>
                                            {report.status}
                                        </div>
                                        
                                        {report.status === 'Ready' && (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleDownload(report)} title="View" style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: '#F8FAFC', color: DS.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEF2FF'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}>
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleDownload(report)} title="Download" style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: DS.primaryContainer, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 12px ${DS.primaryContainer}30` }}>
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        )}
                                        {report.status !== 'Ready' && (
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: DS.warning, width: '86px', textAlign: 'center' }}>Generating...</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </DoctorShell>
    );
}

const customStyles = {
    scroll: {
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
    }
};
