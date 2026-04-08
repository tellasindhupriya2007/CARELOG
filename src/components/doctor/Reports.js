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

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'alerts'), where('isRead', '==', false), where('doctorId', '==', user.uid));
        return onSnapshot(q, s => setAlertCount(s.size));
    }, [user?.uid]);

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
            alert(`Diagnostic artifact is still synchronizing.`);
            return;
        }
        window.open(report.fileUrl, '_blank');
    };

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC', padding: '40px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    
                    {/* Header Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '40px', height: '1px', backgroundColor: '#0052FF' }}></div>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#0052FF', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Medical Record Archive</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#101828', margin: '0 0 12px 0', letterSpacing: '-1.5px' }}>Clinical Reports</h1>
                                <p style={{ fontSize: '16px', color: '#475467', fontWeight: '600' }}>Review longitudinal summaries and machine-generated insights.</p>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} color="#98A2B3" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '14px 16px 14px 44px', borderRadius: '16px',
                                        border: '1px solid #EAECF0', backgroundColor: '#ffffff',
                                        fontSize: '14px', outline: 'none', width: '280px', fontFamily: 'inherit',
                                        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Filters */}
                    {uniquePatients.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                <button onClick={() => setFilter('All')} style={{
                                    padding: '10px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                    fontSize: '13px', fontWeight: '800', transition: 'all 0.2s',
                                    backgroundColor: filter === 'All' ? '#0052FF' : '#ffffff',
                                    color: filter === 'All' ? '#ffffff' : '#475467',
                                    border: filter === 'All' ? '1px solid #0052FF' : '1px solid #EAECF0',
                                    boxShadow: filter === 'All' ? '0 4px 12px rgba(0, 82, 255, 0.2)' : 'none'
                                }}>
                                    All Patients
                                </button>
                                {uniquePatients.map(p => (
                                    <button key={p.id} onClick={() => setFilter(p.id)} style={{
                                        padding: '10px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                        fontSize: '13px', fontWeight: '800', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                        backgroundColor: filter === p.id ? '#0052FF' : '#ffffff',
                                        color: filter === p.id ? '#ffffff' : '#475467',
                                        border: filter === p.id ? '1px solid #0052FF' : '1px solid #EAECF0',
                                        boxShadow: filter === p.id ? '0 4px 12px rgba(0, 82, 255, 0.2)' : 'none'
                                    }}>
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inventory */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {loading ? (
                            [1,2,3].map(i => <div key={i} style={{ height: '100px', backgroundColor: '#F2F4F7', borderRadius: '24px', animation: 'pulse 1.5s infinite' }} />)
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: '#ffffff', borderRadius: '32px', border: '1px dashed #EAECF0' }}>
                                <FileText size={56} color="#98A2B3" strokeWidth={1.5} style={{ margin: '0 auto 24px', display: 'block' }} />
                                <div style={{ fontSize: '20px', fontWeight: '900', color: '#101828', marginBottom: '8px' }}>Archive Repository Empty</div>
                                <div style={{ fontSize: '15px', color: '#475467', fontWeight: '600' }}> {searchQuery || filter !== 'All' ? "Try adjusting your clinical filters or document search terms." : "Generated reports will synchronize here once clinical sessions are archived."}</div>
                            </div>
                        ) : (
                            filtered.map(report => (
                                <div key={report.id} style={{ 
                                    backgroundColor: '#ffffff', padding: '24px 32px', borderRadius: '24px', 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    boxShadow: '0 4px 12px rgba(16, 24, 40, 0.02)', border: '1px solid #EAECF0',
                                    transition: 'all 0.2s'
                                }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 24, 40, 0.05)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 24, 40, 0.02)'; }}>
                                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>
                                        <div style={{ 
                                            width: '56px', height: '56px', borderRadius: '18px', 
                                            backgroundColor: report.status === 'Ready' ? '#EFF4FF' : '#FFFAEB', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            border: `1px solid ${report.status === 'Ready' ? '#0052FF20' : '#DC680320'}`
                                        }}>
                                            <FileText size={28} color={report.status === 'Ready' ? '#0052FF' : '#DC6803'} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#101828', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{report.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: '#0052FF' }}>
                                                    <User size={14} /> {report.patientName}
                                                </span>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#D0D5DD' }}></div>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#667085', fontWeight: '700' }}>
                                                    <Calendar size={14} /> {report.period}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ 
                                            padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', 
                                            textTransform: 'uppercase', letterSpacing: '0.8px',
                                            backgroundColor: report.status === 'Ready' ? '#ECFDF5' : '#FFFAEB',
                                            color: report.status === 'Ready' ? '#079455' : '#DC6803',
                                            border: `1px solid ${report.status === 'Ready' ? '#07945520' : '#DC680320'}`
                                        }}>
                                            {report.status}
                                        </div>
                                        
                                        {report.status === 'Ready' && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => handleDownload(report)} style={{ width: '44px', height: '44px', borderRadius: '14px', border: '1px solid #EAECF0', backgroundColor: '#ffffff', color: '#475467', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                    <Eye size={20} />
                                                </button>
                                                <button onClick={() => handleDownload(report)} style={{ height: '44px', padding: '0 20px', borderRadius: '14px', border: 'none', backgroundColor: '#0052FF', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px', fontWeight: '800', fontSize: '13px', boxShadow: '0 4px 12px rgba(0, 82, 255, 0.2)' }}>
                                                    <Download size={18} /> Download
                                                </button>
                                            </div>
                                        )}
                                        {report.status !== 'Ready' && (
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#DC6803', width: '100px', textAlign: 'center' }}>Syncing...</span>
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
