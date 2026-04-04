import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { Home, User, Stethoscope, ArrowRight, HeartPulse, Activity } from 'lucide-react';

export default function Splash() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuthContext();
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'caretaker') navigate('/caretaker/dashboard', { replace: true });
      if (role === 'family') navigate('/family/dashboard', { replace: true });
      if (role === 'doctor') navigate('/doctor/dashboard', { replace: true });
    }
  }, [user, role, loading, navigate]);

  const roles = [
    { id: 'caretaker', title: 'Caretaker', icon: User, desc: 'Manage daily shifts & vitals', color: '#10B981', bg: '#DCFCE7' },
    { id: 'family', title: 'Family Member', icon: Home, desc: 'Monitor loved ones & alerts', color: '#3B82F6', bg: '#DBEAFE' },
    { id: 'doctor', title: 'Medical Staff', icon: Stethoscope, desc: 'Review patient health trends', color: '#8B5CF6', bg: '#EDE9FE' },
  ];

  return (
    <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(140deg, #F0F9FF 0%, #E0E7FF 50%, #F3E8FF 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif"
    }}>
      {/* Decorative Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <div className="glass-card" style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          borderRadius: '32px',
          padding: '48px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.2) inset',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
      }}>
          
        {/* Animated Brand Logo */}
        <div style={{ position: 'relative', marginBottom: '32px' }}>
            <div className="logo-glow"></div>
            <div style={{
                width: '72px', height: '72px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                borderRadius: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)', position: 'relative', zIndex: 2
            }}>
                <HeartPulse size={36} color="#FFFFFF" strokeWidth={2.5} className="pulse-icon" />
            </div>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A', letterSpacing: '-1px', marginBottom: '12px' }}>CareLog</h1>
        <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '40px', textAlign: 'center', fontWeight: '500', lineHeight: '1.5' }}>
            Next-generation healthcare ecosystem.<br/>Choose your operational role to continue.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {roles.map((r) => (
                <button
                    key={r.id}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate('/auth/confirm', { state: { role: r.id } })}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: hovered === r.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                        border: `1px solid ${hovered === r.id ? r.color + '40' : 'rgba(255,255,255,0.6)'}`,
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: hovered === r.id ? `0 12px 24px ${r.color}15, 0 4px 8px rgba(0,0,0,0.02)` : 'none',
                        transform: hovered === r.id ? 'translateY(-2px)' : 'none'
                    }}
                >
                    <div style={{
                        width: '48px', height: '48px', backgroundColor: r.bg, color: r.color,
                        borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        transition: 'transform 0.3s', transform: hovered === r.id ? 'scale(1.1)' : 'scale(1)'
                    }}>
                        <r.icon size={22} strokeWidth={2.5} />
                    </div>
                    
                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B' }}>{r.title}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748B' }}>{r.desc}</span>
                    </div>

                    <ArrowRight 
                        size={20} 
                        color={hovered === r.id ? r.color : '#CBD5E1'} 
                        style={{ 
                            transform: hovered === r.id ? 'translateX(4px)' : 'translateX(0)',
                            transition: 'all 0.3s',
                            opacity: hovered === r.id ? 1 : 0.5
                        }} 
                    />
                </button>
            ))}
        </div>

      </div>

      <style>{`
        .orb { position: absolute; border-radius: 50%; filter: blur(80px); z-index: 1; animation: float 20s infinite ease-in-out alternate; }
        .orb-1 { width: 400px; height: 400px; background: rgba(56, 189, 248, 0.3); top: -10%; left: -10%; animation-delay: 0s; }
        .orb-2 { width: 500px; height: 500px; background: rgba(167, 139, 250, 0.25); bottom: -20%; right: -10%; animation-delay: -5s; }
        .orb-3 { width: 300px; height: 300px; background: rgba(16, 185, 129, 0.2); top: 40%; left: 60%; animation-delay: -10s; }
        
        .logo-glow {
            position: absolute; width: 100%; height: 100%;
            background: linear-gradient(135deg, #2563EB, #8B5CF6);
            filter: blur(20px); opacity: 0.5; border-radius: 20px;
            animation: pulse-glow 3s infinite alternate;
        }

        .pulse-icon { animation: heartbeat 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }

        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(50px, 50px) scale(1.1); } }
        @keyframes pulse-glow { 0% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.6; transform: scale(1.1); } }
        @keyframes heartbeat { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.1); } 20% { transform: scale(1); } 30% { transform: scale(1.1); } 40% { transform: scale(1); } }

        @media (max-width: 480px) {
            .glass-card {
                padding: 32px 24px !important;
                border-radius: 24px !important;
                border-bottom-left-radius: 0 !important;
                border-bottom-right-radius: 0 !important;
                min-height: 85vh;
                margin-top: auto;
            }
        }
      `}</style>
    </div>
  );
}
