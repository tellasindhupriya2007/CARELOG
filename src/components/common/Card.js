import React from 'react';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function Card({ children, style, onClick, ...props }) {
    return (
        <div
            className={onClick ? 'card-hover' : ''}
            onClick={onClick}
            style={{
                backgroundColor: colors.cardBackground,
                borderRadius: spacing.borderRadius.card,
                padding: spacing.cardPadding,
                boxShadow: spacing.shadows.card,
                border: 'none',
                width: '100%',
                cursor: onClick ? 'pointer' : 'default',
                transition: onClick ? 'transform 0.1s ease, box-shadow 0.2s ease' : 'none',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                ...style
            }}
            onPointerDown={(e) => {
                if (onClick) e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onPointerUp={(e) => {
                if (onClick) e.currentTarget.style.transform = 'scale(1)';
            }}
            onPointerLeave={(e) => {
                if (onClick) e.currentTarget.style.transform = 'scale(1)';
            }}
            {...props}
        >
            {children}
        </div>
    );
}
