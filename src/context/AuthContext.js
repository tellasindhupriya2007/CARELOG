import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

export const AuthContext = createContext();

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [patientId, setPatientId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const startTime = Date.now();

        // On every app load check Firebase Auth state first
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setRole(userData.role || null);
                        setPatientId(userData.patientId || null);
                    } else {
                        setRole(null);
                        setPatientId(null);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setRole(null);
                    setPatientId(null);
                }
            } else {
                setUser(null);
                setRole(null);
                setPatientId(null);
            }

            // Minimum show time of 1.5 seconds so it does not flash
            const timeElapsed = Date.now() - startTime;
            if (timeElapsed < 1500) {
                setTimeout(() => setLoading(false), 1500 - timeElapsed);
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    };

    const register = async (name, email, password, role) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Save user role and name to Firestore users collection
        await setDoc(doc(db, 'users', newUser.uid), {
            name,
            email,
            role,
            patientId: null, // to be populated later
            createdAt: new Date().toISOString()
        });

        return newUser;
    };

    const logout = async () => {
        await signOut(auth);
    };

    const setRoleAndPatient = (newRole, newPatientId) => {
        setRole(newRole);
        setPatientId(newPatientId);
    };

    if (loading) {
        // While auth state is loading show the CareLog logo with pulse animation on white background
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

                {/* 3 dots pulsing one after another */}
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
        <AuthContext.Provider value={{ user, role, patientId, setPatientId, login, register, logout, setRoleAndPatient }}>
            {children}
        </AuthContext.Provider>
    );
};
