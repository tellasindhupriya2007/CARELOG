import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../../styles/colors';
import * as LucideIcons from 'lucide-react';

export default function BottomNav({ navItems }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="bottom-nav" style={{
            backgroundColor: colors.white,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '64px',
            borderTop: `1px solid ${colors.border}`,
            padding: '0 8px',
            boxSizing: 'border-box',
            width: '100%',
        }}>
            {navItems.map((item, index) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = LucideIcons[item.icon];
                const color = isActive ? colors.primaryBlue : colors.textSecondary;

                return (
                    <div
                        key={index}
                        onClick={() => navigate(item.path)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            minWidth: '44px',
                            minHeight: '44px',
                            flex: 1,
                            paddingTop: '8px',
                        }}
                    >
                        {Icon && <Icon size={22} color={color} style={{ marginBottom: '3px' }} />}
                        <span style={{
                            fontSize: '10px',
                            color: color,
                            fontWeight: isActive ? '600' : '400',
                            position: 'relative'
                        }}>
                            {item.label}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-5px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '4px',
                                    height: '4px',
                                    borderRadius: '50%',
                                    backgroundColor: colors.primaryBlue
                                }} />
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
