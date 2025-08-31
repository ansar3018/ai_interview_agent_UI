"use client"
import React from 'react';

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, ArrowLeft, User } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api"

interface Candidate {
  id: string
  name: string
  email: string | null
}

export default function NewInterviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [formData, setFormData] = useState({
    candidate_id: "",
    position: "",
    interview_type: "technical",
    scheduled_at: "",
    questions: [] as string[],
  })
  const [customQuestions, setCustomQuestions] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchCandidates()

    // Pre-select candidate if provided in URL
    const candidateId = searchParams.get("candidate")
    if (candidateId) {
      setFormData((prev) => ({ ...prev, candidate_id: candidateId }))
    }
  }, [searchParams])

  const fetchCandidates = async () => {
    try {
      const data = await apiClient.getCandidates()
      setCandidates(data)
    } catch (error) {
      console.error("Failed to fetch candidates:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const questions = customQuestions
        .split("\n")
        .filter((q) => q.trim())
        .map((q) => q.trim())

      await apiClient.createInterview({
        candidate_id: formData.candidate_id,
        position: formData.position,
        interview_type: formData.interview_type,
        scheduled_at: formData.scheduled_at,
        questions,
      })

      setSuccess("Interview scheduled successfully!")

      setTimeout(() => {
        router.push(`/interviews/${interview.id}`)
      }, 2000)
    } catch (error) {
      setError("Failed to schedule interview. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/interviews">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Interview</h1>
          <p className="text-gray-600 mt-1">Create a new interview session</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Interview Details
          </CardTitle>
          <CardDescription>Set up the interview parameters and schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="candidate">Candidate *</Label>
              <Select
                value={formData.candidate_id}
                onValueChange={(value) => setFormData({ ...formData, candidate_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{candidate.name}</span>
                        {candidate.email && <span className="text-sm text-gray-500">({candidate.email})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                type="text"
                placeholder="e.g., Senior Software Engineer"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_type">Interview Type</Label>
              <Select
                value={formData.interview_type}
                onValueChange={(value) => setFormData({ ...formData, interview_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="cultural">Cultural Fit</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Scheduled Date & Time (Optional)</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                min={getMinDateTime()}
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-gray-500">Leave empty to start immediately, or schedule for later</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questions">Custom Questions (Optional)</Label>
              <Textarea
                id="questions"
                placeholder="Enter custom questions, one per line..."
                value={customQuestions}
                onChange={(e) => setCustomQuestions(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-gray-500">AI will generate questions if none provided</p>
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/interviews" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData.candidate_id || !formData.position}
              >
                {loading ? "Scheduling..." : "Schedule Interview"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
