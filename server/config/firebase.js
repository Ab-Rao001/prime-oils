import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;
let auth = null;

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    auth = getAuth();
    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized with serviceAccountKey.json ✓');
  } catch (error) {
    logger.warn('Firebase Admin SDK could not be initialized on startup. Backend will skip Firebase sync: ' + error.message);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Railway Deployment Support: Parse the JSON string from the environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
    auth = getAuth();
    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized with FIREBASE_SERVICE_ACCOUNT env var ✓');
  } catch (error) {
    logger.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Backend will skip Firebase sync: ' + error.message);
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    initializeApp();
    auth = getAuth();
    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS ✓');
  } catch (error) {
    logger.warn('Firebase Admin SDK could not be initialized on startup. Backend will skip Firebase sync: ' + error.message);
  }
} else {
  logger.info('No Firebase credentials found in environment. Backend will skip Firebase user sync.');
}

export { auth, isFirebaseInitialized };
