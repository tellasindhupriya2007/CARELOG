import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import InputField from '../common/InputField';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import ErrorCard from '../common/ErrorCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { CheckCircle2 } from 'lucide-react';

export default function RegisterScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, setRoleAndPatient } = useAuthContext();

    const rolePassed = location.state?.role || 'family';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [patientIdInput, setPatientIdInput] = useState('');
    const [patientIdError, setPatientIdError] = useState('');
    const [patientIdSuccess, setPatientIdSuccess] = useState('');
    const [resolvedPatient, setResolvedPatient] = useState(null); // { docId, name, humanId }
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchingId, setSearchingId] = useState(false);

    // Caretaker: verify Patient ID before allowing register
    const handleVerifyPatientId = async () => {
        if (!patientIdInput.trim()) {
            setPatientIdError('Please enter a Patient ID.');
            return;
        }
        setSearchingId(true);
        setPatientIdError('');
        setPatientIdSuccess('');
        setResolvedPatient(null);

        try {
            const q = query(collection(db, 'patients'), where('patientId', '==', patientIdInput.trim().toUpperCase()));
            const snap = await getDocs(q);
            if (snap.empty) {
                setPatientIdError('Invalid Patient ID. Please check with your family.');
            } else {
                const patDoc = snap.docs[0];
                const patData = patDoc.data();
                setResolvedPatient({ docId: patDoc.id, name: patData.name, humanId: patData.patientId });
                setPatientIdSuccess(`✓ Found: ${patData.name}'s care profile`);
            }
        } catch (err) {
            console.error(err);
            setPatientIdError('Failed to verify ID. Try again.');
        }
        setSearchingId(false);
    };

    const handleRegister = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        setError(null);
        setLoading(true);

        if (!name || !email || !password || !confirm) {
            setError('All fields are required.');
            setLoading(false);
            return;
        }

        if (password !== confirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        if (rolePassed === 'caretaker' && !resolvedPatient) {
            setError('Please verify your Patient ID before registering.');
            setLoading(false);
            return;
        }

        try {
            const newUser = await register(name, email, password, rolePassed);

            if (rolePassed === 'caretaker' && resolvedPatient) {
                // Link caretaker to the patient document
                await updateDoc(doc(db, 'patients', resolvedPatient.docId), {
                    caretakerIds: arrayUnion(newUser.uid)
                });

                // Also save the patient's doc ID in the user's profile
                const { doc: firestoreDoc, updateDoc: fsUpdateDoc } = await import('firebase/firestore');
                await fsUpdateDoc(firestoreDoc(db, 'users', newUser.uid), {
                    assignedPatientId: resolvedPatient.docId,
                    patientId: resolvedPatient.docId
                });

                setRoleAndPatient('caretaker', resolvedPatient.docId);
                navigate('/caretaker/dashboard', { replace: true });

            } else if (rolePassed === 'family') {
                setRoleAndPatient('family', null);
                navigate('/family/onboarding/step-1', { replace: true });

            } else if (rolePassed === 'doctor') {
                setRoleAndPatient('doctor', null);
                navigate('/doctor/dashboard', { replace: true });

            } else {
                navigate('/auth/splash', { replace: true });
            }

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email is already registered.');
            } else {
                setError('Registration failed. Please try again.');
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
            <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <TopHeader title="Create Account" showBack onBack={() => navigate(-1)} />

                <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: colors.textSecondary, marginBottom: '4px' }}>
                        Signing up as a <strong style={{ color: colors.primaryBlue }}>{rolePassed.charAt(0).toUpperCase() + rolePassed.slice(1)}</strong>.
                    </p>

                    {error && <ErrorCard message={error} style={{ marginBottom: '4px' }} />}

                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                        <InputField
                            label="Full Name"
                            type="text"
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <InputField
                            label="Email Address"
                            type="email"
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <InputField
                            label="Confirm Password"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />

                        {/* ── CARETAKER: Patient ID Input ── */}
                        {rolePassed === 'caretaker' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <InputField
                                        label="Patient ID"
                                        type="text"
                                        placeholder="e.g. CL-2026-4729"
                                        value={patientIdInput}
                                        onChange={(e) => {
                                            setPatientIdInput(e.target.value.toUpperCase());
                                            setPatientIdError('');
                                            setPatientIdSuccess('');
                                            setResolvedPatient(null);
                                        }}
                                    />
                                </div>
                                <SecondaryButton
                                    label={searchingId ? 'Verifying…' : 'Verify Patient ID'}
                                    onClick={handleVerifyPatientId}
                                    disabled={searchingId || !patientIdInput}
                                />
                                {patientIdError && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEF2F2', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.alertRed}` }}>
                                        <span style={{ fontSize: '13px', color: colors.alertRed, fontWeight: '500' }}>{patientIdError}</span>
                                    </div>
                                )}
                                {patientIdSuccess && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.successGreen, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.primaryGreen}` }}>
                                        <CheckCircle2 size={16} color={colors.primaryGreen} />
                                        <span style={{ fontSize: '13px', color: colors.primaryGreen, fontWeight: '600' }}>{patientIdSuccess}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '24px', paddingBottom: '16px' }}>
                            <PrimaryButton
                                label={loading ? 'Creating Account…' : 'Sign Up'}
                                isLoading={loading}
                                onClick={handleRegister}
                                disabled={loading}
                            />
                            <SecondaryButton
                                label="Already have an account? Login"
                                onClick={() => navigate('/auth/login', { state: { role: rolePassed } })}
                                disabled={loading}
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
