import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import PrimaryButton from '../../components/common/PrimaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { CheckCircle, AlertTriangle, ArrowLeft, Activity, Info } from 'lucide-react';

export default function AlertConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();

    // If user navigates directly without state, boot them
    if (!location.state) return <Navigate to="/caretaker/dashboard" replace />;

    const { isAbnormal, abnormalDetails } = location.state;

    return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* Top Header / Banner */}
            <div style={{
                background: isAbnormal 
                    ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' 
                    : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                flex: 0.55,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomLeftRadius: '40px',
                borderBottomRightRadius: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                color: colors.white,
                padding: '40px 24px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background elements */}
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />

                <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', padding: '24px', borderRadius: '24px',
                    marginBottom: '24px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)', animation: 'scaleUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    {isAbnormal ? (
                        <AlertTriangle size={64} color={colors.white} style={{ animation: 'pulse 1.5s infinite' }} />
                    ) : (
                        <CheckCircle size={64} color={colors.white} />
                    )}
                </div>

                <h1 style={{ 
                    fontSize: '32px', fontWeight: '900', marginBottom: '12px', 
                    letterSpacing: '-0.5px', color: '#FFFFFF' 
                }}>
                    {isAbnormal ? "Emergency Alert Sent" : "Vitals Recorded"}
                </h1>
                <p style={{ 
                    fontSize: '16px', fontWeight: '500', maxWidth: '280px', 
                    lineHeight: 1.5, opacity: 0.95, color: '#FFFFFF' 
                }}>
                    {isAbnormal 
                        ? "Medical family and the attending doctor were notified instantly. Help is on the way." 
                        : "Everything is verified. All readings are stable and within perfect health range."}
                </p>
                
                {isAbnormal && (
                    <div style={{ 
                        marginTop: '20px', padding: '6px 16px', borderRadius: '20px', 
                        backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '11px', fontWeight: '800', 
                        textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Info size={12} /> High Priority Action
                    </div>
                )}
            </div>

            {/* Bottom Content Section */}
            <div style={{ 
                flex: 0.45, padding: '32px 24px', display: 'flex', flexDirection: 'column', 
                gap: '24px', position: 'relative', marginTop: '-20px'
            }}>
                
                {isAbnormal && abnormalDetails?.length > 0 && (
                    <div style={{ 
                        backgroundColor: colors.white, borderRadius: '24px', padding: '24px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1.5px solid #F1F5F9'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <Activity size={18} color="#EF4444" />
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B' }}>Abnormal Observations</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {abnormalDetails.map((detail, index) => (
                                <div key={index} style={{ 
                                    padding: '16px', borderRadius: '16px', backgroundColor: '#FEF2F2', 
                                    border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                                }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#991B1B', display: 'block' }}>{detail.param}</span>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#B91C1C', opacity: 0.7 }}>Triggered Critical Alert</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: '#DC2626' }}>{detail.val}</span>
                                        <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: '700' }}>ABOVE RANGE</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ 
                    marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                    <button 
                        onClick={() => navigate('/caretaker/dashboard')}
                        style={{
                            width: '100%', padding: '18px', borderRadius: '16px', border: 'none',
                            backgroundColor: colors.primaryBlue, color: 'white',
                            fontSize: '16px', fontWeight: '800', cursor: 'pointer',
                            boxShadow: '0 10px 20px rgba(37,99,235,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={18} /> Back to Dashboard
                    </button>
                    {!isAbnormal && <p style={{ fontSize: '12px', color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>Your shift summary has been updated.</p>}
                </div>
            </div>

            <style>{`
                @keyframes scaleUp { 
                    0% { transform: scale(0.6); opacity: 0; } 
                    80% { transform: scale(1.05); } 
                    100% { transform: scale(1); opacity: 1; } 
                }
                @keyframes pulse { 
                    0% { transform: scale(1); text-shadow: 0 0 10px rgba(255,255,255,0); } 
                    50% { transform: scale(1.05); text-shadow: 0 0 20px rgba(255,255,255,0.4); } 
                    100% { transform: scale(1); text-shadow: 0 0 10px rgba(255,255,255,0); } 
                }
            `}</style>
        </div>
    );
}

