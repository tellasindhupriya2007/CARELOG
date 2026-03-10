import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import DoctorBottomNav from '../common/DoctorBottomNav';
import SkeletonCard from '../common/SkeletonCard';
import Card from '../common/Card';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { getTodayDateString } from '../../utils/dateHelpers';
import { FileText, ClipboardList } from 'lucide-react';

export default function PatientDetails({ inlinePatientId }) {
    const navigate = useNavigate();
    const { id: paramId } = useParams(); // patientId
    const id = inlinePatientId || paramId;

    const [loading, setLoading] = useState(true);
    const [patientData, setPatientData] = useState(null);
    const [dailyLog, setDailyLog] = useState(null);
    const [recentAlerts, setRecentAlerts] = useState([]);

    useEffect(() => {
        const fetchPatientDetails = async () => {
            if (!id) return;
            try {
                // Fetch Patient profile
                const pDoc = await getDoc(doc(db, 'patients', id));
                if (pDoc.exists()) setPatientData(pDoc.data());

                // Fetch real-time health for today
                const logQ = query(collection(db, 'dailyLogs'), where('patientId', '==', id), where('date', '==', getTodayDateString()));
                const logSnap = await getDocs(logQ);
                if (!logSnap.empty) setDailyLog(logSnap.docs[0].data());

                // Fetch top 3 latest alerts specifically for them
                const altQ = query(collection(db, 'alerts'), where('patientId', '==', id), orderBy('triggeredAt', 'desc'), limit(3));
                const altSnap = await getDocs(altQ);
                if (!altSnap.empty) {
                    setRecentAlerts(altSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }

            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchPatientDetails();
    }, [id]);

    const getScoreColor = (score) => {
        if (score >= 8) return colors.primaryGreen;
        if (score >= 5) return colors.alertYellow;
        return colors.alertRed;
    };

    return (
        <div style={{ backgroundColor: inlinePatientId ? 'transparent' : colors.background, minHeight: inlinePatientId ? 'auto' : '100vh', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!inlinePatientId && <TopHeader title={patientData ? patientData.name : "Loading..."} showBack onBack={() => navigate(-1)} />}

            <div style={{ padding: spacing.pagePadding, flex: 1, paddingBottom: '90px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonCard style={{ height: '120px' }} />
                        <SkeletonCard style={{ height: '160px' }} />
                        <SkeletonCard style={{ height: '90px' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Patient Micro Header */}
                        <Card style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '18px', fontWeight: '700', color: colors.textPrimary }}>{patientData?.name}</span>
                                <span style={{ fontSize: '14px', color: colors.textSecondary }}>{patientData?.age} yrs • {patientData?.condition}</span>
                            </div>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                border: `4px solid ${getScoreColor(dailyLog?.careScore || 0)}`,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: '20px', fontWeight: '700', color: getScoreColor(dailyLog?.careScore || 0) }}>{dailyLog?.careScore || '-'}</span>
                            </div>
                        </Card>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <PrimaryButton
                                    label={
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <ClipboardList size={20} /> Update Prescriptions
                                        </div>
                                    }
                                    onClick={() => navigate(`/doctor/prescription/${id}`, { state: { patientId: id, patientName: patientData?.name } })}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <SecondaryButton
                                    label={
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <FileText size={20} /> View Weekly Report
                                        </div>
                                    }
                                    onClick={() => navigate(`/doctor/report/${id}`)}
                                />
                            </div>
                        </div>

                        {/* Recent Alerts */}
                        <Card style={{ padding: '16px', marginTop: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, display: 'block', marginBottom: '12px' }}>Recent Health Alerts</span>
                            {recentAlerts.length === 0 ? (
                                <span style={{ fontSize: '14px', color: colors.textSecondary }}>No recent alerts.</span>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {recentAlerts.map(alt => (
                                        <div key={alt.id} style={{ display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${colors.alertRed}`, paddingLeft: '12px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.alertRed }}>{alt.title}</span>
                                            <span style={{ fontSize: '14px', color: colors.textPrimary }}>{alt.message}</span>
                                            <span style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px' }}>{alt.triggeredAt ? new Date(alt.triggeredAt.toDate()).toLocaleString() : 'Just now'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                    </div>
                )}
            </div>

            {!inlinePatientId && <DoctorBottomNav />}
        </div>
    );
}
