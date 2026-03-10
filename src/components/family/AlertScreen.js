import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { AlertTriangle, Phone } from 'lucide-react';
import DangerButton from '../common/DangerButton';
import SecondaryButton from '../common/SecondaryButton';
import Card from '../common/Card';

export default function AlertScreen() {
    const location = useLocation();
    const navigate = useNavigate();

    // Requires alert data passed via routing state
    if (!location.state || !location.state.alert) {
        return <Navigate to="/family/dashboard" replace />;
    }

    const { alert } = location.state;

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Top 40% Banner directly styled */}
            <div style={{
                height: '40vh',
                backgroundColor: colors.alertRed,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomLeftRadius: '32px',
                borderBottomRightRadius: '32px',
                boxShadow: spacing.shadows.card,
                color: colors.white,
                padding: spacing.pagePadding,
                position: 'relative'
            }}>
                {/* Simple back button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: colors.white, cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                    &larr; Back
                </button>

                <AlertTriangle size={80} color={colors.white} style={{ marginBottom: '16px', animation: 'pulse 1.5s infinite' }} />
                <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Urgent Alert</h1>
            </div>

            <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', marginTop: '-40px', zIndex: 10 }}>

                {/* Details Card */}
                <Card style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>
                            {alert.parameter || alert.title || "Critical Observation"}
                        </span>
                        {alert.recordedValue && (
                            <span style={{ fontSize: '20px', fontWeight: '700', color: colors.alertRed }}>
                                {alert.recordedValue}
                            </span>
                        )}
                        <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                            Today at {new Date(alert.triggeredAt?.toDate() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • by Caretaker
                        </span>
                        <span style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
                            This is outside the safe range or manually flagged.
                        </span>
                    </div>
                </Card>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                    <DangerButton
                        label={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={20} /> Call Caretaker
                            </div>
                        }
                        onClick={() => window.location.href = `tel:9999999999`} // Placeholder tele prompt 
                    />

                    <SecondaryButton
                        label={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={20} /> Call Doctor
                            </div>
                        }
                        onClick={() => window.location.href = `tel:9999999999`}
                    />

                    <button
                        onClick={() => navigate('/family/report')}
                        style={{
                            background: 'none', border: 'none', color: colors.primaryBlue,
                            fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px'
                        }}
                    >
                        View Full Patient Log
                    </button>
                </div>

                {/* Footer info */}
                <div style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                        This alert has also been sent to the doctor
                    </span>
                </div>

            </div>

            <style>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
        </div>
    );
}
