"use client"
import React from 'react';

import { useState, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, RotateCcw, Download, Upload } from "lucide-react"

interface CodeEditorProps {
  question: string
  language?: string
  onSubmit: (code: string) => void
  onSkip?: () => void
  timeLimit?: number // in minutes
  isSubmitting?: boolean
}

interface CodeExample {
  input: string
  output: string
}

interface CodeQuestion {
  question: string
  examples: CodeExample[]
  constraints: string[]
  hints: string[]
  expected_approach: string
  time_limit: string
}

// Supported programming languages
const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript", icon: "⚡" },
  { value: "typescript", label: "TypeScript", icon: "🔷" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚙️" },
  { value: "c", label: "C", icon: "🔧" },
  { value: "csharp", label: "C#", icon: "💎" },
  { value: "go", label: "Go", icon: "🐹" },
  { value: "rust", label: "Rust", icon: "🦀" },
  { value: "php", label: "PHP", icon: "🐘" },
  { value: "ruby", label: "Ruby", icon: "💎" },
  { value: "swift", label: "Swift", icon: "🍎" },
  { value: "kotlin", label: "Kotlin", icon: "🔶" },
  { value: "scala", label: "Scala", icon: "🔴" },
  { value: "sql", label: "SQL", icon: "🗄️" },
  { value: "html", label: "HTML", icon: "🌐" },
  { value: "css", label: "CSS", icon: "🎨" },
  { value: "json", label: "JSON", icon: "📄" },
  { value: "yaml", label: "YAML", icon: "📋" },
  { value: "markdown", label: "Markdown", icon: "📝" },
]

export default function CodeEditor({
  question,
  language = "javascript",
  onSubmit,
  onSkip,
  timeLimit = 30,
  isSubmitting = false
}: CodeEditorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [code, setCode] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60) // Convert to seconds
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const editorRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Parse the question to extract structured data
  const parseQuestion = (): CodeQuestion | null => {
    try {
      // Try to parse as JSON if it's structured
      if (question.includes('"question"') && question.includes('"examples"')) {
        const startIndex = question.indexOf('{')
        const endIndex = question.lastIndexOf('}') + 1
        if (startIndex !== -1 && endIndex !== -1) {
          const jsonStr = question.substring(startIndex, endIndex)
          return JSON.parse(jsonStr)
        }
      }
      
      // Fallback to simple text parsing
      return {
        question: question,
        examples: [],
        constraints: [],
        hints: [],
        expected_approach: "",
        time_limit: `${timeLimit} minutes`
      }
    } catch (error) {
      console.error("Error parsing question:", error)
      return {
        question: question,
        examples: [],
        constraints: [],
        hints: [],
        expected_approach: "",
        time_limit: `${timeLimit} minutes`
      }
    }
  }

  const parsedQuestion = parseQuestion()

  // Timer countdown
  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          // Auto-submit when time runs out
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Stop timer
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle code execution (basic JavaScript execution)
  const handleRunCode = () => {
    setIsRunning(true)
    setError("")
    setOutput("")

    try {
      // Create a safe execution environment
      const safeEval = new Function(`
        let output = [];
        const console = {
          log: (...args) => output.push(args.join(' ')),
          error: (...args) => output.push('ERROR: ' + args.join(' ')),
          warn: (...args) => output.push('WARN: ' + args.join(' '))
        };
        ${code}
        return output.join('\\n');
      `)

      const result = safeEval()
      setOutput(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsRunning(false)
    }
  }

  // Handle code submission
  const handleSubmit = () => {
    stopTimer()
    onSubmit(code)
  }

  // Handle skip
  const handleSkip = () => {
    stopTimer()
    onSkip?.()
  }

  // Start timer when component mounts
  useState(() => {
    startTimer()
    return () => stopTimer()
  })

  // Get current language info
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.value === selectedLanguage) || SUPPORTED_LANGUAGES[0]

  return (
    <div className="space-y-6">
      {/* Question Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Coding Challenge
              </CardTitle>
              <CardDescription className="text-gray-600">
                Solve the problem below using your preferred language
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                ⏱️ {formatTime(timeRemaining)}
              </Badge>
              
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Language:</span>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{currentLanguage.icon}</span>
                        <span>{currentLanguage.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <div className="flex items-center gap-2">
                          <span>{lang.icon}</span>
                          <span>{lang.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Problem Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Problem:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {parsedQuestion?.question || question}
              </p>
            </div>

            {/* Examples */}
            {parsedQuestion?.examples && parsedQuestion.examples.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Examples:</h3>
                <div className="space-y-2">
                  {parsedQuestion.examples.map((example, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">Input:</span> {example.input}
                      <br />
                      <span className="font-medium">Output:</span> {example.output}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {parsedQuestion?.constraints && parsedQuestion.constraints.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Constraints:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parsedQuestion.constraints.map((constraint, index) => (
                    <li key={index} className="text-yellow-800">{constraint}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints */}
            {parsedQuestion?.hints && parsedQuestion.hints.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Hints:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {parsedQuestion.hints.map((hint, index) => (
                    <li key={index} className="text-green-800">{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code Editor */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Your Solution
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunCode}
                disabled={isRunning || !code.trim()}
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Run
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCode("")}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="400px"
              language={selectedLanguage}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
              }}
              onMount={(editor) => {
                editorRef.current = editor
                editor.focus()
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Output Panel */}
      {(output || error) && (
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm min-h-[100px]">
              {error ? (
                <div className="text-red-400">{error}</div>
              ) : (
                <div className="whitespace-pre-wrap">{output}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex items-center gap-1"
          >
            Skip Question
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !code.trim()}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
          >
            Submit Solution
          </Button>
        </div>
      </div>

      {/* Time Warning */}
      {timeRemaining <= 300 && timeRemaining > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            ⚠️ Time is running out! You have {formatTime(timeRemaining)} remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-submit warning */}
      {timeRemaining === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            ⏰ Time's up! Your solution has been automatically submitted.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 
