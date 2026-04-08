import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { Home, User, Stethoscope, ArrowRight, Activity } from 'lucide-react';
import logo from '../../assets/logo.png';

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
        background: 'linear-gradient(to bottom right, #f8fafc, #eef2ff)',
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

      <div className="glass-card" style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '24px',
          padding: '48px 40px',
          width: '90%',
          maxWidth: '460px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.01)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
      }}>
          
        {/* Professional Logo */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
            <img 
                src={logo} 
                alt="CareLog Logo" 
                style={{ 
                    width: '140px', 
                    height: 'auto', 
                    objectFit: 'contain',
                    display: 'block',
                    mixBlendMode: 'multiply'
                }} 
            />
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '8px' }}>CareLog</h1>
        <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '40px', textAlign: 'center', fontWeight: '400', lineHeight: '1.6' }}>
            Unified healthcare ecosystem for families.<br/>Select your role to begin.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {roles.map((r) => (
                <button
                    key={r.id}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate('/auth/confirm', { state: { role: r.id } })}
                    style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: hovered === r.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                        border: `1px solid ${hovered === r.id ? '#E2E8F0' : 'rgba(0, 0, 0, 0.04)'}`,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: hovered === r.id ? '0 12px 24px rgba(0,0,0,0.04)' : 'none',
                        transform: hovered === r.id ? 'translateX(0) translateY(-1px)' : 'none'
                    }}
                >
                    <div style={{
                        width: '44px', height: '44px', backgroundColor: r.bg, color: r.color,
                        borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        transition: 'transform 0.2s', transform: hovered === r.id ? 'scale(1.05)' : 'scale(1)'
                    }}>
                        <r.icon size={20} strokeWidth={2} />
                    </div>
                    
                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>{r.title}</span>
                        <span style={{ fontSize: '13px', color: '#94A3B8' }}>{r.desc}</span>
                    </div>

                    <ArrowRight 
                        size={18} 
                        color={hovered === r.id ? r.color : '#CBD5E1'} 
                        style={{ 
                            transform: hovered === r.id ? 'translateX(4px)' : 'translateX(0)',
                            transition: 'all 0.2s',
                            opacity: hovered === r.id ? 1 : 0.5
                        }} 
                    />
                </button>
            ))}
        </div>

      </div>

      <style>{`
        .orb { position: absolute; border-radius: 50%; filter: blur(100px); z-index: 1; opacity: 0.5; }
        .orb-1 { width: 400px; height: 400px; background: rgba(59, 130, 246, 0.2); top: -10%; left: -5%; }
        .orb-2 { width: 500px; height: 500px; background: rgba(99, 102, 241, 0.1); bottom: -10%; right: -5%; }
        
        .logo-glow {
            position: absolute; width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(59,130,246,0.2), transparent);
            filter: blur(25px); opacity: 0.6; border-radius: 50%;
            animation: pulse-glow 3s infinite alternate;
        }

        .pulse-icon { animation: heartbeat 2s infinite ease-in-out; }

        @keyframes pulse-glow { 0% { opacity: 0.4; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.2); } }
        @keyframes heartbeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

        @media (max-width: 480px) {
            .glass-card {
                padding: 40px 24px !important;
                width: 100% !important;
                border-radius: 28px 28px 0 0 !important;
                position: fixed;
                bottom: 0;
                transform: translateY(0);
            }
        }
      `}</style>
    </div>
  );
}
