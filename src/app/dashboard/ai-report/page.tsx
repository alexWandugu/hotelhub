import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AiReportClient } from './ai-report-client';

export default function AiReportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">AI Transaction Review</h1>
        <p className="text-muted-foreground">
          Paste your daily transaction report in CSV format to get an AI-powered summary.
        </p>
      </div>
      <AiReportClient />
    </div>
  );
}
