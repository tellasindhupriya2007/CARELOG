import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import ScreenHeader from '../../components/common/ScreenHeader';
import Sidebar from '../../components/common/Sidebar';
import SkeletonCard from '../common/SkeletonCard';
import { Pill, UploadCloud, Loader2, ClipboardCheck, History } from 'lucide-react';

export default function CaretakerPrescriptions() {
    const navigate = useNavigate();
    const { patientId, user } = useAuthContext();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState(null);

    const sidebarItems = [
        { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
        { icon: 'Pill', label: 'Prescriptions', path: '/caretaker/prescriptions' },
        { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
        { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
        { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
        { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
        { icon: 'MessageSquare', label: 'Messages', path: '/caretaker/messages' },
    ];

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchMeds = async () => {
            if (!patientId) return;
            try {
                const q = query(collection(db, 'prescriptions'), where('patientId', '==', patientId), limit(10));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const sorted = snap.docs
                        .map(d => ({ id: d.id, ...d.data() }))
                        .sort((a, b) => {
                            const ta = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
                            const tb = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
                            return tb - ta;
                        });
                    setMedicines(sorted[0]?.medicines || []);
                } else {
                    const planSnap = await getDocs(query(collection(db, 'carePlans'), where('__name__', '==', patientId)));
                    if (!planSnap.empty) {
                        setMedicines(planSnap.docs[0].data().medicines || []);
                    }
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchMeds();
    }, [patientId]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !patientId) return;
        setUploading(true);
        try {
            const fileRef = ref(storage, `prescriptions/${patientId}_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const photoUrl = await getDownloadURL(fileRef);
            await addDoc(collection(db, 'prescriptions'), {
                patientId, photoUrl, uploadedAt: serverTimestamp(), uploadedBy: 'Caretaker', medicines
            });
            await updateDoc(doc(db, 'carePlans', patientId), {
                lastPrescriptionImg: photoUrl, updatedAt: serverTimestamp()
            });
            showToast("Sync success", "success");
        } catch (error) {
            showToast("Upload failed", "error");
        }
        setUploading(false);
    };

    return (
        <div className="desktop-layout">
            <Sidebar navItems={sidebarItems} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="desktop-content">
                {toast && (
                    <div style={{
                        position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)',
                        backgroundColor: toast.type === 'success' ? '#00288E' : '#FF4B4B',
                        color: 'white', padding: '10px 24px', borderRadius: '40px', fontWeight: '800',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, fontSize: '13px', animation: 'slideDown 0.3s ease'
                    }}>
                        {toast.message}
                    </div>
                )}

                <ScreenHeader 
                    title="Prescriptions" 
                    showBack onBack={() => navigate(-1)} 
                    onMenu={() => setSidebarOpen(true)} 
                    showMenuButton={true} 
                />

                <div className="main-content scroll-y" style={{ paddingBottom: '90px' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        
                        {/* 1. Digital Sync */}
                        <div className="card">
                            <h2><UploadCloud size={20} color="#00288E" /> Digital Sync</h2>
                            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px', fontWeight: '500' }}>Upload a photo of the new prescription to synchronize data with the clinical dashboard.</p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUpload}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                    disabled={uploading}
                                />
                                <button className="save-btn" disabled={uploading} style={{ gap: '12px' }}>
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                    <span>{uploading ? "SYNCING..." : "UPLOAD NEW PRESCRIPTION"}</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Active Medications */}
                        <div className="card">
                            <h2><ClipboardCheck size={20} color="#00288E" /> Active Meds</h2>

                            {loading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <SkeletonCard /><SkeletonCard />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {(medicines.length === 0 ? [
                                        { name: "Amlodipine", dosage: "5mg", frequency: "1x Daily", scheduledTimes: ["08:00 AM"] }, 
                                        { name: "Metformin", dosage: "500mg", frequency: "2x Daily", scheduledTimes: ["08:00 AM", "08:00 PM"] }
                                    ] : medicines).map((m, i) => (
                                        <div key={i} className="history-row" style={{ gap: '16px' }}>
                                            <div style={{ 
                                                width: '40px', height: '40px', borderRadius: '10px', 
                                                backgroundColor: '#EDF2FF', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                                            }}>
                                                <Pill size={20} color="#00288E" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A' }}>{m.name}</div>
                                                <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>{m.dosage} • {m.frequency}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#00288E', opacity: 0.5, letterSpacing: '0.05em', marginBottom: '2px' }}>SCHEDULED</div>
                                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{m.scheduledTimes?.[0] || 'As needed'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
