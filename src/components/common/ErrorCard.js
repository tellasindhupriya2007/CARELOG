import React from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorCard({ message = "Something went wrong. Please try again.", onRetry }) {
    return (
        <div style={{
            backgroundColor: colors.alertRed,
            color: colors.white,
            padding: spacing.cardPadding,
            borderRadius: spacing.borderRadius.card,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxShadow: spacing.shadows.card,
            marginBottom: spacing.gapBetweenSections
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={24} color={colors.white} />
                <span style={{ fontSize: typography.bodyText.fontSize, fontWeight: '600' }}>
                    {message}
                </span>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    style={{
                        background: 'none',
                        border: `1px solid ${colors.white}`,
                        borderRadius: spacing.borderRadius.button,
                        color: colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        gap: '6px'
                    }}
                >
                    <RefreshCw size={14} /> Retry
                </button>
            )}
        </div>
    );
}
