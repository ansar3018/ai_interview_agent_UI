"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Eye, Calendar } from "lucide-react"
import Link from "next/link"

interface Report {
  id: string
  interview_id: string
  candidate_name: string
  position: string
  date: string
  overall_score: number
  technical_score: number
  communication_score: number
  problem_solving_score: number
  cultural_fit_score: number
  recommendation: string
  status: "completed" | "pending"
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      // Mock data - replace with actual API call
      setReports([
        {
          id: "1",
          interview_id: "int-001",
          candidate_name: "John Doe",
          position: "Senior Software Engineer",
          date: "2024-01-15",
          overall_score: 85,
          technical_score: 88,
          communication_score: 82,
          problem_solving_score: 87,
          cultural_fit_score: 83,
          recommendation: "Strong Hire",
          status: "completed",
        },
        {
          id: "2",
          interview_id: "int-002",
          candidate_name: "Jane Smith",
          position: "Frontend Developer",
          date: "2024-01-14",
          overall_score: 78,
          technical_score: 75,
          communication_score: 85,
          problem_solving_score: 72,
          cultural_fit_score: 80,
          recommendation: "Hire",
          status: "completed",
        },
      ])
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case "strong hire":
        return "bg-green-100 text-green-800"
      case "hire":
        return "bg-blue-100 text-blue-800"
      case "no hire":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading reports...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interview Reports</h1>
        <p className="text-gray-600 mt-1">View and analyze interview performance reports</p>
      </div>

      {/* Reports Grid */}
      <div className="space-y-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Report Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{report.candidate_name}</h3>
                      <p className="text-gray-600">{report.position}</p>
                    </div>
                    <Badge className={getRecommendationColor(report.recommendation)}>{report.recommendation}</Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>ID: {report.interview_id}</span>
                    </div>
                  </div>

                  {/* Overall Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Score</span>
                      <span className={`text-lg font-bold ${getScoreColor(report.overall_score)}`}>
                        {report.overall_score}%
                      </span>
                    </div>
                    <Progress value={report.overall_score} className="h-2" />
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="lg:w-80">
                  <h4 className="font-medium mb-3">Score Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Technical Skills</span>
                      <div className="flex items-center gap-2">
                        <Progress value={report.technical_score} className="w-16 h-1" />
                        <span className={`text-sm font-medium ${getScoreColor(report.technical_score)}`}>
                          {report.technical_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Communication</span>
                      <div className="flex items-center gap-2">
                        <Progress value={report.communication_score} className="w-16 h-1" />
                        <span className={`text-sm font-medium ${getScoreColor(report.communication_score)}`}>
                          {report.communication_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Problem Solving</span>
                      <div className="flex items-center gap-2">
                        <Progress value={report.problem_solving_score} className="w-16 h-1" />
                        <span className={`text-sm font-medium ${getScoreColor(report.problem_solving_score)}`}>
                          {report.problem_solving_score}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cultural Fit</span>
                      <div className="flex items-center gap-2">
                        <Progress value={report.cultural_fit_score} className="w-16 h-1" />
                        <span className={`text-sm font-medium ${getScoreColor(report.cultural_fit_score)}`}>
                          {report.cultural_fit_score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-6">
                    <Link href={`/reports/${report.interview_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full flex items-center gap-1 bg-transparent">
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 bg-transparent">
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-4">No interview reports available yet.</div>
          <Link href="/interviews/new">
            <Button>Schedule Your First Interview</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
