import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import * as LucideIcons from 'lucide-react';
import { LogOut, X } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function Sidebar({ navItems, onClose, isOpen }) {
    const navigate = useNavigate();
    const { logout } = useAuthContext();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/auth/splash', { replace: true });
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Mobile Close Button (HIDDEN ON DESKTOP) */}
            <div className="mobile-only" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
                <button 
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: colors.textSecondary }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Logo Section (Increased Padding for gutter) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '32px', paddingTop: '32px', whiteSpace: 'nowrap' }}>
                <img 
                    src={logo} 
                    alt="CareLog Logo" 
                    style={{ 
                        width: '32px', 
                        height: 'auto', 
                        objectFit: 'contain',
                        mixBlendMode: 'multiply'
                    }} 
                />
                <span style={{ fontSize: '18px', fontWeight: '900', color: colors.primaryBlue, letterSpacing: '-0.5px' }}>CareLog</span>
            </div>

            {/* Nav Items (Increased Padding to move away from left edge) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
                {navItems.map((item, index) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = LucideIcons[item.icon];
                    const bg = isActive ? '#EFF6FF' : 'transparent';
                    const color = isActive ? colors.primaryBlue : colors.textSecondary;

                    return (
                        <div
                            key={index}
                            onClick={() => navigate(item.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                backgroundColor: bg,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                minHeight: '44px',
                            }}
                        >
                            {Icon && <Icon size={18} color={color} />}
                            <span style={{
                                fontSize: '14px',
                                color: color,
                                fontWeight: isActive ? '700' : '600'
                            }}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Logout Button */}
            <div style={{ marginTop: 'auto', borderTop: `1px solid #E2E8F0`, padding: '16px 12px' }}>
                <div
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        color: colors.alertRed,
                    }}
                >
                    <LogOut size={18} color={colors.alertRed} />
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>Log Out</span>
                </div>
            </div>
        </div>
    );
}
