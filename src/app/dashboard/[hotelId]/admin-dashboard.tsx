'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ArrowUpRight, Bot, DollarSign, Handshake, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const chartConfig = {
  transactions: {
    label: 'Transactions',
    color: 'hsl(var(--primary))',
  },
};

interface DashboardData {
    totalRevenue: number;
    totalTransactions: number;
    newClientsCount: number;
    chartData: { month: string; transactions: number }[];
}

export default function AdminDashboard({ hotelId, dashboardData }: { hotelId: string, dashboardData: DashboardData }) {
  const { totalRevenue, totalTransactions, newClientsCount, chartData } = dashboardData;

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your hotel&apos;s activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              All-time revenue from transactions.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newClientsCount}</div>
            <p className="text-xs text-muted-foreground">
              In the last 30 days.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All-time recorded transactions.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Recent Transactions</CardTitle>
            <CardDescription>
              A summary of transactions over the last 6 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                 <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="transactions"
                  fill="var(--color-transactions)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Quick Actions</CardTitle>
            <CardDescription>
              Jump right into your most common tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             <Link href={`/dashboard/${hotelId}/transactions`} className="w-full">
                <div className="flex items-center space-x-4 rounded-md border p-4 hover:bg-secondary transition-colors">
                    <Handshake className="h-6 w-6 text-primary" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">New Transaction</p>
                        <p className="text-sm text-muted-foreground">Record a new client meal.</p>
                    </div>
                </div>
            </Link>
             <Link href={`/dashboard/${hotelId}/clients`}>
                <div className="flex items-center space-x-4 rounded-md border p-4 hover:bg-secondary transition-colors">
                    <Users className="h-6 w-6 text-primary" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Add New Client</p>
                        <p className="text-sm text-muted-foreground">Register a client from a partner company.</p>
                    </div>
                </div>
            </Link>
             <Link href={`/dashboard/${hotelId}/ai-report`}>
                <div className="flex items-center space-x-4 rounded-md border p-4 hover:bg-secondary transition-colors">
                   <Bot className="h-6 w-6 text-primary" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Review Transactions with AI</p>
                        <p className="text-sm text-muted-foreground">Get an AI-powered summary of transaction data.</p>
                    </div>
                </div>
            </Link>
          </CardContent>
           <CardFooter>
            <Button className="w-full" asChild>
                <Link href={`/dashboard/${hotelId}/transactions`}>
                    View All Transactions <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
