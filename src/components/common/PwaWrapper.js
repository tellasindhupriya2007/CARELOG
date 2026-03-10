import React, { useState, useEffect } from 'react';
import Toast, { showToast } from './Toast';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function PwaWrapper({ children }) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);

    useEffect(() => {
        // Offline Listeners
        const handleOffline = () => {
            setIsOffline(true);
        };
        const handleOnline = () => {
            setIsOffline(false);
            showToast("Back online. Syncing your data.", "success");
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // PWA Install Prompt Listener
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        // Scroll Input into View on Focus mitigating Keyboard cover
        const handleFocus = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('focusin', handleFocus);

        // Install Banner logic (show after 30 seconds)
        const checkInstall = setTimeout(() => {
            const dismissed = localStorage.getItem('carelog-install-dismissed');
            if (!dismissed && installPrompt) {
                setShowInstallBanner(true);
            }
        }, 30000);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('focusin', handleFocus);
            clearTimeout(checkInstall);
        };
    }, [installPrompt]);

    const dismissInstall = () => {
        // Dismiss for 7 days
        localStorage.setItem('carelog-install-dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
        setShowInstallBanner(false);
    };

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        setInstallPrompt(null);
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Global Toast Provider Layout */}
            <Toast />

            {/* Offline Persistent Banner below header */}
            {isOffline && (
                <div style={{
                    position: 'sticky',
                    top: spacing.topHeaderHeight,
                    width: '100%',
                    backgroundColor: colors.alertOrange,
                    color: colors.white,
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    zIndex: 90
                }}>
                    No internet connection. Showing last updated data.
                </div>
            )}

            {/* Child App Routes */}
            {children}

            {/* Install Prompt Banner Slider */}
            {showInstallBanner && (
                <div style={{
                    position: 'fixed',
                    bottom: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '100%',
                    maxWidth: '430px',
                    backgroundColor: colors.white,
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                    padding: '24px',
                    zIndex: 100,
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
                        Add CareLog to your home screen
                    </h3>
                    <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '20px', textAlign: 'center' }}>
                        Get quick access and offline support by adding the app to your home screen.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <PrimaryButton label="Install App" onClick={handleInstall} />
                        <SecondaryButton label="Dismiss" onClick={dismissInstall} />
                    </div>
                </div>
            )}
        </div>
    );
}
