import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenHeader from '../../components/common/ScreenHeader';
import InputField from '../common/InputField';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import ErrorCard from '../common/ErrorCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function LoginScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signInWithGoogle, devLogin, setRoleAndPatient } = useAuthContext();

    // From SplashScreen user might click a role to prefill. Safe fallback too.
    const requestedRole = location.state?.role || null;

    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { userRole, userPatientId } = await signInWithGoogle(requestedRole || 'family');
            redirectAfterLogin(userRole, userPatientId);
        } catch (err) {
            console.error(err);
            setError("Failed to login with Google.");
        }
        setLoading(false);
    };

    const handleDevLogin = async (devRole) => {
        try {
            setLoading(true);
            const { userRole, userPatientId } = await devLogin(devRole);
            redirectAfterLogin(userRole, userPatientId);
        } catch (err) {
            console.error(err);
            setError("Dev login failed.");
        }
        setLoading(false);
    };

    const redirectAfterLogin = (userRole, patientId) => {
        if (userRole === 'family') {
            navigate('/family/dashboard', { replace: true });
        } else if (userRole === 'caretaker') {
            navigate('/caretaker/dashboard', { replace: true });
        } else if (userRole === 'doctor') {
            navigate('/doctor/dashboard', { replace: true });
        } else {
            navigate('/auth/splash', { replace: true });
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError("Email/Password login is currently disabled. Please use Google or Dev Mode.");
    };

    return (
        <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
            <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <ScreenHeader title="Welcome Back" showBack onBack={() => navigate(-1)} />
                <div style={{ padding: '48px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                        <button 
                            onClick={() => { setLoginMethod('email'); setError(null); }}
                            style={{ 
                                flex: 1, padding: '12px', borderRadius: '12px', 
                                border: loginMethod === 'email' ? `2px solid ${colors.primaryBlue}` : '1px solid #E2E8F0',
                                backgroundColor: loginMethod === 'email' ? '#EFF6FF' : colors.white,
                                color: loginMethod === 'email' ? colors.primaryBlue : colors.textSecondary,
                                fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            Email
                        </button>
                        <button 
                            onClick={() => { setLoginMethod('phone'); setError(null); }}
                            style={{ 
                                flex: 1, padding: '12px', borderRadius: '12px', 
                                border: loginMethod === 'phone' ? `2px solid ${colors.primaryBlue}` : '1px solid #E2E8F0',
                                backgroundColor: loginMethod === 'phone' ? '#EFF6FF' : colors.white,
                                color: loginMethod === 'phone' ? colors.primaryBlue : colors.textSecondary,
                                fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            Phone
                        </button>
                    </div>

                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: colors.textPrimary, marginBottom: '8px' }}>
                        {loginMethod === 'email' ? 'Welcome Back' : 'Secure Login'}
                    </h2>
                    <p style={{ color: colors.textSecondary, marginBottom: '32px', fontSize: '15px' }}>
                        {loginMethod === 'email' ? 'Enter credentials to access your dashboard' : 'Access via OTP verification'}
                    </p>

                    {error && <ErrorCard message={error} style={{ marginBottom: '16px' }} />}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        {loginMethod === 'email' ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            </div>
                        ) : (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <InputField
                                    label="Phone Number"
                                    type="tel"
                                    placeholder="e.g. +91 99999 00000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                {otpSent && (
                                    <InputField
                                        label="4-Digit OTP"
                                        type="number"
                                        placeholder="0000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '16px' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '60%', minWidth: '280px', height: '52px',
                                    backgroundColor: colors.primaryBlue, color: colors.white,
                                    borderRadius: '16px', border: 'none', fontWeight: '700',
                                    fontSize: '16px', cursor: 'pointer', transition: 'filter 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {loading ? 'Processing...' : (loginMethod === 'email' ? 'LOGIN' : (otpSent ? 'VERIFY OTP' : 'SEND OTP'))}
                            </button>
                            
                            <div style={{ position: 'relative', textAlign: 'center', margin: '24px 0', width: '100%' }}>
                                <div style={{ position: 'absolute', top: '50%', left: '20%', right: '20%', height: '1px', backgroundColor: '#E2E8F0' }} />
                                <span style={{ position: 'relative', backgroundColor: colors.white, padding: '0 12px', fontSize: '13px', color: colors.textSecondary }}>OR</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                style={{
                                    width: '60%', minWidth: '280px', height: '52px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    padding: '12px', borderRadius: '16px', border: '1px solid #E2E8F0',
                                    backgroundColor: colors.white, cursor: 'pointer', fontWeight: '700', fontSize: '16px'
                                }}
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" width="20" />
                                Google Session
                            </button>

                            <div style={{ marginTop: '24px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <p style={{ fontSize: '12px', fontWeight: '800', color: colors.textSecondary, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔧 Developer Sandbox</p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button type="button" onClick={() => handleDevLogin('caretaker')} style={newDevBtnStyle}>CAREGIVER</button>
                                    <button type="button" onClick={() => handleDevLogin('family')} style={newDevBtnStyle}>FAMILY</button>
                                    <button type="button" onClick={() => handleDevLogin('doctor')} style={newDevBtnStyle}>DOCTOR</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const newDevBtnStyle = {
    padding: '8px 16px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    fontSize: '11px',
    fontWeight: '800',
    color: '#1E293B',
    cursor: 'pointer'
};
