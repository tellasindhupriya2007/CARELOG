import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import * as LucideIcons from 'lucide-react';

export default function BottomNav({ navItems }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div style={{
            height: spacing.bottomNavHeight,
            width: '100%',
            backgroundColor: colors.white,
            borderTop: `1px solid ${colors.border}`,
            borderBottomLeftRadius: spacing.borderRadius.bottomNav,
            borderBottomRightRadius: spacing.borderRadius.bottomNav,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
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
                            height: '100%',
                            minWidth: '44px',
                            flex: 1
                        }}
                    >
                        {Icon && <Icon size={24} color={color} style={{ marginBottom: '4px' }} />}
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
                                    bottom: '-6px',
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
