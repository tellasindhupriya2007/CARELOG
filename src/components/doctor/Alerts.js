import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import DoctorBottomNav from '../common/DoctorBottomNav';
import SkeletonCard from '../common/SkeletonCard';
import Card from '../common/Card';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Bell } from 'lucide-react';

export default function DoctorAlerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                // Fetch all recent alerts across all patients
                const q = query(collection(db, 'alerts'), orderBy('triggeredAt', 'desc'));
                const snap = await getDocs(q);
                setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchAlerts();
    }, []);

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopHeader title="System Alerts" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, paddingBottom: '90px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <SkeletonCard /><SkeletonCard />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', color: colors.textSecondary, marginTop: '24px' }}>No active alerts.</div>
                        ) : (
                            alerts.map((alt) => (
                                <Card key={alt.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderLeft: `4px solid ${alt.type === 'Red' ? colors.alertRed : colors.alertOrange}` }} onClick={() => navigate(`/doctor/patient/${alt.patientId}`)}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: alt.type === 'Red' ? colors.lightRed : colors.lightOrange, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <Bell size={24} color={alt.type === 'Red' ? colors.alertRed : colors.alertOrange} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>{alt.title}</span>
                                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>{alt.message}</span>
                                        <span style={{ fontSize: '12px', color: alt.type === 'Red' ? colors.alertRed : colors.alertOrange, marginTop: '4px' }}>
                                            {alt.triggeredAt ? new Date(alt.triggeredAt.toDate()).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>

            <DoctorBottomNav />
        </div>
    );
}
