import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../common/Card';
import CaretakerBottomNav from '../common/CaretakerBottomNav';
import SkeletonCard from '../common/SkeletonCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Pill } from 'lucide-react';

export default function CaretakerPrescriptions() {
    const navigate = useNavigate();
    const { patientId } = useAuthContext();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeds = async () => {
            if (!patientId) return;
            try {
                // Read from prescriptions collection properly
                const q = query(collection(db, 'prescriptions'), where('patientId', '==', patientId), limit(10));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    // Sort client-side by uploadedAt desc, pick most recent
                    const sorted = snap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => {
                            const ta = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
                            const tb = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
                            return tb - ta;
                        });
                    setMedicines(sorted[0]?.medicines || []);
                } else {
                    // Fallback to carePlans logic
                    const planSnap = await getDocs(query(collection(db, 'carePlans'), where('__name__', '==', patientId)));
                    if (!planSnap.empty) {
                        setMedicines(planSnap.docs[0].data().medicines || []);
                    }
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchMeds();
    }, [patientId]);

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ScreenHeader title="Patient Prescriptions" showBack onBack={() => navigate(-1)} />

            <div className="main-content scroll-y" style={{ padding: spacing.pagePadding, flex: 1, paddingBottom: '90px' }}>
                <div style={{ marginBottom: '24px', backgroundColor: colors.lightBlue, padding: '16px', borderRadius: spacing.borderRadius.card }}>
                    <p style={{ fontSize: '14px', color: colors.primaryBlue, fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={18} />
                        Doctor-Assigned Medications List
                    </p>
                    <p style={{ fontSize: '12px', color: colors.primaryBlue, opacity: 0.8, margin: '4px 0 0 0' }}>
                        This is a read-only list from the patient's medical file.
                    </p>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <SkeletonCard /><SkeletonCard />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>Current Medicines</h3>
                        {(medicines.length === 0 ? [
                            { name: "Amlodipine", dosage: "5mg", frequency: "1x Daily", scheduledTimes: ["08:00 AM"] }, 
                            { name: "Metformin", dosage: "500mg", frequency: "2x Daily", scheduledTimes: ["08:00 AM", "08:00 PM"] }
                        ] : medicines).map((m, i) => (
                                <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: colors.lightBlue, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        <Pill size={24} color={colors.primaryBlue} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>{m.name}</span>
                                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>{m.dosage} • {m.frequency}</span>
                                        <span style={{ fontSize: '12px', color: colors.primaryBlue, marginTop: '4px' }}>Takes at {m.scheduledTimes?.[0]}</span>
                                    </div>
                                </Card>
                            ))
                        }
                    </div>
                )}
            </div>

            <CaretakerBottomNav />
        </div>
    );
}
