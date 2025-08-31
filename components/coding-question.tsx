"use client"
import React from 'react';

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Code, CheckCircle, XCircle } from "lucide-react"
import CodeEditor from "./code-editor"
import { apiClient } from "@/lib/api"

interface CodingQuestionProps {
  interviewId: string
  question: string
  position: string
  onComplete: (feedback: any) => void
  onSkip: () => void
}

export default function CodingQuestion({
  interviewId,
  question,
  position,
  onComplete,
  onSkip
}: CodingQuestionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const handleSubmitSolution = async (code: string) => {
    setIsSubmitting(true)
    
    try {
      // Extract the expected approach from the question if available
      let expectedApproach = ""
      try {
        const questionData = JSON.parse(question)
        expectedApproach = questionData.expected_approach || ""
      } catch {
        expectedApproach = "Standard algorithmic approach"
      }

      // Evaluate the coding solution
      const evaluation = await apiClient.evaluateCodingSolution({
        interview_id: interviewId,
        question: question,
        solution: code,
        expected_approach: expectedApproach,
        position: position
      })

      setFeedback(evaluation)
      setShowFeedback(true)
      
      // Auto-complete after showing feedback
      setTimeout(() => {
        onComplete(evaluation)
      }, 3000)

    } catch (error) {
      console.error("Error evaluating coding solution:", error)
      // Fallback completion
      onComplete({
        score: 50,
        feedback: "Solution submitted successfully",
        strengths: ["Code submitted"],
        improvements: ["Evaluation pending"]
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Code className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Technical Assessment
              </CardTitle>
              <CardDescription className="text-gray-600">
                Let's evaluate your coding skills for the {position} position
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Code Editor */}
      <CodeEditor
        question={question}
        language="javascript"
        onSubmit={handleSubmitSolution}
        onSkip={handleSkip}
        timeLimit={30}
        isSubmitting={isSubmitting}
      />

      {/* Feedback Display */}
      {showFeedback && feedback && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                Evaluation Complete
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {feedback.score}/100
                  </div>
                  <div className="text-sm text-gray-500">Score</div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${feedback.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Evaluation Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Correctness</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {feedback.correctness}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Efficiency</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {feedback.efficiency}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-600">Code Quality</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {feedback.code_quality}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">AI Feedback:</h4>
                <p className="text-blue-800">{feedback.feedback}</p>
              </div>

              {/* Strengths */}
              {feedback.strengths && feedback.strengths.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Strengths:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {feedback.strengths.map((strength: string, index: number) => (
                      <li key={index} className="text-green-800">{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements && feedback.improvements.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">Areas for Improvement:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {feedback.improvements.map((improvement: string, index: number) => (
                      <li key={index} className="text-yellow-800">{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optimizations */}
              {feedback.suggested_optimizations && feedback.suggested_optimizations.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Suggested Optimizations:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {feedback.suggested_optimizations.map((optimization: string, index: number) => (
                      <li key={index} className="text-purple-800">{optimization}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isSubmitting && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Evaluating your solution...
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 
