"use client"

import React from "react"
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
import { apiClient } from "@/lib/api"
import { FeedbackDialog } from "@/components/ui/feedback-dialog";

interface DetailedReport {
  interview_id: string
  candidate_id?: string
  candidate?: {
    name: string
    email: string
    position: string
  }
  position?: string
  interview_details?: {
    date: string
    duration: number
    type: string
  }
  scores?: {
    overall: number
    technical: number
    communication: number
    problem_solving: number
    cultural_fit: number
    malpractice?: number
  }
  questions_and_responses?: Array<{
    question: string
    response: string
    score: number
    feedback: string
  }>
  recommendation?: string
  summary?: string
  strengths?: string[]
  areas_for_improvement?: string[]
  gazingAnalysis?: {
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
      const data = await apiClient.getInterviewReport(params.id as string)
      console.log("Report data:", data) // Debug log
      setReport(data as DetailedReport)
    } catch (error) {
      console.error("Failed to fetch report:", error)
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

  // Safe access to nested properties
  const candidateName = report.candidate?.name || "Unknown Candidate"
  const candidateEmail = report.candidate?.email || "No email provided"
  const position = report.candidate?.position || report.position || "Unknown Position"
  const recommendation = report.recommendation || "No recommendation"
  const scores = report.scores || { overall: 0, technical: 0, communication: 0, problem_solving: 0, cultural_fit: 0 }
  const interviewDetails = report.interview_details || { date: new Date().toISOString(), duration: 0, type: "Technical" }
  const questionsAndResponses = report.questions_and_responses || []
  const summary = report.summary || "No summary available"
  const strengths = report.strengths || []
  const areasForImprovement = report.areas_for_improvement || []

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
                  <CardTitle className="text-xl">{candidateName}</CardTitle>
                  <CardDescription>{candidateEmail}</CardDescription>
                </div>
              </div>
              <Badge className={`${getRecommendationColor(recommendation)} border`}>
                <div className="flex items-center gap-1">
                  {getRecommendationIcon(recommendation)}
                  {recommendation}
                </div>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{new Date(interviewDetails.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{interviewDetails.duration} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{interviewDetails.type} Interview</span>
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
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(scores.overall)}`}>
                {scores.overall}%
              </div>
              <Progress value={scores.overall} className="h-3 max-w-xs mx-auto" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-semibold ${getScoreColor(scores.technical)}`}>
                  {scores.technical}%
                </div>
                <div className="text-sm text-gray-600">Technical</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-semibold ${getScoreColor(scores.communication)}`}>
                  {scores.communication}%
                </div>
                <div className="text-sm text-gray-600">Communication</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-semibold ${getScoreColor(scores.problem_solving)}`}>
                  {scores.problem_solving}%
                </div>
                <div className="text-sm text-gray-600">Problem Solving</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-semibold ${getScoreColor(scores.cultural_fit)}`}>
                  {scores.cultural_fit}%
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
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </CardContent>
        </Card>

        {/* Questions and Responses */}
        {questionsAndResponses.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Questions & Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {questionsAndResponses.map((qa, index) => (
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
                    {index < questionsAndResponses.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Facial Gazing Analysis */}
        {report.gazingAnalysis && (
          <GazingSummary data={{
            attentionScore: report.gazingAnalysis.averageAttentionScore ?? 0,
            eyeContact: report.gazingAnalysis.totalEyeContactTime ?? 0,
            engagementLevel: report.gazingAnalysis.engagementLevel ?? "N/A",
            recommendations: report.gazingAnalysis.recommendations ?? [],
          }} />
        )}

        {/* Strengths and Areas for Improvement */}
        {(strengths.length > 0 || areasForImprovement.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strengths.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700">Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {areasForImprovement.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-700">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {areasForImprovement.map((area, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Floating Feedback Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <FeedbackDialog />
      </div>
    </div>
  )
}
