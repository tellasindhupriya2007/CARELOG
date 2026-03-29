import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import { listenToPatientAlerts } from '../../utils/realtimeAlerts';
import TopHeader from '../common/TopHeader';
import SkeletonCard from '../common/SkeletonCard';
import ErrorCard from '../common/ErrorCard';
import InputField from '../common/InputField';
import DoctorBottomNav from '../common/DoctorBottomNav';
import Sidebar from '../common/Sidebar';
import PatientDetails from './PatientDetails';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Bell, Search, AlertCircle, Users } from 'lucide-react';

export default function DoctorDashboard() {
    const navigate = useNavigate();
    const { user } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalAlertsCount, setGlobalAlertsCount] = useState(0);
    const [error, setError] = useState(null);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!user) return;

        // As a doctor, query all patients where doctorId == user.uid
        // (For simulation purposes, we might just query all patients if doctor hasn't fully linked, 
        // but strict architecture dictates where 'doctorId' == uid or we just list all mock patients for now)
        const fetchPatientsAndData = async () => {
            try {
                const pQuery = query(collection(db, 'patients'), where('doctorId', '==', user.uid));
                const pSnap = await getDocs(pQuery);

                // If empty mock generic for prototype testing if doctorId isn't linked yet:
                const docsArray = pSnap.empty ? (await getDocs(collection(db, 'patients'))).docs : pSnap.docs;

                const ptList = [];
                const todayString = getTodayDateString();

                for (const docSnap of docsArray) {
                    const baseData = docSnap.data();
                    const mappedPt = {
                        id: docSnap.id,
                        name: baseData.name,
                        age: baseData.age,
                        condition: baseData.condition,
                        score: 0,
                        hasAlert: false
                    };

                    // Check Today's Care Score
                    const logQ = query(collection(db, 'dailyLogs'), where('patientId', '==', docSnap.id), where('date', '==', todayString));
                    const logSnap = await getDocs(logQ);
                    if (!logSnap.empty) {
                        mappedPt.score = logSnap.docs[0].data().careScore || 0;
                    }

                    // Check Recent Alerts for dot
                    const alertQ = query(collection(db, 'alerts'), where('patientId', '==', docSnap.id));
                    const alertSnap = await getDocs(alertQ);
                    if (!alertSnap.empty) {
                        // Count unread generic flag
                        mappedPt.hasAlert = true;
                    }

                    ptList.push(mappedPt);
                }

                setPatients(ptList);
                setFilteredPatients(ptList);
                setLoading(false);

            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setError("Failed to fetch patients.");
                setLoading(false);
            }
        };

        fetchPatientsAndData();

        // Global alerts badge for header utilizing realtime utility hook (null bypasses patient filter)
        const alertsSub = listenToPatientAlerts(null, (liveAlerts) => {
            setGlobalAlertsCount(liveAlerts.length);
        });

        return () => alertsSub();
    }, [user]);

    useEffect(() => {
        if (searchQuery) {
            setFilteredPatients(patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())));
        } else {
            setFilteredPatients(patients);
        }
    }, [searchQuery, patients]);

    const getScoreColor = (score) => {
        if (score >= 8) return colors.primaryGreen;
        if (score >= 5) return colors.alertYellow;
        return colors.alertRed;
    };

    const handlePatientClick = (ptId) => {
        if (isDesktop) {
            setSelectedPatientId(ptId);
        } else {
            navigate(`/doctor/patient/${ptId}`);
        }
    };

    const sidebarItems = [
        { icon: 'Users', label: 'Patients', path: '/doctor/dashboard' },
        { icon: 'Bell', label: 'Alerts', path: '/doctor/alerts' }
    ];

    const attentionNeeded = filteredPatients.filter(pt => pt.hasAlert || pt.score < 5);
    const stable = filteredPatients.filter(pt => !pt.hasAlert && pt.score >= 5);

    const renderPatientCard = (pt) => (
        <div
            key={pt.id}
            onClick={() => handlePatientClick(pt.id)}
            style={{
                backgroundColor: selectedPatientId === pt.id && isDesktop ? colors.lightBlue : colors.white,
                borderRadius: spacing.borderRadius.card,
                padding: spacing.cardPadding,
                boxShadow: spacing.shadows.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                border: selectedPatientId === pt.id && isDesktop ? `2px solid ${colors.primaryBlue}` : '2px solid transparent'
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>
                    {pt.name}
                </span>
                <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                    {pt.age} yrs • {pt.condition}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        border: `3px solid ${getScoreColor(pt.score)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: getScoreColor(pt.score), fontWeight: '700', fontSize: '16px'
                    }}>
                        {pt.score > 0 ? pt.score : '-'}
                    </div>
                </div>

                {pt.hasAlert && (
                    <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors.alertRed,
                        boxShadow: `0 0 8px ${colors.alertRed}`
                    }} />
                )}
            </div>
        </div>
    );

    return (
        <div className="desktop-layout" style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Sidebar navItems={sidebarItems} />
            <div className="desktop-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>

                <TopHeader
                    title="My Patients"
                    rightIcon={
                        <div style={{ position: 'relative' }} onClick={() => navigate('/doctor/alerts')}>
                            <Bell size={24} color={colors.textPrimary} />
                            {globalAlertsCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-4px', right: '-4px', backgroundColor: colors.alertRed, color: colors.white,
                                    fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {globalAlertsCount}
                                </span>
                            )}
                        </div>
                    }
                />

                <div className="main-content doctor-grid scroll-y" style={{ padding: spacing.pagePadding }}>

                    {/* Left Column: Patients List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Search Bar */}
                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <Search size={20} color={colors.textSecondary} style={{ position: 'absolute', left: '16px', top: '16px', zIndex: 1 }} />
                            <InputField
                                placeholder="Search patients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '48px', backgroundColor: colors.white }}
                            />
                        </div>

                        {/* Patients List */}
                        {error ? (
                            <ErrorCard message={error} />
                        ) : loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '90px' }}>
                                {filteredPatients.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: colors.textSecondary, marginTop: '32px', fontSize: '14px' }}>
                                        No patients matched your search.
                                    </div>
                                ) : (
                                    <>
                                        {attentionNeeded.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attention Needed</span>
                                                {attentionNeeded.map(renderPatientCard)}
                                            </div>
                                        )}
                                        {stable.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stable</span>
                                                {stable.map(renderPatientCard)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column (Desktop Only): Inline Patient Details */}
                    <div className="desktop-only" style={{ flexDirection: 'column', backgroundColor: colors.white, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}`, height: 'calc(100vh - 100px)' }}>
                        {selectedPatientId ? (
                            <div style={{ height: '100%', overflowY: 'auto' }}>
                                <PatientDetails inlinePatientId={selectedPatientId} />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSecondary, gap: '16px' }}>
                                <Users size={64} color={colors.border} />
                                <span style={{ fontSize: '18px', fontWeight: '600' }}>Select a patient to view details</span>
                            </div>
                        )}
                    </div>

                </div>

                <div className="mobile-only">
                    <DoctorBottomNav />
                </div>
            </div>
        </div>
    );
}
