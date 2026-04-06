import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../../components/common/TopHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Link2, ShieldCheck, Search, AlertCircle } from 'lucide-react';

export default function LinkPatient() {
    const navigate = useNavigate();
    const { user, role, setPatientId } = useAuthContext();
    const [patientIdInput, setPatientIdInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [foundPatient, setFoundPatient] = useState(null);

    const handleSearch = async () => {
        if (!patientIdInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            // Find by human-readable patientId (e.g. CL-2026-...)
            const q = query(collection(db, 'patients'), where('patientId', '==', patientIdInput.trim().toUpperCase()));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setError("Patient ID not found. Please check with the family.");
                setFoundPatient(null);
            } else {
                const pDoc = snap.docs[0];
                setFoundPatient({ id: pDoc.id, ...pDoc.data() });
            }
        } catch (err) {
            setError("Error searching for patient.");
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async () => {
        if (!foundPatient || !user) return;
        setLoading(true);
        try {
            const pRef = doc(db, 'patients', foundPatient.id);
            const uRef = doc(db, 'users', user.uid);

            const updates = {
                patientId: foundPatient.id,
                assignedPatientId: foundPatient.id
            };

            // Link in patient doc
            const patUpdates = {};
            if (role === 'doctor') {
                patUpdates.doctorId = user.uid;
            } else if (role === 'caretaker') {
                patUpdates.caregiverId = user.uid;
                patUpdates.caretakerIds = arrayUnion(user.uid);
            }
            
            await updateDoc(pRef, patUpdates);
            await updateDoc(uRef, updates);

            setPatientId(foundPatient.id);
            
            // Navigate to appropriate dashboard
            if (role === 'doctor') navigate('/doctor/dashboard');
            else navigate('/caretaker/dashboard');

        } catch (err) {
            setError("Failed to link to patient. Contact support.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
            <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <TopHeader title="Link Account" showBack onBack={() => navigate('/auth/splash')} />
                
                <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '480px', margin: '0 auto', justifyContent: 'center' }}>
                    
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: colors.lightBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Link2 size={32} color={colors.primaryBlue} />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: colors.textPrimary, marginBottom: '8px' }}>Join Care Team</h2>
                        <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: '1.6' }}>Enter the unique Patient ID shared by the family to access their records and start messaging.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                placeholder="Enter ID (e.g. CL-2026-XXXX)"
                                value={patientIdInput}
                                onChange={(e) => setPatientIdInput(e.target.value)}
                                style={{
                                    width: '100%', padding: '18px 20px 18px 48px', borderRadius: '16px', border: `2px solid ${error ? colors.alertRed : colors.border}`,
                                    fontSize: '16px', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s', textTransform: 'uppercase'
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <Search size={20} color={colors.textSecondary} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>

                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.alertRed, fontSize: '14px', fontWeight: '600', padding: '0 8px' }}>
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {!foundPatient ? (
                            <PrimaryButton label={loading ? "Searching..." : "Lookup Patient"} onClick={handleSearch} disabled={loading || !patientIdInput} />
                        ) : (
                            <div style={{ 
                                padding: '24px', backgroundColor: colors.background, borderRadius: '20px', border: `2px solid ${colors.primaryGreen}`,
                                display: 'flex', flexDirection: 'column', gap: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: colors.lightGreen, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ShieldCheck size={24} color={colors.primaryGreen} />
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Patient Found</span>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: colors.textPrimary, margin: 0 }}>{foundPatient.name}</h3>
                                    </div>
                                </div>
                                <PrimaryButton label={loading ? "Linking..." : "Confirm & Link"} onClick={handleLink} disabled={loading} style={{ backgroundColor: colors.primaryGreen }} />
                            </div>
                        )}
                    </div>

                    <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '24px' }}>
                        Don't have an ID? Ask the primary family member to generate one from their dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
