"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const mockInterviews = [
  {
    id: "int-001",
    candidate: "John Doe",
    interviewer: "Jane Smith",
    status: "In Progress",
    startTime: "10:00 AM",
    analytics: {
      speakingTime: "12m",
      engagement: "High",
      issues: [],
    },
    chat: [
      { sender: "Jane Smith", text: "Welcome, John!" },
      { sender: "John Doe", text: "Thank you!" },
    ],
    notes: "Candidate is confident and clear."
  },
  {
    id: "int-002",
    candidate: "Alice Brown",
    interviewer: "Bob Lee",
    status: "In Progress",
    startTime: "10:15 AM",
    analytics: {
      speakingTime: "5m",
      engagement: "Medium",
      issues: ["Low audio detected"],
    },
    chat: [
      { sender: "Bob Lee", text: "Let's start with introductions." },
    ],
    notes: "Audio issues at the start."
  },
];

export default function LiveMonitoringPage() {
  const [selectedInterview, setSelectedInterview] = useState(mockInterviews[0]);
  const [chatInput, setChatInput] = useState("");
  const [notes, setNotes] = useState(selectedInterview.notes);
  const [alerts, setAlerts] = useState(selectedInterview.analytics.issues);

  const handleSelectInterview = (id: string) => {
    const interview = mockInterviews.find((i) => i.id === id);
    if (interview) {
      setSelectedInterview(interview);
      setChatInput("");
      setNotes(interview.notes);
      setAlerts(interview.analytics.issues);
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      selectedInterview.chat.push({ sender: "You", text: chatInput });
      setChatInput("");
    }
  };

  const handleSaveNotes = () => {
    selectedInterview.notes = notes;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Live Monitoring Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ongoing Interviews List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Ongoing Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {mockInterviews.map((interview) => (
                <li key={interview.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{interview.candidate}</span>
                    <Badge variant={interview.status === "In Progress" ? "default" : "secondary"}>{interview.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Interviewer: {interview.interviewer}</div>
                  <div className="text-xs text-muted-foreground">Started: {interview.startTime}</div>
                  <Button
                    size="sm"
                    variant={selectedInterview.id === interview.id ? "default" : "outline"}
                    className="mt-2"
                    onClick={() => handleSelectInterview(interview.id)}
                  >
                    {selectedInterview.id === interview.id ? "Viewing" : "View"}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Main Panel: Analytics, Chat, Notes */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Alerts */}
          {alerts && alerts.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Alerts</AlertTitle>
              <AlertDescription>
                {alerts.map((issue, idx) => (
                  <div key={idx}>{issue}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="analytics" className="w-full">
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="chat">Live Chat</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <div><b>Candidate:</b> {selectedInterview.candidate}</div>
                    <div><b>Interviewer:</b> {selectedInterview.interviewer}</div>
                    <div><b>Speaking Time:</b> {selectedInterview.analytics.speakingTime}</div>
                    <div><b>Engagement:</b> {selectedInterview.analytics.engagement}</div>
                    <div><b>Status:</b> {selectedInterview.status}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle>Live Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 overflow-y-auto border rounded p-2 mb-2 bg-muted/30">
                    {selectedInterview.chat.map((msg, idx) => (
                      <div key={idx} className="mb-1">
                        <span className="font-semibold text-blue-700 mr-2">{msg.sender}:</span>
                        <span>{msg.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendChat} disabled={!chatInput.trim()}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add notes about the candidate or interview..."
                    className="mb-2"
                  />
                  <Button onClick={handleSaveNotes}>Save Notes</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 