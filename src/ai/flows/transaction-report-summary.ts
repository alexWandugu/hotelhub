'use server';

/**
 * @fileOverview This file defines a Genkit flow for summarizing daily transaction reports and identifying potential anomalies.
 *
 * - transactionReportSummary - A function that generates a summary of the transaction report.
 * - TransactionReportSummaryInput - The input type for the transactionReportSummary function.
 * - TransactionReportSummaryOutput - The return type for the transactionReportSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionReportSummaryInputSchema = z.object({
  transactionReport: z.string().describe('The daily transaction report in CSV format.'),
});
export type TransactionReportSummaryInput = z.infer<typeof TransactionReportSummaryInputSchema>;

const TransactionReportSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the transaction report, highlighting potential anomalies or fraudulent activities.'),
});
export type TransactionReportSummaryOutput = z.infer<typeof TransactionReportSummaryOutputSchema>;

export async function transactionReportSummary(input: TransactionReportSummaryInput): Promise<TransactionReportSummaryOutput> {
  return transactionReportSummaryFlow(input);
}

const transactionReportSummaryPrompt = ai.definePrompt({
  name: 'transactionReportSummaryPrompt',
  input: {schema: TransactionReportSummaryInputSchema},
  output: {schema: TransactionReportSummaryOutputSchema},
  prompt: `You are an expert financial analyst specializing in fraud detection.
  You will be provided with a daily transaction report in CSV format.
  Your task is to analyze the report and generate a concise summary highlighting any potential anomalies or fraudulent activities.
  The summary should be actionable and provide insights for further investigation.

  Transaction Report:
  {{transactionReport}}`,
});

const transactionReportSummaryFlow = ai.defineFlow(
  {
    name: 'transactionReportSummaryFlow',
    inputSchema: TransactionReportSummaryInputSchema,
    outputSchema: TransactionReportSummaryOutputSchema,
  },
  async input => {
    const {output} = await transactionReportSummaryPrompt(input);
    return output!;
  }
);
