'use server';

import { transactionReportSummary } from '@/ai/flows/transaction-report-summary';
import { z } from 'zod';
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';

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
});

export async function addPartner(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = AddPartnerSchema.safeParse({
    name: formData.get('name'),
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
    });
    
    revalidatePath(`/dashboard/${hotelId}/partners`);
    return { errors: null, message: 'Partner added successfully!' };

  } catch (error) {
    return { errors: null, message: `Database Error: Failed to add partner.` };
  }
}
