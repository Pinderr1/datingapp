require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

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

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const app = express();
app.use(express.json());

// Contact form endpoint
app.post(
  '/contact',
  [
    body('name').trim().escape().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('message').trim().escape().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, message } = req.body;

    try {
      await db.collection('contactMessages').add({
        name,
        email,
        message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.json({ success: true });
    } catch (err) {
      logger.error('Failed to save contact message', { error: err });
      res.status(500).json({ error: 'Failed to save message' });
    }
  }
);

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

// Get all users
app.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app;
