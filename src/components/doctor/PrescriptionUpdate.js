import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import InputField from '../common/InputField';
import Card from '../common/Card';
import ErrorCard from '../common/ErrorCard';
import SkeletonCard from '../common/SkeletonCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Edit2, Trash2, Plus, X } from 'lucide-react';

export default function PrescriptionUpdate() {
    const navigate = useNavigate();
    // Usually passed via state or Context. Using state as proxy if routed from detail:
    const location = useLocation();
    const patientId = location.state?.patientId || "mock_patient_id";
    const patientNamePassed = location.state?.patientName || "Patient";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [medicines, setMedicines] = useState([]);

    // Modals state
    const [showEditSheet, setShowEditSheet] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [activeItemIndex, setActiveItemIndex] = useState(null);
    const [medName, setMedName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('1x Daily');
    const [time, setTime] = useState('08:00');

    useEffect(() => {
        // We fetch current medicines from carePlans collection since it dictates Checklist
        const fetchPlan = async () => {
            try {
                if (!patientId || patientId === "mock_patient_id") {
                    // If no active routing block, generate sample
                    setMedicines([
                        { name: "Lisinopril", dosage: "10mg", frequency: "1x Daily", scheduledTimes: ["08:00"] }
                    ]);
                    setLoading(false);
                    return;
                }

                const planDoc = await getDoc(doc(db, 'carePlans', patientId));
                if (planDoc.exists()) {
                    setMedicines(planDoc.data().medicines || []);
                } else {
                    setMedicines([]);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("Failed to load prescription data.");
                setLoading(false);
            }
        };
        fetchPlan();
    }, [patientId]);

    const openAdd = () => {
        setActiveItemIndex(null);
        setMedName('');
        setDosage('');
        setFrequency('1x Daily');
        setTime('08:00');
        setShowEditSheet(true);
    };

    const openEdit = (index) => {
        setActiveItemIndex(index);
        const med = medicines[index];
        setMedName(med.name);
        setDosage(med.dosage);
        setFrequency(med.frequency || '1x Daily');
        setTime(med.scheduledTimes?.[0] || '08:00');
        setShowEditSheet(true);
    };

    const saveMedToList = () => {
        if (!medName || !dosage) return;

        const newMed = {
            name: medName,
            dosage,
            frequency,
            scheduledTimes: [time],
            medicineId: Date.now().toString()
        };

        if (activeItemIndex !== null) {
            const updated = [...medicines];
            updated[activeItemIndex] = newMed;
            setMedicines(updated);
        } else {
            setMedicines([...medicines, newMed]);
        }
        setShowEditSheet(false);
    };

    const handleDelete = () => {
        if (activeItemIndex === null) return;
        const updated = [...medicines];
        updated.splice(activeItemIndex, 1);
        setMedicines(updated);
        setShowDeleteConfirm(false);
    };

    const handleGlobalSave = async () => {
        setSubmitting(true);
        try {
            // Valid mapping to carePlans to update Caretaker Checklist
            const planRef = doc(db, 'carePlans', patientId);
            await updateDoc(planRef, {
                medicines: medicines,
                lastUpdatedBy: "Doctor",
                updatedAt: serverTimestamp()
            });

            // Maintain isolated prescription record mapping
            const rxRef = collection(db, 'prescriptions');
            await addDoc(rxRef, {
                patientId,
                photoUrl: '',
                medicines,
                uploadedBy: 'Doctor',
                uploadedAt: serverTimestamp()
            });

            // Simulate FCM Notification mapping to alerts natively
            await addDoc(collection(db, 'alerts'), {
                type: 'Blue',
                title: 'Prescription Updated',
                message: `Doctor updated prescription. Appended ${medicines.length} routines to tracker.`,
                triggeredAt: serverTimestamp(),
                patientId: patientId
            });

            setShowSaveConfirm(false);
            setSubmitting(false);
            navigate(-1); // Back to previous page natively
        } catch (err) {
            console.error(err);
            setError("Failed to update prescription online.");
            setSubmitting(false);
            setShowSaveConfirm(false);
        }
    };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            <TopHeader showBack onBack={() => navigate(-1)} title={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: colors.textPrimary }}>Update Prescription</span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>{patientNamePassed}</span>
                </div>
            } />

            <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>

                {error && <ErrorCard message={error} />}

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonCard style={{ height: '80px' }} />
                        <SkeletonCard style={{ height: '80px' }} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

                        {medicines.length === 0 ? (
                            <Card style={{ textAlign: 'center', padding: '24px' }}>
                                <span style={{ color: colors.textSecondary, fontSize: '14px' }}>No active medicines prescribed.</span>
                            </Card>
                        ) : (
                            medicines.map((m, idx) => (
                                <Card key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>{m.name}</span>
                                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>{m.dosage} • {m.frequency}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <Edit2 size={20} color={colors.primaryBlue} onClick={() => openEdit(idx)} style={{ cursor: 'pointer' }} />
                                        <Trash2 size={20} color={colors.alertRed} onClick={() => { setActiveItemIndex(idx); setShowDeleteConfirm(true); }} style={{ cursor: 'pointer' }} />
                                    </div>
                                </Card>
                            ))
                        )}

                        <button
                            onClick={openAdd}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                width: '100%', height: '52px', backgroundColor: colors.lightBlue,
                                border: `1px dashed ${colors.primaryBlue}`, borderRadius: spacing.borderRadius.card,
                                color: colors.primaryBlue, fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                marginTop: '12px' // Spacing from list
                            }}
                        >
                            <Plus size={20} /> Add New Medicine
                        </button>

                    </div>
                )}

                <div style={{ marginTop: 'auto', marginBottom: '16px', paddingTop: '24px' }}>
                    <PrimaryButton label="Save and Notify" onClick={() => setShowSaveConfirm(true)} disabled={loading} />
                </div>

            </div>

            {/* Edit Modal (Bottom Sheet) */}
            {showEditSheet && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
                    <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{activeItemIndex !== null ? 'Edit Medicine' : 'Add Medicine'}</h3>
                            <X size={24} color={colors.textSecondary} onClick={() => setShowEditSheet(false)} style={{ cursor: 'pointer' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                            <InputField label="Medicine Name" placeholder="E.g. Lisinopril" value={medName} onChange={(e) => setMedName(e.target.value)} />
                            <InputField label="Dosage" placeholder="E.g. 10mg" value={dosage} onChange={(e) => setDosage(e.target.value)} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: colors.textSecondary }}>Frequency</span>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    style={{
                                        height: '52px', backgroundColor: colors.background, border: `1.5px solid ${colors.border}`,
                                        borderRadius: spacing.borderRadius.input, padding: '0 16px', fontSize: '16px', color: colors.textPrimary
                                    }}
                                >
                                    <option value="1x Daily">1x Daily</option>
                                    <option value="2x Daily">2x Daily</option>
                                    <option value="3x Daily">3x Daily</option>
                                    <option value="As Needed">As Needed</option>
                                </select>
                            </div>

                            <InputField label="Scheduled Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>

                        <PrimaryButton label={activeItemIndex !== null ? 'Update' : 'Add to Plan'} onClick={saveMedToList} disabled={!medName || !dosage} />
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 110, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
                    <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>Delete Medicine?</h3>
                        <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>Are you sure you want to remove this medicine from the checklist?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div onClick={handleDelete} style={{ backgroundColor: colors.alertRed, color: colors.white, height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: spacing.borderRadius.button, fontWeight: '600', cursor: 'pointer' }}>Delete</div>
                            <SecondaryButton label="Cancel" onClick={() => setShowDeleteConfirm(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Save Confirmation */}
            {showSaveConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 110, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
                    <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', textAlign: 'center', color: colors.primaryBlue }}>Confirm Changes</h3>
                        <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
                            This will update the caretaker checklist and notify the family and caretaker. Confirm?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <PrimaryButton label="Confirm & Notify" onClick={handleGlobalSave} isLoading={submitting} disabled={submitting} />
                            <SecondaryButton label="Cancel" onClick={() => setShowSaveConfirm(false)} disabled={submitting} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
        </div>
    );
}
