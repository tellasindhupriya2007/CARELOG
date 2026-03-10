import React from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { ArrowLeft } from 'lucide-react';

export default function TopHeader({ title, showBack, onBack, rightIcon }) {
    return (
        <div style={{
            height: spacing.topHeaderHeight,
            width: '100%',
            backgroundColor: colors.white,
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            <div style={{ width: '44px', display: 'flex', alignItems: 'center' }}>
                {showBack && (
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            height: '44px',
                            width: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start'
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
                flex: 1
            }}>
                {title}
            </div>

            <div style={{ width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {rightIcon}
            </div>
        </div>
    );
}
