
'use server';

import { transactionReportSummary } from '@/ai/flows/transaction-report-summary';
import { z } from 'zod';
import { db } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { Client, Partner, Transaction, PeriodHistory } from './types';
import { addDays } from 'date-fns';

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
    const userDocRef = db.doc(`hotels/${hotelId}/users/${targetUserId}`);

    if (action === 'approve') {
      await userDocRef.update({ 
        status: 'active',
        joinedAt: FieldValue.serverTimestamp(),
      });
    } else if (action === 'deny') {
      await userDocRef.delete();
    }
    
    revalidatePath(`/dashboard/${hotelId}/users`);

  } catch (error: any) {
    console.error("Error managing user status:", error);
    throw new Error(`Failed to ${action} user: ${error.message}`);
  }
}

const PartnerSchema = z.object({
  name: z.string().min(2, { message: "Partner name must be at least 2 characters." }),
  sponsoredEmployeesCount: z.coerce.number().int().min(1, "Number of employees must be at least 1."),
  totalSharedAmount: z.coerce.number().min(0, "Shared amount must be a positive number."),
});

export async function addPartner(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = PartnerSchema.safeParse({
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
    await db.collection(`hotels/${hotelId}/partners`).add({
      ...validatedFields.data,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
    
    revalidatePath(`/dashboard/${hotelId}/partners`);
    return { errors: null, message: 'Partner added successfully!' };

  } catch (error) {
    return { errors: null, message: `Database Error: Failed to add partner.` };
  }
}


export async function updatePartner(hotelId: string, partnerId: string, prevState: any, formData: FormData) {
    const validatedFields = PartnerSchema.safeParse({
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

    if (!hotelId || !partnerId) {
        return { errors: { _form: ["An unexpected error occurred: ID is missing."] }, message: "Update Failed." };
    }
    
    const { name, sponsoredEmployeesCount, totalSharedAmount } = validatedFields.data;

    try {
        const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
        const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);

        const clientsSnapshot = await clientsQuery.get();
        const existingClientsCount = clientsSnapshot.size;

        if (sponsoredEmployeesCount < existingClientsCount) {
            throw new Error(`Cannot set employee count to ${sponsoredEmployeesCount}. There are already ${existingClientsCount} clients for this partner.`);
        }

        await db.runTransaction(async (transaction) => {
            transaction.update(partnerRef, { name, sponsoredEmployeesCount, totalSharedAmount });
            
            const newPeriodAllowance = sponsoredEmployeesCount > 0 ? totalSharedAmount / sponsoredEmployeesCount : 0;
            
            clientsSnapshot.docs.forEach(clientDoc => {
                const clientRef = db.doc(`hotels/${hotelId}/clients/${clientDoc.id}`);
                transaction.update(clientRef, { periodAllowance: newPeriodAllowance, partnerName: name });
            });
        });
        
        revalidatePath(`/dashboard/${hotelId}/partners`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
        revalidatePath(`/dashboard/${hotelId}/transactions`);
        return { errors: null, message: 'Partner updated successfully!' };

    } catch (error: any) {
        return { errors: { _form: [error.message] }, message: `Database Error: Failed to update partner.` };
    }
}


export async function deletePartner(hotelId: string, partnerId: string) {
    if (!hotelId || !partnerId) {
        throw new Error('Invalid arguments provided for deletion.');
    }

    try {
        const batch = db.batch();

        const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);
        const clientsSnapshot = await clientsQuery.get();
        clientsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const transactionsQuery = db.collection(`hotels/${hotelId}/transactions`).where('partnerId', '==', partnerId);
        const transactionsSnapshot = await transactionsQuery.get();
        transactionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        const historyQuery = db.collection(`hotels/${hotelId}/partners/${partnerId}/periodHistory`);
        const historySnapshot = await historyQuery.get();
        historySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
        batch.delete(partnerRef);
        
        await batch.commit();
        
        revalidatePath(`/dashboard/${hotelId}/partners`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
        revalidatePath(`/dashboard/${hotelId}/transactions`);
        revalidatePath(`/dashboard/${hotelId}/reports`);
    } catch (error: any) {
        console.error("Error deleting partner:", error);
        throw new Error(`Failed to delete partner: ${error.message}`);
    }
}


const AddClientSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
  partner: z.string().min(1, { message: "You must select a partner." }), 
});


export async function addClient(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = AddClientSchema.safeParse({
    name: formData.get('name'),
    partner: formData.get('partner'),
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
    const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) {
      return { errors: { partner: ['Selected partner not found.'] }, message: "Validation failed." };
    }
    const partnerData = partnerSnap.data() as Partner;

    const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);
    const clientsSnapshot = await clientsQuery.get();
    const existingClientsCount = clientsSnapshot.size;

    if (existingClientsCount >= partnerData.sponsoredEmployeesCount) {
      return {
        errors: { _form: [`Cannot add new client. The employee limit (${partnerData.sponsoredEmployeesCount}) for ${partnerName} has been reached.`] },
        message: 'Validation failed.'
      };
    }

    await db.collection(`hotels/${hotelId}/clients`).add({
      name: validatedFields.data.name,
      partnerId,
      partnerName,
      periodAllowance: 0,
      utilizedAmount: 0,
      debt: 0,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath(`/dashboard/${hotelId}/clients`);
    revalidatePath(`/dashboard/${hotelId}/partners`);
    return { errors: null, message: 'Client added successfully!' };
  } catch (error) {
    console.error('Error adding client:', error);
    return { errors: { _form: ['Database Error: Failed to add client.'] }, message: `Failed to add client.` };
  }
}

const UpdateClientSchema = z.object({
  name: z.string().min(2, { message: "Client name must be at least 2 characters." }),
});

export async function updateClient(hotelId: string, clientId: string, prevState: any, formData: FormData) {
  const validatedFields = UpdateClientSchema.safeParse({
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the form.",
    };
  }

  if (!hotelId || !clientId) {
    return { errors: { _form: ["An unexpected error occurred: ID is missing."] }, message: "Update failed." };
  }

  try {
    const clientRef = db.doc(`hotels/${hotelId}/clients/${clientId}`);
    await clientRef.update({ name: validatedFields.data.name });

    revalidatePath(`/dashboard/${hotelId}/clients`);
    revalidatePath(`/dashboard/${hotelId}/transactions`);
    return { errors: null, message: 'Client name updated successfully!' };
  } catch (error) {
    return { errors: { _form: ["Database Error: Failed to update client."] }, message: `Update failed.` };
  }
}

export async function deleteClient(hotelId: string, clientId: string) {
    if (!hotelId || !clientId) {
        throw new Error('Invalid arguments provided for deletion.');
    }

    try {
        const clientRef = db.doc(`hotels/${hotelId}/clients/${clientId}`);
        await clientRef.delete();
        
        revalidatePath(`/dashboard/${hotelId}/clients`);
        revalidatePath(`/dashboard/${hotelId}/transactions`);
    } catch (error: any) {
        console.error("Error deleting client:", error);
        throw new Error(`Failed to delete client: ${error.message}`);
    }
}


const TransactionSchema = z.object({
  client: z.string().min(1, { message: "You must select a client." }),
  amount: z.coerce.number().positive({ message: "Amount must be greater than zero." }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  allowOverage: z.string().optional(),
});

export async function addTransaction(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = TransactionSchema.safeParse({
    client: formData.get('client'),
    amount: formData.get('amount'),
    receiptNo: formData.get('receiptNo'),
    allowOverage: formData.get('allowOverage'),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: "Validation failed." };
  }
  
  const { client: clientId, amount, receiptNo, allowOverage } = validatedFields.data;
  
  try {
    // --- READS FIRST ---
    const clientRef = db.doc(`hotels/${hotelId}/clients/${clientId}`);
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      return { errors: { _form: ["Client not found. They may have been deleted."] }, message: "Failed to record transaction." };
    }
    const clientData = clientSnap.data() as Client;
    
    const partnerRef = db.doc(`hotels/${hotelId}/partners/${clientData.partnerId}`);
    const partnerSnap = await partnerRef.get();
    
    if (!partnerSnap.exists) {
      return { errors: { _form: ["The client's partner company could not be found."] }, message: "Failed to record transaction." };
    }
    const partnerData = partnerSnap.data() as Partner;

    // --- VALIDATIONS SECOND ---
    if (!partnerData.lastPeriodStartedAt) {
      return { errors: { _form: ["The client's partner does not have an active billing period."] }, message: "Failed to record transaction." };
    }
    if (clientData.debt > 0) {
      return { errors: { _form: ["This client has an outstanding debt and cannot make new transactions."] }, message: "Failed to record transaction." };
    }
    
    const availableBalance = clientData.periodAllowance - clientData.utilizedAmount;
    const overage = amount - availableBalance;

    if (overage > 300) {
      return { errors: { _form: [`The resulting debt of KES ${overage.toFixed(2)} exceeds the KES 300.00 limit.`] }, message: "Failed to record transaction." };
    }

    if (overage > 0 && allowOverage !== 'true') {
      // This case should be handled by the client, but is a safety net.
      return { errors: { _form: ["This transaction requires confirmation for creating new debt. Please try again."] }, message: "Failed to record transaction." };
    }
    
    // --- WRITES LAST (ATOMICALLY) ---
    const batch = db.batch();
    
    const newUtilizedAmount = clientData.utilizedAmount + amount;
    const newDebt = overage > 0 ? overage : 0;

    batch.update(clientRef, {
      utilizedAmount: newUtilizedAmount,
      debt: newDebt,
    });

    const newTransactionRef = db.collection(`hotels/${hotelId}/transactions`).doc();
    batch.set(newTransactionRef, {
      clientId: clientId,
      clientName: clientData.name,
      partnerId: clientData.partnerId,
      partnerName: partnerData.name,
      amount: amount,
      status: 'completed',
      createdAt: FieldValue.serverTimestamp(),
      receiptNo: receiptNo,
    });
    
    await batch.commit();

    // --- SUCCESS ---
    revalidatePath(`/dashboard/${hotelId}/transactions`);
    revalidatePath(`/dashboard/${hotelId}/new-transaction`);
    revalidatePath(`/dashboard/${hotelId}/clients`);
    revalidatePath(`/dashboard/${hotelId}/partners`);
    revalidatePath(`/dashboard/${hotelId}/reports`);

    return { errors: null, message: "Transaction recorded successfully!" };

  } catch (error: any) {
    // --- FAILURE ---
    console.error("addTransaction failed:", error);
    return { 
      errors: { _form: [error.message || 'An unexpected server error occurred.'] },
      message: "Failed to record transaction." 
    };
  }
}

export async function flagTransaction(hotelId: string, transactionId: string) {
    if (!hotelId || !transactionId) {
        throw new Error('Invalid arguments provided.');
    }

    try {
        const transactionRef = db.doc(`hotels/${hotelId}/transactions/${transactionId}`);
        await transactionRef.update({ status: 'flagged' });
        
        revalidatePath(`/dashboard/${hotelId}/transactions`);
        revalidatePath(`/dashboard/${hotelId}/new-transaction`);
    } catch (error: any) {
        throw new Error(`Failed to flag transaction: ${error.message}`);
    }
}

export async function deleteTransaction(hotelId: string, transactionId: string) {
    if (!hotelId || !transactionId) {
        throw new Error('Invalid arguments provided.');
    }

    try {
        await db.runTransaction(async (transaction) => {
            const transactionRef = db.doc(`hotels/${hotelId}/transactions/${transactionId}`);
            const transactionSnap = await transaction.get(transactionRef);

            if (!transactionSnap.exists) {
                throw new Error("Transaction not found.");
            }
            const transactionData = transactionSnap.data() as Transaction;
            const clientRef = db.doc(`hotels/${hotelId}/clients/${transactionData.clientId}`);
            const clientSnap = await transaction.get(clientRef);

            if (clientSnap.exists) {
                const clientData = clientSnap.data() as Client;
                const utilized = Number(clientData.utilizedAmount || 0);
                
                const newUtilized = utilized - transactionData.amount;
                
                const allowance = Number(clientData.periodAllowance || 0);
                const newDebt = newUtilized > allowance ? newUtilized - allowance : 0;

                transaction.update(clientRef, { 
                  utilizedAmount: newUtilized < 0 ? 0 : newUtilized,
                  debt: newDebt < 0 ? 0 : newDebt
                });
            }

            transaction.delete(transactionRef);
        });

        revalidatePath(`/dashboard/${hotelId}/transactions`);
        revalidatePath(`/dashboard/${hotelId}/new-transaction`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
        revalidatePath(`/dashboard/${hotelId}/partners`);
    } catch (error: any) {
        throw new Error(`Failed to delete transaction: ${error.message}`);
    }
}

export async function startNewPeriod(hotelId: string, partnerId: string) {
  if (!hotelId || !partnerId) {
    throw new Error('Invalid arguments provided to start a new period.');
  }

  try {
    const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
    const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);
    
    // Perform all reads before the transaction
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) {
      throw new Error('Partner not found.');
    }
    const partnerData = partnerSnap.data() as Partner;

    if (partnerData.lastPeriodStartedAt) {
      const currentStartDate = (partnerData.lastPeriodStartedAt as any).toDate();
      const expiryDate = addDays(currentStartDate, 30);
      if (new Date() < expiryDate) {
        throw new Error(
          `Cannot start a new period. The current period expires on ${expiryDate.toLocaleDateString()}.`
        );
      }
    }
    
    const { totalSharedAmount, sponsoredEmployeesCount } = partnerData;
    if (sponsoredEmployeesCount <= 0) {
      throw new Error('Partner has no sponsored employees to start a new period for.');
    }
    
    const clientsSnapshot = await clientsQuery.get();
    
    const newStartDate = new Date();
    const newEndDate = addDays(newStartDate, 30);
    const newPeriodBaseAllowance = totalSharedAmount / sponsoredEmployeesCount;

    // Use a write-only transaction
    const batch = db.batch();

    batch.update(partnerRef, { lastPeriodStartedAt: newStartDate });

    const historyRef = db.collection(`hotels/${hotelId}/partners/${partnerId}/periodHistory`).doc();
    batch.set(historyRef, {
      startDate: newStartDate,
      endDate: newEndDate,
      sponsoredEmployeesCount,
      totalSharedAmount,
    });

    clientsSnapshot.docs.forEach((clientDoc) => {
      const clientData = clientDoc.data() as Client;
      const previousDebt = Number(clientData.debt || 0);
      const newTotalAllowanceForPeriod = newPeriodBaseAllowance - previousDebt;

      batch.update(clientDoc.ref, {
        periodAllowance: newTotalAllowanceForPeriod < 0 ? 0 : newTotalAllowanceForPeriod,
        utilizedAmount: 0,
        debt: 0,
      });
    });

    await batch.commit();

    revalidatePath(`/dashboard/${hotelId}/partners`);
    revalidatePath(`/dashboard/${hotelId}/clients`);
    revalidatePath(`/dashboard/${hotelId}/transactions`);
    revalidatePath(`/dashboard/${hotelId}/new-transaction`);
    revalidatePath(`/dashboard/${hotelId}/reports`);
  } catch (error: any) {
    console.error('Error starting new period:', error);
    throw new Error(`Failed to start new period: ${error.message}`);
  }
}

export async function getPartnerPeriodHistory(hotelId: string, partnerId: string): Promise<(Omit<PeriodHistory, 'startDate' | 'endDate'> & { id: string, startDate: string, endDate: string })[]> {
    if (!hotelId || !partnerId) {
        throw new Error("Hotel ID and Partner ID are required.");
    }
    try {
        const historyQuery = db.collection(`hotels/${hotelId}/partners/${partnerId}/periodHistory`).orderBy('startDate', 'desc');
        const snapshot = await historyQuery.get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data() as PeriodHistory;
            const startDate = (data.startDate as any).toDate();
            const endDate = (data.endDate as any).toDate();
            return {
                ...data,
                id: doc.id,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
        });
    } catch (error: any) {
        console.error("Error fetching period history: ", error);
        throw new Error("Failed to fetch period history.");
    }
}
