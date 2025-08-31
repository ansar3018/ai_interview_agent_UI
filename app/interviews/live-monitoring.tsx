import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LiveMonitoringPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Live Monitoring (Admin/Interviewer)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-lg text-gray-700 mb-4">
            This page will allow interviewers/admins to monitor candidate video and audio in real time.
          </div>
          <div className="p-8 text-center text-gray-400 border rounded bg-gray-50">
            [Live monitoring UI coming soon]
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
