// import * as admin from 'firebase-admin';

// // Ensure the service account JSON is parsed correctly.
// // The environment variable is a base64 encoded string.
// const serviceAccountString = Buffer.from(
//   process.env.FIREBASE_SERVICE_ACCOUNT || '',
//   'base64'
// ).toString('utf8');

// const serviceAccount = serviceAccountString ? JSON.parse(serviceAccountString) : {};

// // Initialize Firebase Admin SDK if not already initialized.
// if (!admin.apps.length) {
//   try {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//       // Optional: Add your databaseURL if you have one.
//       // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
//     });
//   } catch (error: any) {
//     console.error('Firebase Admin Initialization Error', error.stack);
//   }
// }

// // Export the initialized admin services.
// export const auth = admin.auth();
// export const db = admin.firestore();
// export const storage = admin.storage();

// src/lib/firebase.admin.ts
import * as admin from 'firebase-admin';

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountString) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    return admin.initializeApp({
      credential: admin.credential.cert(parsed),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    throw new Error(
      `Error initializing Firebase Admin: ${error.message}`
    );
  }
}

const app = initializeAdminApp();
export const db = admin.firestore(app);
export const auth = admin.auth(app);
export const storage = admin.storage(app);
