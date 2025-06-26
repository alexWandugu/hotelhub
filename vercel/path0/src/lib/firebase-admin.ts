import * as admin from 'firebase-admin';

// Ensure the service account JSON is parsed correctly.
// The environment variable is a base64 encoded string.
const serviceAccountString = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT || '',
  'base64'
).toString('utf8');

const serviceAccount = serviceAccountString ? JSON.parse(serviceAccountString) : {};

// Initialize Firebase Admin SDK if not already initialized.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Optional: Add your databaseURL if you have one.
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (error: any) {
    console.error('Firebase Admin Initialization Error', error.stack);
  }
}

// Export the initialized admin services.
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
