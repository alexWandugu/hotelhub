import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import AdminDashboard from './admin-dashboard';
import { notFound } from 'next/navigation';
import { subMonths, format, getMonth, getYear } from 'date-fns';
import type { Transaction } from '@/lib/types';

async function getDashboardData(hotelId: string) {
    try {
        const transactionsQuery = db.collection(`hotels/${hotelId}/transactions`);

        const thirtyDaysAgo = subMonths(new Date(), 1);
        const newClientsQuery = db
            .collection(`hotels/${hotelId}/clients`)
            .where('createdAt', '>=', thirtyDaysAgo);

        const [transactionsSnapshot, newClientsSnapshot] = await Promise.all([
            transactionsQuery.get(),
            newClientsQuery.get(),
        ]);

        const transactions = transactionsSnapshot.docs.map(doc => doc.data() as Transaction);

        const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalTransactions = transactions.length;
        const newClientsCount = newClientsSnapshot.size;

        // Chart data for the last 6 months
        const months = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(new Date(), i);
            return {
                name: format(date, 'MMMM'),
                year: getYear(date),
                month: getMonth(date),
                transactions: 0,
            };
        }).reverse(); // from oldest to newest

        transactions.forEach(transaction => {
            if (!transaction.createdAt) return;
            const transactionDate = (transaction.createdAt as Timestamp).toDate();
            const transactionYear = getYear(transactionDate);
            const transactionMonth = getMonth(transactionDate);

            const monthData = months.find(m => m.year === transactionYear && m.month === transactionMonth);
            if (monthData) {
                monthData.transactions++;
            }
        });

        const chartData = months.map(m => ({ month: m.name, transactions: m.transactions }));

        return {
            totalRevenue,
            totalTransactions,
            newClientsCount,
            chartData,
        };

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return {
            totalRevenue: 0,
            totalTransactions: 0,
            newClientsCount: 0,
            chartData: Array.from({ length: 6 }).map((_, i) => ({ month: format(subMonths(new Date(), 5 - i), 'MMMM'), transactions: 0 })),
        };
    }
}


export default async function DashboardPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const dashboardData = await getDashboardData(params.hotelId);

  // This page is now admin-only.
  // The layout will redirect members to their dedicated page.
  return <AdminDashboard hotelId={params.hotelId} dashboardData={dashboardData} />;
}
