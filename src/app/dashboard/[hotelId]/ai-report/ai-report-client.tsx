'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { generateReportSummary } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { transactionReportCSV } from '@/lib/data';
import { Bot, Loader, FileText, AlertTriangle, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const initialState = {
  summary: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Summary
        </>
      )}
    </Button>
  );
}

export function AiReportClient() {
  const [state, formAction] = useFormState(generateReportSummary, initialState);
  const { pending } = useFormStatus();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <FileText />
            Transaction Data
          </CardTitle>
          <CardDescription>
            Paste your CSV data below. You can use the sample data provided.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="grid w-full gap-4">
              <Textarea
                name="report"
                placeholder="Paste your transaction report here..."
                defaultValue={transactionReportCSV}
                className="min-h-[300px] font-code text-xs"
                required
              />
              {state.error?.report && (
                 <p className="text-sm text-destructive">{state.error.report[0]}</p>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                 <p className="text-xs text-muted-foreground">
                    The AI will analyze this data for anomalies.
                </p>
                <SubmitButton />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Bot />
            AI Generated Summary
          </CardTitle>
          <CardDescription>
            A concise summary highlighting potential anomalies or fraudulent activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : state.summary ? (
            <div className="prose prose-sm max-w-none text-foreground">{state.summary}</div>
          ) : state.error ? (
             <div className="flex flex-col items-center justify-center text-center p-8 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
                <p className="font-semibold text-destructive">An Error Occurred</p>
                <p className="text-sm text-destructive/80">{typeof state.error === 'string' ? state.error : 'Please check your data and try again.'}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary rounded-lg">
                <Bot className="h-10 w-10 text-muted-foreground mb-4" />
                <p className="font-semibold">Summary will appear here</p>
                <p className="text-sm text-muted-foreground">Submit your data to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
