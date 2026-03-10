import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const showToast = (message, type = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

export default function Toast() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleShow = (e) => {
            const { message, type } = e.detail;
            const newToast = { id: Date.now(), message, type };

            setToasts(prev => {
                const updated = [...prev, newToast];
                // Keep max 3
                return updated.slice(-3);
            });

            // Auto dismiss after 4 seconds
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, 4000);
        };

        window.addEventListener('show-toast', handleShow);
        return () => window.removeEventListener('show-toast', handleShow);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getColors = (type) => {
        switch (type) {
            case 'success': return { bg: '#22c55e', text: '#ffffff' };
            case 'error': return { bg: '#ef4444', text: '#ffffff' };
            case 'warning': return { bg: '#f97316', text: '#ffffff' };
            case 'info':
            default: return { bg: '#3b82f6', text: '#ffffff' };
        }
    };

    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 9999,
            width: 'calc(100% - 32px)',
            maxWidth: '430px'
        }}>
            {toasts.map(toast => {
                const colors = getColors(toast.type);
                return (
                    <div key={toast.id} style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        <span>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', display: 'flex' }}>
                            <X size={18} />
                        </button>
                    </div>
                );
            })}
            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
