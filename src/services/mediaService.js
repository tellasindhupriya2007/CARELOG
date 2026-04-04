import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { storage, db } from "../firebase/config";

/**
 * MEDIA & IMAGE UPLOAD SERVICE
 */

export const uploadPatientMedia = async (patientId, file, description, caretakerUid) => {
    if (!file) return null;

    // 1. Upload to Firebase Storage
    const storageRef = ref(storage, `patients/${patientId}/media/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // 2. Save metadata to Firestore
    const mediaRef = collection(db, 'patients', patientId, 'media');
    const mediaDoc = await addDoc(mediaRef, {
        url: downloadURL,
        description,
        uploadedBy: caretakerUid,
        createdAt: serverTimestamp(),
        type: file.type.startsWith('image') ? 'image' : 'file'
    });

    return { id: mediaDoc.id, url: downloadURL };
};

export const subscribeToPatientMedia = (patientId, callback) => {
    const mediaRef = collection(db, 'patients', patientId, 'media');
    const q = query(mediaRef); // no orderBy — avoids index requirement
    
    return onSnapshot(q, (snapshot) => {
        const mediaList = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }))
            .sort((a, b) => b.createdAt - a.createdAt); // desc client-side
        callback(mediaList);
    });
};
