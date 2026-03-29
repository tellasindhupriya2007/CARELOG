import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../../styles/colors';
import * as LucideIcons from 'lucide-react';

export default function Sidebar({ navItems }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="sidebar">
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: colors.primaryBlue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <span style={{ color: colors.white, fontWeight: 'bold', fontSize: '18px' }}>C</span>
                </div>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primaryBlue }}>CareLog</span>
            </div>

            {/* Nav Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: bg,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                minHeight: '44px',
                            }}
                        >
                            {Icon && <Icon size={20} color={color} />}
                            <span style={{
                                fontSize: '15px',
                                color: color,
                                fontWeight: isActive ? '600' : '500'
                            }}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
