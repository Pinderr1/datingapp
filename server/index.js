const express = require('express');
const admin = require('firebase-admin');

// Load service account from environment variable
let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccount) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
}
try {
  serviceAccount = JSON.parse(serviceAccount);
} catch (err) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT must be valid JSON');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

const app = express();
app.use(express.json());

// Example auth endpoint: create custom token for a user
app.post('/auth/token', async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ error: 'uid is required' });
  }
  try {
    const token = await auth.createCustomToken(uid);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact form endpoint
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  try {
    await db.collection('contactMessages').add({
      name,
      email,
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save contact message', err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Example Firestore endpoint: get user document
app.get('/users/:id', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
