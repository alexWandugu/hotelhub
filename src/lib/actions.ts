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
        await db.runTransaction(async (transaction) => {
            const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
            
            const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);
            const clientsSnapshot = await transaction.get(clientsQuery);
            const existingClientsCount = clientsSnapshot.size;

            if (sponsoredEmployeesCount < existingClientsCount) {
                throw new Error(`Cannot set employee count to ${sponsoredEmployeesCount}. There are already ${existingClientsCount} clients for this partner.`);
            }

            transaction.update(partnerRef, { name, sponsoredEmployeesCount, totalSharedAmount });
            
            const newPeriodAllowance = sponsoredEmployeesCount > 0 ? totalSharedAmount / sponsoredEmployeesCount : 0;
            
            clientsSnapshot.docs.forEach(clientDoc => {
                const clientRef = db.doc(`hotels/${hotelId}/clients/${clientDoc.id}`);
                // Note: This updates the allowance mid-period. It does not reset consumption.
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

        // Delete associated clients
        const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', '==', partnerId);
        const clientsSnapshot = await clientsQuery.get();
        clientsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete associated transactions
        const transactionsQuery = db.collection(`hotels/${hotelId}/transactions`).where('partnerId', '==', partnerId);
        const transactionsSnapshot = await transactionsQuery.get();
        transactionsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete period history
        const historyQuery = db.collection(`hotels/${hotelId}/partners/${partnerId}/periodHistory`);
        const historySnapshot = await historyQuery.get();
        historySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete the partner
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
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the form.",
    };
  }

  const { client: clientId, amount, receiptNo, allowOverage } = validatedFields.data;

  try {
    await db.runTransaction(async (transaction) => {
      const clientRef = db.doc(`hotels/${hotelId}/clients/${clientId}`);
      const clientSnap = await transaction.get(clientRef);

      if (!clientSnap.exists) {
        throw new Error("Selected client could not be found.");
      }

      const clientData = clientSnap.data() as Client;
      
      const currentDebt = Number(clientData.debt || 0);
      if (currentDebt > 0) {
          throw new Error("This client has an outstanding debt and cannot make new transactions until the next period begins.");
      }

      const periodAllowance = Number(clientData.periodAllowance || 0);
      const utilizedAmount = Number(clientData.utilizedAmount || 0);
      const availableBalance = periodAllowance - utilizedAmount;

      const overage = amount - availableBalance;
      
      if (overage > 300) {
          throw new Error(`Transaction amount exceeds the debt limit of 300 KES.`);
      }

      if (overage > 0 && allowOverage !== 'true') {
          throw new Error('This transaction creates debt and requires explicit confirmation.');
      }

      const newUtilizedAmount = utilizedAmount + amount;
      const newDebt = overage > 0 ? overage : 0;
      
      transaction.update(clientRef, { 
        utilizedAmount: newUtilizedAmount,
        debt: newDebt,
      });
      
      const newTransactionRef = db.collection(`hotels/${hotelId}/transactions`).doc();
      transaction.set(newTransactionRef, {
        clientId: clientId,
        clientName: clientData.name,
        partnerId: clientData.partnerId,
        partnerName: clientData.partnerName,
        amount: amount,
        status: 'completed',
        createdAt: FieldValue.serverTimestamp(),
        receiptNo: receiptNo,
      });
    });
    
    revalidatePath(`/dashboard/${hotelId}/transactions`);
    revalidatePath(`/dashboard/${hotelId}/new-transaction`);
    revalidatePath(`/dashboard/${hotelId}/clients`);
    revalidatePath(`/dashboard/${hotelId}/partners`);
    return { errors: null, message: "Transaction recorded successfully!" };

  } catch (error: any) {
    return { errors: { _form: [error.message] }, message: `Failed to record transaction.` };
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
                
                // Recalculate debt based on the new utilized amount
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
        await db.runTransaction(async (transaction) => {
            const partnerRef = db.doc(`hotels/${hotelId}/partners/${partnerId}`);
            const partnerSnap = await transaction.get(partnerRef);

            if (!partnerSnap.exists) {
                throw new Error("Partner not found.");
            }

            const partnerData = partnerSnap.data() as Partner;

            if (partnerData.lastPeriodStartedAt) {
                const startDate = partnerData.lastPeriodStartedAt.toDate();
                const expiryDate = addDays(startDate, 30); // Period is 30 days

                if (new Date() < expiryDate) {
                    throw new Error(`Cannot start a new period. The current period expires on ${expiryDate.toLocaleDateString()}.`);
                }
            }

            const { totalSharedAmount, sponsoredEmployeesCount } = partnerData;
            
            if (sponsoredEmployeesCount <= 0) {
                 throw new Error("Partner has no sponsored employees to start a new period for.");
            }
            
            // Create historical record for the new period
            const historyRef = db.collection(`hotels/${hotelId}/partners/${partnerId}/periodHistory`).doc();
            const newStartDate = new Date();
            const newEndDate = addDays(newStartDate, 30);
            
            transaction.set(historyRef, {
                startDate: newStartDate,
                endDate: newEndDate,
                sponsoredEmployeesCount,
                totalSharedAmount,
            });

            // Update partner with new period start date
            transaction.update(partnerRef, { lastPeriodStartedAt: FieldValue.serverTimestamp() });

            // Update clients
            const newPeriodBaseAllowance = totalSharedAmount / sponsoredEmployeesCount;
            
            const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where("partnerId", "==", partnerId);
            const clientsSnapshot = await transaction.get(clientsQuery);

            clientsSnapshot.docs.forEach(clientDoc => {
                const clientRef = clientDoc.ref;
                const clientData = clientDoc.data() as Client;

                const previousDebt = Number(clientData.debt || 0);
                const newTotalAllowanceForPeriod = newPeriodBaseAllowance - previousDebt;

                transaction.update(clientRef, {
                    periodAllowance: newTotalAllowanceForPeriod < 0 ? 0 : newTotalAllowanceForPeriod,
                    utilizedAmount: 0,
                    debt: 0,
                });
            });
        });

        revalidatePath(`/dashboard/${hotelId}/partners`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
        revalidatePath(`/dashboard/${hotelId}/transactions`);
        revalidatePath(`/dashboard/${hotelId}/new-transaction`);
        revalidatePath(`/dashboard/${hotelId}/reports`);

    } catch (error: any) {
        console.error("Error starting new period:", error);
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
            return {
                ...data,
                id: doc.id,
                startDate: data.startDate.toDate().toISOString(),
                endDate: data.endDate.toDate().toISOString(),
            };
        });
    } catch (error: any) {
        console.error("Error fetching period history: ", error);
        throw new Error("Failed to fetch period history.");
    }
}
