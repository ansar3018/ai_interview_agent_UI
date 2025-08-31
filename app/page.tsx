"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, FileText, TrendingUp, Video, Mic } from "lucide-react"
import Link from "next/link"
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('Home');
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeInterviews: 0,
    completedInterviews: 0,
    pendingReports: 0,
  })

  useEffect(() => {
    // Fetch dashboard stats
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // This would typically fetch from your API
      setStats({
        totalCandidates: 24,
        activeInterviews: 3,
        completedInterviews: 18,
        pendingReports: 2,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-lg text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Interviews</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeInterviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedInterviews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingReports}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin/Interviewer Tools */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin/Interviewer Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-indigo-200 hover:border-indigo-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-indigo-600" />
                  Live Monitoring
                </CardTitle>
                <CardDescription>
                  Monitor candidate video/audio in real time (admin/interviewer only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/interviews/live-monitoring">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Go to Live Monitoring</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-200 hover:border-purple-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>
                  View interview statistics and analytics (basic version)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/reports/analytics">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">Go to Analytics Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600" />
                Start New Interview
              </CardTitle>
              <CardDescription>
                Begin a real-time AI-powered interview session with video and voice analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Mic className="h-3 w-3 mr-1" />
                    Voice Recognition
                  </Badge>
                  <Badge variant="secondary">
                    <Video className="h-3 w-3 mr-1" />
                    Live Video
                  </Badge>
                  <Badge variant="secondary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    AI Analysis
                  </Badge>
                </div>
                <Link href="/interviews/new">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Create Interview</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Manage Candidates
              </CardTitle>
              <CardDescription>Add new candidates, upload resumes, and view candidate profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Resume Analysis</Badge>
                  <Badge variant="secondary">Profile Management</Badge>
                  <Badge variant="secondary">Smart Questions</Badge>
                </div>
                <Link href="/candidates">
                  <Button className="w-full bg-green-600 hover:bg-green-700">View Candidates</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access key features of the interview platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/candidates/new">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Users className="h-6 w-6" />
                  Add Candidate
                </Button>
              </Link>

              <Link href="/interviews">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <Calendar className="h-6 w-6" />
                  View Interviews
                </Button>
              </Link>

              <Link href="/reports">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  Reports
                </Button>
              </Link>

              <Link href="/auth/login">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 bg-transparent">
                  <TrendingUp className="h-6 w-6" />
                  Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
