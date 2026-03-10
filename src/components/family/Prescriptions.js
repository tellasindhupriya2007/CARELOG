import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import Card from '../common/Card';
import FamilyBottomNav from '../common/FamilyBottomNav';
import SkeletonCard from '../common/SkeletonCard';
import PrimaryButton from '../common/PrimaryButton';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Pill, UploadCloud, Loader2 } from 'lucide-react';

export default function FamilyPrescriptions() {
    const navigate = useNavigate();
    const { patientId, user } = useAuthContext();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchMeds = async () => {
            if (!patientId) return;
            try {
                // Read from prescriptions collection properly
                const q = query(collection(db, 'prescriptions'), where('patientId', '==', patientId), orderBy('uploadedAt', 'desc'), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setMedicines(snap.docs[0].data().medicines || []);
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

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !patientId) return;

        setUploading(true);
        try {
            // Upload to storage
            const fileRef = ref(storage, `prescriptions/${patientId}_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const photoUrl = await getDownloadURL(fileRef);

            // Write to prescriptions collection properly
            await addDoc(collection(db, 'prescriptions'), {
                patientId,
                photoUrl,
                uploadedAt: serverTimestamp(),
                uploadedBy: 'Family',
                medicines: medicines // Propagate current active list along with it
            });

            // Update carePlans as well just to ensure caretaker is synced natively
            await updateDoc(doc(db, 'carePlans', patientId), {
                lastPrescriptionImg: photoUrl,
                updatedAt: serverTimestamp()
            });

            showToast("Prescription uploaded successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to upload prescription.", "error");
        }
        setUploading(false);
    };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? colors.successGreen : colors.alertRed,
                    color: toast.type === 'success' ? colors.primaryGreen : colors.white,
                    padding: '12px 24px', borderRadius: spacing.borderRadius.badge, fontWeight: '600',
                    boxShadow: spacing.shadows.card, zIndex: 100, animation: 'slideDown 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}

            <TopHeader title="Active Prescriptions" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, paddingBottom: '90px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUpload}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            disabled={uploading}
                        />
                        <button style={{
                            width: '100%', height: '52px', backgroundColor: colors.lightBlue,
                            border: `1px dashed ${colors.primaryBlue}`, borderRadius: spacing.borderRadius.card,
                            color: colors.primaryBlue, fontSize: '14px', fontWeight: '600',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}>
                            {uploading ? <Loader2 size={20} className="spinner" /> : <UploadCloud size={20} />}
                            {uploading ? "Uploading..." : "Upload New Prescription"}
                        </button>
                    </div>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px', display: 'block', textAlign: 'center' }}>
                        Uploading a photo updates the isolated prescription records.
                    </span>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <SkeletonCard /><SkeletonCard />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>Current Medicines</h3>
                        {medicines.length === 0 ? (
                            <div style={{ textAlign: 'center', color: colors.textSecondary, marginTop: '24px' }}>No active prescriptions.</div>
                        ) : (
                            medicines.map((m, i) => (
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
                        )}
                    </div>
                )}
            </div>

            <FamilyBottomNav />
            <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } } @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}
