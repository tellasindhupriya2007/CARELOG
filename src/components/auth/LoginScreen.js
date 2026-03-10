import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopHeader from '../common/TopHeader';
import InputField from '../common/InputField';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import ErrorCard from '../common/ErrorCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function LoginScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, setRoleAndPatient } = useAuthContext();

    // From SplashScreen user might click a role to prefill. Safe fallback too.
    const requestedRole = location.state?.role || null;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!email || !password) {
            setError("Please fill out all fields.");
            setLoading(false);
            return;
        }

        try {
            const fbUser = await login(email, password);

            // Read role
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();

                // Ensure their account matches what they clicked on Splash
                // Or if they didn't, just redirect by their assigned role
                const userRole = userData.role;
                setRoleAndPatient(userRole, userData.patientId || null);

                // Auto-redirect
                if (userRole === 'family') {
                    navigate('/family/dashboard', { replace: true });
                } else if (userRole === 'caretaker') {
                    navigate('/caretaker/dashboard', { replace: true });
                } else if (userRole === 'doctor') {
                    navigate('/doctor/dashboard', { replace: true });
                } else {
                    navigate('/auth/splash', { replace: true });
                }
            } else {
                setError("Account architecture missing roles.");
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError("Invalid email or password.");
            } else {
                setError("Failed to login. Please try again.");
            }
        }
        setLoading(false);
    };

    return (
        <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
            <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <TopHeader title="Welcome Back" showBack onBack={() => navigate(-1)} />

                <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ color: colors.textSecondary, marginBottom: '32px' }}>
                        {requestedRole ? `Log in to your ${requestedRole} account.` : 'Log in to continue.'}
                    </p>

                    {error && <ErrorCard message={error} style={{ marginBottom: '16px' }} />}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                        <InputField
                            label="Email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <PrimaryButton label="Login" isLoading={loading} onClick={handleLogin} />
                            <SecondaryButton label="Don't have an account? Register" onClick={() => navigate('/auth/register', { state: { role: requestedRole } })} />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
