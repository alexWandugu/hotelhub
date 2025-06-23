'use server';

import { transactionReportSummary } from '@/ai/flows/transaction-report-summary';
import { z } from 'zod';
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc, getDoc, query, where, getDocs, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { revalidatePath } from 'next/cache';
import type { Client, Partner, Transaction } from './types';

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
    await addDoc(collection(db, 'hotels', hotelId, 'partners'), {
      ...validatedFields.data,
      status: 'active',
      createdAt: serverTimestamp(),
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
        await runTransaction(db, async (transaction) => {
            const partnerRef = doc(db, 'hotels', hotelId, 'partners', partnerId);
            
            const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('partnerId', '==', partnerId));
            const clientsSnapshot = await transaction.get(clientsQuery);
            const existingClientsCount = clientsSnapshot.size;

            if (sponsoredEmployeesCount < existingClientsCount) {
                throw new Error(`Cannot set employee count to ${sponsoredEmployeesCount}. There are already ${existingClientsCount} clients for this partner.`);
            }

            transaction.update(partnerRef, { name, sponsoredEmployeesCount, totalSharedAmount });
            
            const newAllowance = sponsoredEmployeesCount > 0 ? totalSharedAmount / sponsoredEmployeesCount : 0;
            
            clientsSnapshot.docs.forEach(clientDoc => {
                const clientRef = doc(db, `hotels/${hotelId}/clients`, clientDoc.id);
                transaction.update(clientRef, { allowance: newAllowance, partnerName: name });
            });
        });
        
        revalidatePath(`/dashboard/${hotelId}/partners`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
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
        const batch = writeBatch(db);

        const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('partnerId', '==', partnerId));
        const clientsSnapshot = await getDocs(clientsQuery);

        clientsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const partnerRef = doc(db, 'hotels', hotelId, 'partners', partnerId);
        batch.delete(partnerRef);
        
        await batch.commit();
        
        revalidatePath(`/dashboard/${hotelId}/partners`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
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
    const partnerRef = doc(db, `hotels/${hotelId}/partners`, partnerId);
    const partnerSnap = await getDoc(partnerRef);
    if (!partnerSnap.exists()) {
      return { errors: { partner: ['Selected partner not found.'] }, message: "Validation failed." };
    }
    const partnerData = partnerSnap.data() as Partner;

    const clientsQuery = query(
      collection(db, `hotels/${hotelId}/clients`),
      where('partnerId', '==', partnerId)
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    const existingClientsCount = clientsSnapshot.size;

    if (existingClientsCount >= partnerData.sponsoredEmployeesCount) {
      return {
        errors: { _form: [`Cannot add new client. The employee limit (${partnerData.sponsoredEmployeesCount}) for ${partnerName} has been reached.`] },
        message: 'Validation failed.'
      };
    }
    
    const allowance = partnerData.sponsoredEmployeesCount > 0 ? partnerData.totalSharedAmount / partnerData.sponsoredEmployeesCount : 0;

    await addDoc(collection(db, 'hotels', hotelId, 'clients'), {
      name: validatedFields.data.name,
      partnerId,
      partnerName,
      allowance: allowance,
      status: 'active',
      debt: 0,
      createdAt: serverTimestamp(),
    });

    revalidatePath(`/dashboard/${hotelId}/clients`);
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
    const clientRef = doc(db, 'hotels', hotelId, 'clients', clientId);
    await updateDoc(clientRef, { name: validatedFields.data.name });

    revalidatePath(`/dashboard/${hotelId}/clients`);
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
        const clientRef = doc(db, 'hotels', hotelId, 'clients', clientId);
        await deleteDoc(clientRef);
        
        revalidatePath(`/dashboard/${hotelId}/clients`);
    } catch (error: any) {
        console.error("Error deleting client:", error);
        throw new Error(`Failed to delete client: ${error.message}`);
    }
}


const TransactionSchema = z.object({
  client: z.string().min(1, { message: "You must select a client." }),
  amount: z.coerce.number().positive({ message: "Amount must be greater than zero." }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
});

export async function addTransaction(hotelId: string, prevState: any, formData: FormData) {
  const validatedFields = TransactionSchema.safeParse({
    client: formData.get('client'),
    amount: formData.get('amount'),
    receiptNo: formData.get('receiptNo'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed. Please check the form.",
    };
  }

  const { client: clientId, amount, receiptNo } = validatedFields.data;

  try {
    await runTransaction(db, async (transaction) => {
      const clientRef = doc(db, `hotels/${hotelId}/clients`, clientId);
      const clientSnap = await transaction.get(clientRef);

      if (!clientSnap.exists()) {
        throw new Error("Selected client could not be found.");
      }

      const clientData = clientSnap.data() as Client;
      const availableAllowance = clientData.allowance - clientData.debt;

      const newDebt = clientData.debt + amount;
      const transactionStatus = amount > availableAllowance ? 'flagged' : 'completed';

      transaction.update(clientRef, { debt: newDebt });
      
      const newTransactionRef = doc(collection(db, `hotels/${hotelId}/transactions`));
      transaction.set(newTransactionRef, {
        clientId: clientId,
        clientName: clientData.name,
        partnerName: clientData.partnerName,
        amount: amount,
        status: transactionStatus,
        createdAt: serverTimestamp(),
        receiptNo: receiptNo,
      });
    });
    
    revalidatePath(`/dashboard/${hotelId}/transactions`);
    revalidatePath(`/dashboard/${hotelId}/clients`);
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
        const transactionRef = doc(db, 'hotels', hotelId, 'transactions', transactionId);
        await updateDoc(transactionRef, { status: 'flagged' });
        
        revalidatePath(`/dashboard/${hotelId}/transactions`);
    } catch (error: any) {
        throw new Error(`Failed to flag transaction: ${error.message}`);
    }
}

export async function deleteTransaction(hotelId: string, transactionId: string) {
    if (!hotelId || !transactionId) {
        throw new Error('Invalid arguments provided.');
    }

    try {
        await runTransaction(db, async (transaction) => {
            const transactionRef = doc(db, 'hotels', hotelId, 'transactions', transactionId);
            const transactionSnap = await transaction.get(transactionRef);

            if (!transactionSnap.exists()) {
                throw new Error("Transaction not found.");
            }
            const transactionData = transactionSnap.data() as Transaction;
            const clientRef = doc(db, `hotels/${hotelId}/clients`, transactionData.clientId);
            const clientSnap = await transaction.get(clientRef);

            if (clientSnap.exists()) {
                const clientData = clientSnap.data() as Client;
                const newDebt = clientData.debt - transactionData.amount;
                transaction.update(clientRef, { debt: newDebt < 0 ? 0 : newDebt });
            }

            transaction.delete(transactionRef);
        });

        revalidatePath(`/dashboard/${hotelId}/transactions`);
        revalidatePath(`/dashboard/${hotelId}/clients`);
    } catch (error: any) {
        throw new Error(`Failed to delete transaction: ${error.message}`);
    }
}
