
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMessages() {
    console.log("Checking recent messages...");
    const snap = await db.collection('messages').orderBy('timestamp', 'desc').limit(10).get();
    
    if (snap.empty) {
        console.log("No messages found.");
        return;
    }

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`[${doc.id}] From: ${data.senderName} (${data.senderId}) To: ${data.receiverId} Patient: ${data.patientId} Msg: ${data.message}`);
    });
}

checkMessages();
