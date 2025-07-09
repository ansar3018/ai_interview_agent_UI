"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Download,
  User,
  Calendar,
  Clock,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { GazingSummary } from "@/components/facial-gazing/gazing-summary"

interface DetailedReport {
  interview_id: string
  candidate: {
    name: string
    email: string
    position: string
  }
  interview_details: {
    date: string
    duration: number
    type: string
  }
  scores: {
    overall: number
    technical: number
    communication: number
    problem_solving: number
    cultural_fit: number
    malpractice: number
  }
  questions_and_responses: Array<{
    question: string
    response: string
    score: number
    feedback: string
  }>
  recommendation: string
  summary: string
  strengths: string[]
  areas_for_improvement: string[]
  gazingAnalysis: {
    averageAttentionScore: number
    totalEyeContactTime: number
    totalLookingAwayTime: number
    averageBlinkRate: number
    engagementLevel: "Low" | "Medium" | "High"
    recommendations: string[]
  }
}

export default function ReportDetailPage() {
  const params = useParams()
  const [report, setReport] = useState<DetailedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/v1/reports/${params.id}`)

      if (response.ok) {
        const data = await response.json()
        setReport(data)
      } else {
        // Mock data for demonstration
        setReport({
          interview_id: params.id as string,
          candidate: {
            name: "John Doe",
            email: "john.doe@email.com",
            position: "Senior Software Engineer",
          },
          interview_details: {
            date: "2024-01-15T10:00:00Z",
            duration: 45,
            type: "Technical",
          },
          scores: {
            overall: 85,
            technical: 88,
            communication: 82,
            problem_solving: 87,
            cultural_fit: 83,
            malpractice: 5,
          },
          questions_and_responses: [
            {
              question: "Tell me about yourself and your background in software development.",
              response:
                "I have been working as a software engineer for over 5 years, primarily focusing on full-stack development with React and Node.js. I've led several projects and enjoy solving complex technical challenges.",
              score: 85,
              feedback:
                "Good overview of experience with specific technologies mentioned. Could have been more structured.",
            },
            {
              question: "Describe a challenging technical problem you've solved recently.",
              response:
                "Recently, I optimized a database query that was causing performance issues. I analyzed the execution plan, added proper indexes, and reduced query time from 2 seconds to 200ms.",
              score: 90,
              feedback:
                "Excellent technical explanation with specific metrics. Shows problem-solving skills and attention to performance.",
            },
            {
              question: "How do you approach debugging complex issues in your code?",
              response:
                "I start by reproducing the issue, then use logging and debugging tools to trace the problem. I also write unit tests to isolate the issue and prevent regression.",
              score: 88,
              feedback: "Systematic approach to debugging. Good mention of testing for prevention.",
            },
          ],
          recommendation: "Strong Hire",
          summary:
            "The candidate demonstrated strong technical skills and problem-solving abilities. Communication was clear and professional throughout the interview. Shows good understanding of software engineering principles and best practices.",
          strengths: [
            "Strong technical knowledge in full-stack development",
            "Clear communication and explanation of concepts",
            "Systematic approach to problem-solving",
            "Good understanding of performance optimization",
            "Mentions testing and best practices",
          ],
          areas_for_improvement: [
            "Could provide more structured responses",
            "Would benefit from discussing team collaboration more",
            "Could elaborate on leadership experience",
          ],
          gazingAnalysis: {
            averageAttentionScore: 78,
            totalEyeContactTime: 180,
            totalLookingAwayTime: 45,
            averageBlinkRate: 16,
            engagementLevel: "Medium" as const,
            recommendations: [
              "Maintain more consistent eye contact with the camera",
              "Try to reduce looking away during responses",
              "Consider adjusting camera position for better eye level alignment",
            ],
          },
        })
      }
    } catch (error) {
      setError("Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case "strong hire":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "hire":
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case "no hire":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case "strong hire":
        return "bg-green-100 text-green-800 border-green-200"
      case "hire":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "no hire":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading report...</div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || "Report not found"}</div>
          <Link href="/reports">
            <Button variant="outline">Back to Reports</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Interview Report</h1>
          <p className="text-gray-600 mt-1">Detailed analysis and scoring</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Candidate Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">{report.candidate.name}</CardTitle>
                <CardDescription>{report.candidate.email}</CardDescription>
              </div>
            </div>
            <Badge className={`${getRecommendationColor(report.recommendation)} border`}>
              <div className="flex items-center gap-1">
                {getRecommendationIcon(report.recommendation)}
                {report.recommendation}
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{new Date(report.interview_details.date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{report.interview_details.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{report.interview_details.type} Interview</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Score */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(report.scores.overall)}`}>
              {report.scores.overall}%
            </div>
            <Progress value={report.scores.overall} className="h-3 max-w-xs mx-auto" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-semibold ${getScoreColor(report.scores.technical)}`}>
                {report.scores.technical}%
              </div>
              <div className="text-sm text-gray-600">Technical</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-semibold ${getScoreColor(report.scores.communication)}`}>
                {report.scores.communication}%
              </div>
              <div className="text-sm text-gray-600">Communication</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-semibold ${getScoreColor(report.scores.problem_solving)}`}>
                {report.scores.problem_solving}%
              </div>
              <div className="text-sm text-gray-600">Problem Solving</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-semibold ${getScoreColor(report.scores.cultural_fit)}`}>
                {report.scores.cultural_fit}%
              </div>
              <div className="text-sm text-gray-600">Cultural Fit</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Interview Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Questions and Responses */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Questions & Responses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {report.questions_and_responses.map((qa, index) => (
              <div key={index}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                  <Badge variant="outline" className={getScoreColor(qa.score)}>
                    {qa.score}%
                  </Badge>
                </div>
                <p className="text-gray-700 mb-3 italic">"{qa.question}"</p>
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-gray-800">{qa.response}</p>
                </div>
                <p className="text-sm text-gray-600">{qa.feedback}</p>
                {index < report.questions_and_responses.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facial Gazing Analysis */}
      <GazingSummary data={report.gazingAnalysis} />

      {/* Strengths and Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-700">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.areas_for_improvement.map((area, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
