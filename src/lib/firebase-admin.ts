import * as admin from 'firebase-admin';

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Vercel automatically handles the service account JSON, so we check for the project ID.
  // Locally, we expect the full base64 encoded string.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountString) {
    // If deployed on Vercel, it uses Application Default Credentials.
    if (process.env.VERCEL_ENV) {
      console.log("Initializing Firebase Admin with Application Default Credentials on Vercel.");
      return admin.initializeApp();
    }
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable for local development.');
  }

  try {
    console.log("Initializing Firebase Admin with service account string.");
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountString, 'base64').toString('utf8')
    );

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    throw new Error(
      `Error initializing Firebase Admin from service account string: ${error.message}`
    );
  }
}

const app = initializeAdminApp();
export const db = admin.firestore(app);
export const auth = admin.auth(app);
export const storage = admin.storage(app);
