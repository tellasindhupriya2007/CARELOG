import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { ArrowLeft, LogOut } from 'lucide-react';

const roleColors = {
    family: { bg: '#EFF6FF', color: '#2D6BE4' },
    caretaker: { bg: '#F0FDF4', color: '#16A34A' },
    doctor: { bg: '#FFF7ED', color: '#EA580C' },
};

export default function TopHeader({ title, showBack, onBack, rightIcon }) {
    const { user, role, photoURL, logout } = useAuthContext();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleLogout = async () => {
        setShowMenu(false);
        await logout();
        navigate('/auth/splash', { replace: true });
    };

    const rc = roleColors[role] || roleColors.family;

    const ProfileAvatar = user ? (
        <div
            onClick={() => setShowMenu(!showMenu)}
            style={{ position: 'relative', cursor: 'pointer', zIndex: 20 }}
            ref={menuRef}
        >
            {photoURL ? (
                <img
                    src={photoURL}
                    alt="Profile"
                    style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        objectFit: 'cover', border: `2px solid ${colors.border}`
                    }}
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: colors.primaryBlue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${colors.border}`
                }}>
                    <span style={{ color: colors.white, fontSize: '14px', fontWeight: '700' }}>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </span>
                </div>
            )}

            {showMenu && (
                <div style={{
                    position: 'absolute', top: '40px', right: '0',
                    backgroundColor: colors.white, borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)', padding: '16px',
                    width: '240px', zIndex: 9999, border: `1px solid ${colors.border}`,
                    animation: 'fadeInDown 0.2s ease-out'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: colors.textPrimary }}>
                            {user.displayName || 'CareLog User'}
                        </span>
                        <span style={{ fontSize: '12px', color: colors.textSecondary, wordBreak: 'break-all' }}>
                            {user.email || ''}
                        </span>
                        {role && (
                            <span style={{
                                backgroundColor: rc.bg, color: rc.color,
                                padding: '4px 12px', borderRadius: '20px',
                                fontSize: '12px', fontWeight: '600',
                                display: 'inline-block', width: 'fit-content'
                            }}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                        )}
                    </div>
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 0', width: '100%', minHeight: '44px'
                            }}
                        >
                            <LogOut size={16} color={colors.alertRed} />
                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.alertRed }}>Log Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    ) : rightIcon;

    return (
        <div className="top-header">
            <div style={{ width: '44px', display: 'flex', alignItems: 'center' }}>
                {showBack && (
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            height: '44px', width: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start'
                        }}
                    >
                        <ArrowLeft color={colors.textPrimary} size={24} />
                    </button>
                )}
            </div>

            <div style={{
                fontSize: typography.sectionHeading.fontSize,
                fontWeight: typography.sectionHeading.fontWeight,
                color: typography.sectionHeading.color,
                textAlign: 'center',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {title}
            </div>

            <div style={{ width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {ProfileAvatar}
            </div>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
