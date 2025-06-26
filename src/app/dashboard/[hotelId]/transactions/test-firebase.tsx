import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const testDoc = await db.collection('test').doc('vercel-test').get();
    res.status(200).json({ exists: testDoc.exists, data: testDoc.data() });
  } catch (error: any) {
    console.error('Firebase access error:', error);
    res.status(500).json({ error: error.message });
  }
}