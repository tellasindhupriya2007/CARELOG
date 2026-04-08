import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS, card, sectionLabel, gradientBtn } from './ds';
import DoctorShell from './DoctorShell';
import { 
    Edit2, Trash2, Plus, X, Pill, Save, ChevronLeft, 
    Clock, AlertTriangle, CheckCircle 
} from 'lucide-react';

export default function PrescriptionUpdate() {
    const navigate = useNavigate();
    const location = useLocation();
    const patientId = location.state?.patientId || "mock_patient_id";
    const patientNamePassed = location.state?.patientName || "Patient";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [medicines, setMedicines] = useState([]);

    const [showEditSheet, setShowEditSheet] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [activeItemIndex, setActiveItemIndex] = useState(null);
    const [medName, setMedName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('1x Daily');
    const [time, setTime] = useState('08:00');

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                if (!patientId || patientId === "mock_patient_id") {
                    setMedicines([{ name: "Lisinopril", dosage: "10mg", frequency: "1x Daily", scheduledTimes: ["08:00"] }]);
                    setLoading(false);
                    return;
                }
                const planDoc = await getDoc(doc(db, 'carePlans', patientId));
                if (planDoc.exists()) setMedicines(planDoc.data().medicines || []);
                setLoading(false);
            } catch (err) {
                setError("Failed to load clinical protocols.");
                setLoading(false);
            }
        };
        fetchPlan();
    }, [patientId]);

    const openAdd = () => {
        setActiveItemIndex(null);
        setMedName(''); setDosage(''); setFrequency('1x Daily'); setTime('08:00');
        setShowEditSheet(true);
    };

    const openEdit = (index) => {
        setActiveItemIndex(index);
        const med = medicines[index];
        setMedName(med.name); setDosage(med.dosage); setFrequency(med.frequency || '1x Daily'); setTime(med.scheduledTimes?.[0] || '08:00');
        setShowEditSheet(true);
    };

    const saveMedToList = () => {
        if (!medName || !dosage) return;
        const newMed = { name: medName, dosage, frequency, scheduledTimes: [time], medicineId: Date.now().toString() };
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
            const planRef = doc(db, 'carePlans', patientId);
            await updateDoc(planRef, { medicines, lastUpdatedBy: "Doctor", updatedAt: serverTimestamp() });
            await addDoc(collection(db, 'prescriptions'), { patientId, medicines, uploadedBy: 'Doctor', uploadedAt: serverTimestamp() });
            await addDoc(collection(db, 'alerts'), {
                type: 'Blue',
                title: 'Prescription Updated',
                message: `Doctor updated prescription. Appended ${medicines.length} routines to tracker.`,
                triggeredAt: serverTimestamp(),
                patientId: patientId,
                severity: 'info',
                status: 'active'
            });
            setShowSaveConfirm(false);
            setSubmitting(false);
            navigate(-1);
        } catch (err) {
            setError("Protocol update failed.");
            setSubmitting(false);
            setShowSaveConfirm(false);
        }
    };

    return (
        <DoctorShell>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC', padding: '40px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '14px', border: '1px solid #EAECF0', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={20} color="#667085" />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#101828', margin: 0, letterSpacing: '-0.8px' }}>Update Protocol</h1>
                            <p style={{ fontSize: '14px', color: '#667085', fontWeight: '600', margin: '2px 0 0 0' }}>Patient: {patientNamePassed}</p>
                        </div>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: '#FEF3F2', borderRadius: '16px', padding: '16px 24px', color: '#B42318', fontWeight: '700', marginBottom: '24px', border: '1px solid #FEE4E2' }}>
                            ⚠ Operational Error: {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {loading ? [1, 2].map(i => <div key={i} style={{ height: '100px', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #EAECF0', opacity: 0.5 }} />) : (
                            <>
                                {medicines.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#ffffff', borderRadius: '32px', border: '1px dashed #EAECF0' }}>
                                        <Pill size={48} color="#98A2B3" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '15px', color: '#667085', fontWeight: '700' }}>No active prescriptions in protocol.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
                                        {medicines.map((m, idx) => (
                                            <div key={idx} style={{ 
                                                backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #EAECF0', 
                                                boxShadow: '0 4px 12px rgba(16, 24, 40, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                                            }}>
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Pill size={22} color="#0052FF" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#101828' }}>{m.name}</div>
                                                        <div style={{ fontSize: '13px', color: '#667085', fontWeight: '700' }}>{m.dosage} • {m.frequency}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => openEdit(idx)} style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: '#F9FAFB', color: '#0052FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => { setActiveItemIndex(idx); setShowDeleteConfirm(true); }} style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: '#FEF3F2', color: '#D92D20', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={openAdd} style={{
                                    width: '100%', height: '72px', border: '1px dashed #D0D5DD', borderRadius: '24px', backgroundColor: '#ffffff',
                                    color: '#0052FF', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    transition: 'all 0.2s'
                                }}>
                                    <Plus size={20} /> Add Medical Directive
                                </button>
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: '40px', borderTop: '1px solid #EAECF0', paddingTop: '32px' }}>
                        <button onClick={() => setShowSaveConfirm(true)} disabled={loading || medicines.length === 0} style={gradientBtn('#0052FF', '#0041CC', { width: '100%', height: '56px', borderRadius: '16px', fontSize: '16px' })}>
                            <Save size={18} /> Finalize and Notify Checklist
                        </button>
                    </div>

                </div>
            </div>

            {/* Modal Components */}
            {(showEditSheet || showDeleteConfirm || showSaveConfirm) && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(16, 24, 40, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    
                    {showEditSheet && (
                        <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '32px', padding: '32px', boxShadow: '0 24px 48px -12px rgba(16, 24, 40, 0.18)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#101828' }}>{activeItemIndex !== null ? 'Modify Directive' : 'New Medical Directive'}</h3>
                                <button onClick={() => setShowEditSheet(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px' }}><X size={24} color="#667085" /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={sectionLabel}>Medication Name</label>
                                    <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g. Amlodipine" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D0D5DD', fontSize: '15px', fontWeight: '700', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={sectionLabel}>Dosage Unit</label>
                                    <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 5mg" style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D0D5DD', fontSize: '15px', fontWeight: '700', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={sectionLabel}>Frequency</label>
                                        <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={{ height: '48px', padding: '0 12px', borderRadius: '12px', border: '1px solid #D0D5DD', fontSize: '14px', fontWeight: '700', backgroundColor: '#F9FAFB' }}>
                                            <option value="1x Daily">1x Daily</option>
                                            <option value="2x Daily">2x Daily</option>
                                            <option value="3x Daily">3x Daily</option>
                                            <option value="As Needed">As Needed</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={sectionLabel}>Scheduled Time</label>
                                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ height: '48px', padding: '0 12px', borderRadius: '12px', border: '1px solid #D0D5DD', fontSize: '14px', fontWeight: '700', backgroundColor: '#F9FAFB' }} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={saveMedToList} disabled={!medName || !dosage} style={gradientBtn('#0052FF', '#0041CC', { width: '100%', height: '52px', borderRadius: '14px' })}>
                                {activeItemIndex !== null ? 'Update Directive' : 'Apend to Protocol'}
                            </button>
                        </div>
                    )}

                    {showDeleteConfirm && (
                        <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#FEF3F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertTriangle size={32} color="#D92D20" />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#101828', marginBottom: '8px' }}>Remove Directive?</h3>
                            <p style={{ fontSize: '14px', color: '#667085', fontWeight: '600', marginBottom: '24px' }}>This will immediately remove the medication from the caretaker's daily clinical checklist.</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, height: '48px', borderRadius: '14px', border: '1px solid #EAECF0', backgroundColor: '#ffffff', color: '#475467', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleDelete} style={{ flex: 1, height: '48px', borderRadius: '14px', border: 'none', backgroundColor: '#D92D20', color: '#ffffff', fontWeight: '800', cursor: 'pointer' }}>Remove</button>
                            </div>
                        </div>
                    )}

                    {showSaveConfirm && (
                        <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircle size={32} color="#079455" />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#101828', marginBottom: '8px' }}>Confirm Protocol</h3>
                            <p style={{ fontSize: '14px', color: '#667085', fontWeight: '600', marginBottom: '24px' }}>Finalizing this protocol will trigger a mission-critical alert to the caretaker's device and the family dashboard.</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowSaveConfirm(false)} style={{ flex: 1, height: '48px', borderRadius: '14px', border: '1px solid #EAECF0', backgroundColor: '#ffffff', color: '#475467', fontWeight: '800', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }} disabled={submitting}>Review</button>
                                <button onClick={handleGlobalSave} disabled={submitting} style={gradientBtn('#0052FF', '#0041CC', { flex: 1, height: '48px', borderRadius: '14px' })}>
                                    {submitting ? 'Updating...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </DoctorShell>
    );
}
