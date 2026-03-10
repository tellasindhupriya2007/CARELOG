import React from 'react';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function SkeletonCard({ style }) {
    return (
        <div style={{
            backgroundColor: colors.cardBackground,
            borderRadius: spacing.borderRadius.card,
            padding: spacing.cardPadding,
            width: '100%',
            height: '100px', // Default min height
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${colors.border}`,
            ...style
        }}>
            <div className="skeleton-shimmer" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite linear',
                opacity: 0.6
            }} />
            <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
        </div>
    );
}
