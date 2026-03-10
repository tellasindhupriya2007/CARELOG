import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import DoctorBottomNav from '../common/DoctorBottomNav';
import SkeletonCard from '../common/SkeletonCard';
import Card from '../common/Card';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { FileText } from 'lucide-react';

export default function DoctorReports() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                // simple fetch patients
                const snap = await getDocs(query(collection(db, 'patients')));
                setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchPatients();
    }, []);

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopHeader title="Patient Reports" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, paddingBottom: '90px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <SkeletonCard /><SkeletonCard />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {patients.length === 0 ? (
                            <div style={{ textAlign: 'center', color: colors.textSecondary, marginTop: '24px' }}>No patients found to generate reports for.</div>
                        ) : (
                            patients.map((pt) => (
                                <Card key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer' }} onClick={() => navigate(`/doctor/report/${pt.id}`)}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: colors.background, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <FileText size={24} color={colors.primaryBlue} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>{pt.name}</span>
                                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>Generate Weekly PDF Report</span>
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
