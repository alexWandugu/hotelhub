import type { Timestamp } from 'firebase/firestore';

export type HotelUser = {
  id: string; // This is the user's UID from Firebase Auth
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending';
  joinedAt?: Timestamp;
  requestedAt?: Timestamp;
};
