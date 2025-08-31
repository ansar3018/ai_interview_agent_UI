"use client"
import React from 'react';

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, User, Play, FileText, Plus } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api"

interface Interview {
  id: string
  candidate_id: string
  position: string
  interview_type: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  duration_minutes: number | null
  overall_score: number | null
  created_at: string
  scheduled_at: string | null
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchInterviews()
  }, [statusFilter])

  const fetchInterviews = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status_filter", statusFilter)
      }

      const data = await apiClient.getInterviews(/* pass params as needed */)
      setInterviews(data)
    } catch (error) {
      console.error("Failed to fetch interviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading interviews...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all interviews</p>
        </div>
        <Link href="/interviews/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Interview
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interviews</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interviews List */}
      <div className="space-y-4">
        {interviews.map((interview) => (
          <Card key={interview.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{interview.position}</h3>
                    <Badge className={getStatusColor(interview.status)}>{interview.status.replace("_", " ")}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>Candidate ID: {interview.candidate_id}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {interview.scheduled_at
                          ? new Date(interview.scheduled_at).toLocaleDateString()
                          : new Date(interview.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {interview.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{interview.duration_minutes} minutes</span>
                      </div>
                    )}

                    {interview.overall_score && (
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold ${getScoreColor(interview.overall_score)}`}>
                          Score: {interview.overall_score}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {interview.status === "scheduled" && (
                    <Link href={`/interviews/${interview.id}/conduct`}>
                      <Button size="sm" className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        Start
                      </Button>
                    </Link>
                  )}

                  {interview.status === "completed" && (
                    <Link href={`/reports/${interview.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                        <FileText className="h-3 w-3" />
                        Report
                      </Button>
                    </Link>
                  )}

                  <Link href={`/interviews/${interview.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {interviews.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {statusFilter === "all"
              ? "No interviews scheduled yet."
              : `No ${statusFilter.replace("_", " ")} interviews found.`}
          </div>
          <Link href="/interviews/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Interview
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
