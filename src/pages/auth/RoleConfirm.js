import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

const roleConfig = {
    family: { label: 'Family Member', bg: '#EFF6FF', color: '#2D6BE4' },
    caretaker: { label: 'Caretaker', bg: '#F0FDF4', color: '#16A34A' },
    doctor: { label: 'Doctor', bg: '#FFF7ED', color: '#EA580C' },
};

export default function RoleConfirmScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signInWithGoogle } = useAuthContext();

    const selectedRole = location.state?.role || 'family';
    const config = roleConfig[selectedRole] || roleConfig.family;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const { isNewUser, userRole, userPatientId } = await signInWithGoogle(selectedRole);

            if (!isNewUser) {
                // Returning user — route by their existing role
                if (userRole === 'family') navigate('/family/dashboard', { replace: true });
                else if (userRole === 'caretaker') navigate('/caretaker/dashboard', { replace: true });
                else if (userRole === 'doctor') navigate('/doctor/dashboard', { replace: true });
                else navigate('/auth/splash', { replace: true });
            } else {
                // New user — route by selected role
                if (selectedRole === 'family') navigate('/family/onboarding/step-1', { replace: true });
                else if (selectedRole === 'caretaker') navigate('/caretaker/dashboard', { replace: true });
                else if (selectedRole === 'doctor') navigate('/doctor/dashboard', { replace: true });
                else navigate('/auth/splash', { replace: true });
            }
        } catch (err) {
            console.error('Google Sign In Error:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign in was cancelled. Please try again.');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Pop-up blocked by browser. Please allow pop-ups for this site.');
            } else {
                setError('Sign in failed. Please try again.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
            <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', padding: spacing.pagePadding, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>

                    {/* Logo */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.primaryBlue, marginBottom: '6px' }}>CareLog</h1>
                        <p style={{ fontSize: '14px', color: colors.textSecondary }}>Caring made simple</p>
                    </div>

                    {/* Role Badge */}
                    <div style={{
                        backgroundColor: config.bg,
                        color: config.color,
                        padding: '8px 20px',
                        borderRadius: '24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config.color, display: 'inline-block' }} />
                        {config.label}
                    </div>

                    {/* Google Sign In Button */}
                    <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={{
                                width: '100%',
                                height: '52px',
                                backgroundColor: colors.white,
                                border: '1px solid #E5E7EB',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '20px', height: '20px', border: '2.5px solid #E5E7EB',
                                        borderTop: `2.5px solid ${colors.primaryBlue}`, borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A2E' }}>Signing in…</span>
                                </div>
                            ) : (
                                <>
                                    {/* Google "G" logo inline SVG */}
                                    <svg width="20" height="20" viewBox="0 0 48 48">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                        <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.9 23.9 0 000 24c0 3.77.9 7.34 2.44 10.53l8.09-5.94z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                        <path fill="none" d="M0 0h48v48H0z" />
                                    </svg>
                                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1A1A2E' }}>Continue with Google</span>
                                </>
                            )}
                        </button>

                        {error && (
                            <div style={{
                                backgroundColor: '#FEF2F2', padding: '12px 16px', borderRadius: '10px',
                                border: `1px solid ${colors.alertRed}`, textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '13px', color: colors.alertRed, fontWeight: '500' }}>{error}</span>
                            </div>
                        )}

                        <p style={{ fontSize: '12px', color: colors.textSecondary, textAlign: 'center', lineHeight: '1.5' }}>
                            We will never post anything without your permission.
                        </p>
                    </div>

                    {/* Back link */}
                    <button
                        onClick={() => navigate('/auth/splash')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: colors.textSecondary, fontWeight: '500' }}
                    >
                        ← Choose a different role
                    </button>
                </div>

                <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
            </div>
        </div>
    );
}
