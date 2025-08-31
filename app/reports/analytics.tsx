import React from 'react';
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const mockStats = {
  totalInterviews: 120,
  completed: 90,
  inProgress: 15,
  scheduled: 10,
  cancelled: 5,
  avgScore: 76,
  avgDuration: 42,
};

const mockTrends = [
  { date: "2024-06-01", interviews: 5 },
  { date: "2024-06-02", interviews: 8 },
  { date: "2024-06-03", interviews: 12 },
  { date: "2024-06-04", interviews: 7 },
  { date: "2024-06-05", interviews: 15 },
  { date: "2024-06-06", interviews: 10 },
  { date: "2024-06-07", interviews: 13 },
];

const mockOutcomes = [
  { name: "Strong Hire", value: 30 },
  { name: "Hire", value: 40 },
  { name: "No Hire", value: 20 },
  { name: "Pending", value: 30 },
];

const COLORS = ["#4f46e5", "#22c55e", "#f59e42", "#ef4444"];

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Detailed interview statistics and trends</p>
        </div>
        <div className="flex gap-2 items-center">
          <div>
            <Button variant="outline" onClick={() => setShowCalendar((v) => !v)}>
              {dateRange.from && dateRange.to
                ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                : "Select Date Range"}
            </Button>
            {showCalendar && (
              <div className="absolute z-50 mt-2 bg-white border rounded shadow-lg p-4">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange(range ?? { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
                <Button className="mt-2 w-full" onClick={() => setShowCalendar(false)}>Done</Button>
              </div>
            )}
          </div>
          <Button variant="outline">Export CSV</Button>
          <Button variant="outline">Export PDF</Button>
        </div>
      </div>

      {/* High-level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalInterviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{mockStats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mockStats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Interviews Over Time</CardTitle>
          <CardDescription>Number of interviews conducted per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="interviews" stroke="#4f46e5" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Outcomes Pie Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Interview Outcomes</CardTitle>
          <CardDescription>Distribution of interview results</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={mockOutcomes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {mockOutcomes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Averages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{mockStats.avgScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{mockStats.avgDuration} min</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
