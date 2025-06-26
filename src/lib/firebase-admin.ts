'use server';

import * as admin from 'firebase-admin';

// This function ensures the Firebase Admin SDK is initialized only once.
function initializeAdminApp() {
  // If the app is already initialized, return the existing instance.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // The service account key must be provided as a base64 encoded string
  // in the FIREBASE_SERVICE_ACCOUNT environment variable.
  const serviceAccountString = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT || '',
    'base64'
  ).toString('utf8');

  // Throw a clear error if the service account is missing.
  if (!serviceAccountString) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for all server-side Firebase operations.'
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    // Initialize the app with the service account credentials.
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e: any) {
    // Throw a clear error if the service account JSON is invalid.
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${e.message}`);
  }
}

// Initialize the app and export the services.
const app = initializeAdminApp();
export const auth = admin.auth(app);
export const db = admin.firestore(app);
export const storage = admin.storage(app);