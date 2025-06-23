import type { Timestamp } from 'firebase/firestore';

export type HotelUser = {
  id: string; // This is the user's UID from Firebase Auth
  email: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending';
  joinedAt?: Timestamp;
  requestedAt?: Timestamp;
};

export type Partner = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  sponsoredEmployeesCount: number;
  totalSharedAmount: number;
};

export type Client = {
  id: string;
  name: string;
  partnerId: string;
  partnerName: string;
  allowance: number;
  debt: number;
  status: 'active' | 'suspended';
  createdAt: Timestamp;
};

export type Transaction = {
  id: string;
  clientId: string;
  clientName: string;
  partnerName: string;
  amount: number;
  status: 'completed' | 'flagged' | 'pending';
  createdAt: Timestamp;
  recordedBy: string; // user email
  receiptNo: string;
}
