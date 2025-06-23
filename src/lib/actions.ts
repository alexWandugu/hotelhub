'use server';

import { transactionReportSummary } from '@/ai/flows/transaction-report-summary';
import { z } from 'zod';
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';
import type { Client, Partner } from './types';

const ReportSchema = z.object({
  report: z.string().min(10, { message: 'Report must not be empty.' }),
});

export async function generateReportSummary(prevState: any, formData: FormData) {
  const validatedFields = ReportSchema.safeParse({
    report: formData.get('report'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await transactionReportSummary({
      transactionReport: validatedFields.data.report,
    });
    return { summary: result.summary, error: null };
  } catch (error) {
    console.error(error);
    return { summary: null, error: 'Failed to generate summary. Please try again.' };
  }
}

export async function manageUserStatus(
  hotelId: string,
  targetUserId: string,
  action: 'approve' | 'deny'
) {
  if (!hotelId || !targetUserId || !action) {
    throw new Error('Invalid arguments provided.');
  }

  try {
    const userDocRef = doc(db, 'hotels', hotelId, 'users', targetUserId);

    if (action === 'approve') {
      await updateDoc(userDocRef, { 
        status: 'active',
        joinedAt: serverTimestamp(),
      });
    } else if (action === 'deny') {
      await deleteDoc(userDocRef);
    }
    
    // Revalidate the path to refresh the data on the page
    revalidatePath(`/dashboard/${hotelId}/users`);

  } catch (error: any) {
    console.error("Error managing user status:", error);
    throw new Error(`Failed to ${action} user: ${error.message}`);
  }
}

const AddPartnerSchema = z.object({
  name: z.string().min(2, { message: "Partner name must be at least 2 characters." }),
  sponsoredEmployeesCount: z.coerce.number().int().min(0, "Sponsored employees must be a positive number."),
  totalSharedAmount: z.coerce.number().min(0, "Shared amount must be a positive number."),
});

export async function addPartner(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = AddPartnerSchema.safeParse({
    name: formData.get('name'),
    sponsoredEmployeesCount: formData.get('sponsoredEmployeesCount'),
    totalSharedAmount: formData.get('totalSharedAmount'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the form.",
    };
  }
  
  if (!hotelId) {
      return { errors: null, message: "An unexpected error occurred: Hotel ID is missing." };
  }

  try {
    await addDoc(collection(db, 'hotels', hotelId, 'partners'), {
      name: validatedFields.data.name,
      status: 'active',
      createdAt: serverTimestamp(),
      sponsoredEmployeesCount: validatedFields.data.sponsoredEmployeesCount,
      totalSharedAmount: validatedFields.data.totalSharedAmount,
    });
    
    revalidatePath(`/dashboard/${hotelId}/partners`);
    return { errors: null, message: 'Partner added successfully!' };

  } catch (error) {
    return { errors: null, message: `Database Error: Failed to add partner.` };
  }
}

const AddClientSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  partner: z.string().min(1, { message: "You must select a partner." }), // Will be in "id|name" format
  allowance: z.coerce.number().min(0, "Allowance must be a positive number."),
});


export async function addClient(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = AddClientSchema.safeParse({
    name: formData.get('name'),
    partner: formData.get('partner'),
    allowance: formData.get('allowance'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the form.",
    };
  }

  if (!hotelId) {
    return { errors: null, message: "An unexpected error occurred: Hotel ID is missing." };
  }

  const [partnerId, partnerName] = validatedFields.data.partner.split('|');

  if (!partnerId || !partnerName) {
    return { errors: { partner: ['Invalid partner selected.'] }, message: "Validation failed." };
  }

  try {
     // 1. Get partner data for validation
    const partnerRef = doc(db, `hotels/${hotelId}/partners`, partnerId);
    const partnerSnap = await getDoc(partnerRef);
    if (!partnerSnap.exists()) {
      return { errors: { partner: ['Selected partner not found.'] }, message: "Validation failed." };
    }
    const partnerData = partnerSnap.data() as Partner;

    // 2. Get existing clients for this partner
    const clientsQuery = query(
      collection(db, `hotels/${hotelId}/clients`),
      where('partnerId', '==', partnerId)
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    const existingClients = clientsSnapshot.docs.map(doc => doc.data() as Client);

    // 3. Perform validation checks
    // 3a. Employee count validation
    if (existingClients.length >= partnerData.sponsoredEmployeesCount) {
      return {
        errors: { _form: [`Cannot add new client. The employee limit (${partnerData.sponsoredEmployeesCount}) for ${partnerName} has been reached.`] },
        message: 'Validation failed.'
      };
    }

    // 3b. Allowance validation
    const currentTotalAllowance = existingClients.reduce((sum, client) => sum + client.allowance, 0);
    const newAllowance = validatedFields.data.allowance;
    if (currentTotalAllowance + newAllowance > partnerData.totalSharedAmount) {
       return {
        errors: { _form: [`Cannot add new client. Adding this allowance would exceed the company's shared amount. Remaining: KES ${(partnerData.totalSharedAmount - currentTotalAllowance).toFixed(2)}`] },
        message: 'Validation failed.'
      };
    }

    // 4. If validation passes, add the new client
    await addDoc(collection(db, 'hotels', hotelId, 'clients'), {
      name: validatedFields.data.name,
      partnerId,
      partnerName,
      allowance: validatedFields.data.allowance,
      status: 'active', // Default status
      createdAt: serverTimestamp(),
    });

    revalidatePath(`/dashboard/${hotelId}/clients`);
    return { errors: null, message: 'Client added successfully!' };
  } catch (error) {
    console.error('Error adding client:', error);
    return { errors: null, message: `Database Error: Failed to add client.` };
  }
}
