"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Video, VideoOff, Mic, MicOff, Play, Square, Volume2, VolumeX, Clock, User, MessageSquare } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

interface InterviewSession {
  id: string
  candidate_id: string
  position: string
  status: string
  currentQuestion: number
  totalQuestions: number
  questions: string[]
  responses: string[]
  isRecording: boolean
  startTime: Date | null
  duration: number
}

export default function ConductInterviewPage() {
  const params = useParams()
  const router = useRouter()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true)
  const [responseCaptured, setResponseCaptured] = useState(false)
  const latestTranscript = useRef("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechRecognitionRef = useRef<any>(null)

  useEffect(() => {
    initializeInterview()
    setupMediaDevices()
    setupSpeechRecognition()

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (isListening && currentResponse.trim() && autoAdvanceEnabled) {
      // Clear existing timer
      // Set new timer for 3 seconds of silence
      const timer = setTimeout(() => {
        if (currentResponse.trim()) {
          stopListening()
          // Auto advance after 2 more seconds
          setTimeout(() => {
            nextQuestion()
          }, 2000)
        }
      }, 3000)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [currentResponse, isListening, autoAdvanceEnabled])

  const initializeInterview = async () => {
    try {
      // Start the interview
      // const response = await fetch(`/api/v1/interviews/${params.id}/start`, {
      //   method: "POST",
      // })

      // if (!response.ok) {
      //   throw new Error("Failed to start interview")
      // }

      // Initialize session with mock data (replace with actual API data)
      setSession({
        id: params.id as string,
        candidate_id: "candidate-123",
        position: "Software Engineer",
        status: "in_progress",
        currentQuestion: 0,
        totalQuestions: 3,
        questions: [
          "Tell me about yourself and your background in software development.",
          "Describe a challenging technical problem you've solved recently.",
          "How do you approach debugging complex issues in your code?",
        ],
        responses: [],
        isRecording: false,
        startTime: new Date(),
        duration: 0,
      })

      setLoading(false)
    } catch (error) {
      setError("Failed to initialize interview")
      setLoading(false)
    }
  }

  const setupMediaDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      mediaStreamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Failed to access media devices:", error)
      setError("Failed to access camera/microphone")
    }
  }

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser')
      return
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    speechRecognitionRef.current = new SpeechRecognition()
    speechRecognitionRef.current.continuous = false
    speechRecognitionRef.current.interimResults = true
    speechRecognitionRef.current.lang = 'en-US'
    speechRecognitionRef.current.maxAlternatives = 1

    speechRecognitionRef.current.onstart = () => {
      setIsListening(true)
      setResponseCaptured(false)
      latestTranscript.current = ""
      setCurrentResponse("")
      setError("")
      console.log("Speech recognition started")
    }

    speechRecognitionRef.current.onresult = (event: any) => {
      let transcript = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      latestTranscript.current += transcript
      setCurrentResponse(latestTranscript.current.trim())
      console.log("Interim/Final transcript:", transcript)
    }

    speechRecognitionRef.current.onend = () => {
      setIsListening(false)
      setResponseCaptured(true)
      setCurrentResponse(latestTranscript.current.trim())
      console.log("Speech recognition ended. Final transcript:", latestTranscript.current.trim())
      if (autoAdvanceEnabled && latestTranscript.current.trim()) {
        nextQuestion(latestTranscript.current.trim())
      }
    }

    speechRecognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error event:", event)
      if (event.error === "not-allowed" || event.error === "denied") {
        setError("Microphone permission denied. Please allow access and try again.")
      } else if (event.error === "audio-capture") {
        setError("No microphone found or it is in use by another application.")
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try speaking again.")
      } else {
        setError("Speech recognition error: " + event.error)
      }
      setIsListening(false)
    }
  }

  const speakQuestion = (question: string) => {
    if ("speechSynthesis" in window) {
      setIsSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(question)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onend = () => {
        setIsSpeaking(false)
        startListening()
      }

      speechSynthesisRef.current = utterance
      speechSynthesis.speak(utterance)
    }
  }

  const startListening = () => {
    if (!speechRecognitionRef.current) {
      setError("Speech recognition is not initialized or not supported.")
      return
    }
    if (!isListening) {
      setError("")
      setResponseCaptured(false)
      latestTranscript.current = ""
      setCurrentResponse("")
      try {
        speechRecognitionRef.current.start()
      } catch (error) {
        setError("Failed to start speech recognition. Please try again.")
        setIsListening(false)
      }
    }
  }

  const stopListening = () => {
    if (speechRecognitionRef.current && isListening) {
      try {
        speechRecognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        setError("Failed to stop speech recognition.")
      }
    }
  }

  const nextQuestion = (responseOverride?: string) => {
    if (!session) return
    const responseToSave = responseOverride !== undefined ? responseOverride : currentResponse
    const updatedResponses = [...session.responses, responseToSave]
    if (session.currentQuestion < session.totalQuestions - 1) {
      const updatedSession = {
        ...session,
        currentQuestion: session.currentQuestion + 1,
        responses: updatedResponses,
      }
      setSession(updatedSession)
      setCurrentResponse("")
      setResponseCaptured(false)
      latestTranscript.current = ""
      setTimeout(() => {
        speakQuestion(updatedSession.questions[updatedSession.currentQuestion])
      }, 1000)
    } else {
      endInterview(updatedResponses)
    }
  }

  const endInterview = async (finalResponses: string[]) => {
    try {
      await fetch(`/api/v1/interviews/${params.id}/end`, {
        method: "POST",
      })

      cleanup()
      router.push(`/reports/${params.id}`)
    } catch (error) {
      setError("Failed to end interview")
    }
  }

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (speechSynthesisRef.current) {
      speechSynthesis.cancel()
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }
  }

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const restartListening = () => {
    if (speechRecognitionRef.current) {
      stopListening()
      setTimeout(() => {
        startListening()
      }, 500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Initializing interview...</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error || "Failed to load interview"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Live Interview</h1>
              <p className="text-gray-600">{session.position}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, "0")}
              </Badge>
              <Badge className="bg-green-100 text-green-800">Live</Badge>
            </div>
          </div>

          <Progress value={(session.currentQuestion / session.totalQuestions) * 100} className="h-2" />
          <p className="text-sm text-gray-500 mt-1">
            Question {session.currentQuestion + 1} of {session.totalQuestions}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Candidate Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />

                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button size="sm" variant={isVideoEnabled ? "secondary" : "destructive"} onClick={toggleVideo}>
                      {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>

                    <Button size="sm" variant={isAudioEnabled ? "secondary" : "destructive"} onClick={toggleAudio}>
                      {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Control */}
          <div className="space-y-6">
            {/* Current Question */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Current Question
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-lg font-medium">{session.questions[session.currentQuestion]}</p>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => speakQuestion(session.questions[session.currentQuestion])}
                      disabled={isSpeaking}
                      variant="outline"
                    >
                      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {isSpeaking ? "Speaking..." : "Repeat Question"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Capture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Response
                  {isListening && (
                    <Badge variant="secondary" className="animate-pulse">
                      <Mic className="h-3 w-3 mr-1" />
                      Listening...
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {isListening
                    ? "Speak clearly into your microphone..."
                    : responseCaptured && currentResponse.trim()
                    ? "Response captured."
                    : "Click start to begin recording your response"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="min-h-24 p-3 bg-gray-50 rounded-lg border">
                    {currentResponse ? (
                      <p className="text-sm text-gray-800">{currentResponse}</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        {isListening ? "Listening... speak now" : "Response will appear here..."}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isListening && !responseCaptured ? (
                      <Button size="sm" onClick={startListening} className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        Start Recording
                      </Button>
                    ) : isListening ? (
                      <Button
                        size="sm"
                        onClick={stopListening}
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <Square className="h-3 w-3" />
                        Stop Recording
                      </Button>
                    ) : null}
                    {responseCaptured && currentResponse && (
                      <Button size="sm" onClick={nextQuestion} className="flex items-center gap-1">
                        Next →
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id="autoAdvance"
                checked={autoAdvanceEnabled}
                onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoAdvance" className="text-gray-600">
                Auto-advance after response
              </label>
            </div>
            {/* Navigation */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button onClick={nextQuestion} className="w-full" disabled={!currentResponse.trim()}>
                    {session.currentQuestion < session.totalQuestions - 1 ? "Next Question" : "Complete Interview"}
                  </Button>

                  <Button onClick={() => endInterview(session.responses)} variant="outline" className="w-full">
                    End Interview Early
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
