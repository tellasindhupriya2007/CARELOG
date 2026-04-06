import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

export const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

const googleProvider = new GoogleAuthProvider();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [patientId, setPatientId] = useState(null);
    const [photoURL, setPhotoURL] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const startTime = Date.now();

        // ── 1. Safety Timeout ──────────────────────────────
        // If Firebase/Firestore fails to respond within 5s,
        // force clear the splash screen so the app remains usable.
        const safetyTimer = setTimeout(() => {
            console.warn("[Auth] Auth check timed out. Forcing loading false.");
            setLoading(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                setPhotoURL(firebaseUser.photoURL || null);
                try {
                    // Fetch profile from Firestore with a short "abandon" timer
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setRole(userData.role || null);
                        setPatientId(userData.patientId || userData.assignedPatientId || null);
                        if (userData.photoURL) setPhotoURL(userData.photoURL);
                    } else {
                        setRole(null);
                        setPatientId(null);
                    }
                } catch (error) {
                    console.error("[Auth] Error fetching user profile:", error);
                    setRole(null);
                    setPatientId(null);
                }
            } else {
                setUser(null);
                setRole(null);
                setPatientId(null);
                setPhotoURL(null);
            }

            const timeElapsed = Date.now() - startTime;
            clearTimeout(safetyTimer);
            
            if (timeElapsed < 1200) {
                setTimeout(() => setLoading(false), 1200 - timeElapsed);
            } else {
                setLoading(false);
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyTimer);
        };
    }, []);

    /**
     * Google Sign In.
     * @param {string} selectedRole - The role the user selected on splash (family/caretaker/doctor)
     * @returns {{ isNewUser: boolean, userRole: string, userPatientId: string|null }}
     */
    const signInWithGoogle = async (selectedRole) => {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        // Check if Firestore document already exists
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            // Returning user — read their existing data
            const userData = userDocSnap.data();
            setRole(userData.role);
            setPatientId(userData.patientId || userData.assignedPatientId || null);
            setPhotoURL(firebaseUser.photoURL || userData.photoURL || null);
            setUser(firebaseUser);
            return {
                isNewUser: false,
                userRole: userData.role,
                userPatientId: userData.patientId || userData.assignedPatientId || null
            };
        } else {
            // New user — create Firestore document with selected role
            const newUserData = {
                name: firebaseUser.displayName || 'CareLog User',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                role: selectedRole,
                patientId: null,
                createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, newUserData);
            setRole(selectedRole);
            setPatientId(null);
            setPhotoURL(firebaseUser.photoURL || null);
            setUser(firebaseUser);
            return {
                isNewUser: true,
                userRole: selectedRole,
                userPatientId: null
            };
        }
    };

    /**
     * Development Mode Login.
     * Bypasses Google/Firebase auth for rapid testing.
     * @param {string} devRole - family/caretaker/doctor
     */
    const devLogin = async (devRole) => {
        const mockUid = `dev-${devRole}`;
        const mockUser = {
            uid: mockUid,
            displayName: `Dev ${devRole.charAt(0).toUpperCase() + devRole.slice(1)}`,
            email: `${devRole}@dev.carelog`,
            photoURL: `https://ui-avatars.com/api/?name=Dev+${devRole}&background=random`
        };

        setUser(mockUser);
        setRole(devRole);
        // Try to fetch a real patient from the database for dev testing
        let mockPatientId = 'DEV-PATIENT-001';
        try {
            const q = query(collection(db, 'patients'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                mockPatientId = snap.docs[0].id;
                console.log("[AuthContext] DevLogin using real patient:", mockPatientId);
            }
        } catch (err) {
            console.error("[AuthContext] Failed to load real patient for dev mode", err);
        }

        setPatientId(mockPatientId);
        setPhotoURL(mockUser.photoURL);

        return {
            isNewUser: false,
            userRole: devRole,
            userPatientId: mockPatientId
        };
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setRole(null);
        setPatientId(null);
        setPhotoURL(null);
        // Clear any cached data
        try { sessionStorage.clear(); } catch (e) { }
    };

    const setRoleAndPatient = (newRole, newPatientId) => {
        setRole(newRole);
        setPatientId(newPatientId);
    };

    if (loading) {
        return (
            <div style={{
                backgroundColor: colors.white,
                height: '100vh',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column'
            }}>
                <div style={{
                    fontSize: '32px',
                    fontWeight: typography.pageTitle.fontWeight,
                    fontFamily: typography.fontFamily,
                    color: colors.primaryBlue,
                    marginBottom: '16px'
                }}>
                    CareLog
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="dot" style={{ animationDelay: '0s' }} />
                    <div className="dot" style={{ animationDelay: '0.2s' }} />
                    <div className="dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <style>{`
                    .dot {
                        width: 12px;
                        height: 12px;
                        background-color: ${colors.primaryBlue};
                        border-radius: 50%;
                        animation: bounce 1.4s infinite ease-in-out both;
                    }
                    @keyframes bounce {
                        0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
                        40% { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            user, role, patientId, photoURL,
            setPatientId, signInWithGoogle, logout, setRoleAndPatient, devLogin
        }}>
            {children}
        </AuthContext.Provider>
    );
};
