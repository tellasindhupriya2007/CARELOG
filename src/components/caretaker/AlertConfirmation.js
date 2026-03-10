import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PrimaryButton from '../../components/common/PrimaryButton';
import Card from '../../components/common/Card';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function AlertConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();

    // If user navigates directly without state, boot them
    if (!location.state) return <Navigate to="/caretaker/dashboard" replace />;

    const { isAbnormal, abnormalDetails } = location.state;

    return (
        <div style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Top Half Banner */}
            <div style={{
                backgroundColor: isAbnormal ? colors.alertRed : colors.primaryGreen,
                flex: 0.6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomLeftRadius: '32px',
                borderBottomRightRadius: '32px',
                boxShadow: spacing.shadows.card,
                color: colors.white,
                padding: spacing.pagePadding,
                textAlign: 'center',
                animation: 'slideDown 0.4s ease-out'
            }}>
                {isAbnormal ? (
                    <AlertTriangle size={80} color={colors.white} style={{ marginBottom: '24px', animation: 'pulse 1.5s infinite' }} />
                ) : (
                    <CheckCircle size={80} color={colors.white} style={{ marginBottom: '24px', animation: 'scaleUp 0.5s ease-out' }} />
                )}

                <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                    {isAbnormal ? "Alert Sent" : "Vitals Recorded"}
                </h1>
                <p style={{ fontSize: '14px', maxWidth: '250px' }}>
                    {isAbnormal ? "Family and doctor have been notified immediately." : "All readings are securely within normal range."}
                </p>
            </div>

            {/* Bottom Half Details & Button */}
            <div style={{ flex: 0.4, padding: spacing.pagePadding, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                {isAbnormal && abnormalDetails?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        <span style={{ fontSize: typography.sectionHeading.fontSize, fontWeight: typography.sectionHeading.fontWeight, color: colors.textPrimary }}>Abnormal Readings</span>
                        {abnormalDetails.map((detail, index) => (
                            <Card key={index} style={{ borderLeft: `4px solid ${colors.alertRed}`, padding: '12px 16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary }}>{detail.param}</span>
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: colors.alertRed }}>{detail.val}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
                    <PrimaryButton label="Back to Checklist" onClick={() => navigate('/caretaker/dashboard')} />
                </div>
            </div>

            <style>{`
        @keyframes slideDown { from { transform: translateY(-30%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scaleUp { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>
        </div>
    );
}
