"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Square,
  Volume2,
  VolumeX,
  Clock,
  User,
  MessageSquare,
  Eye,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { FaceTracker } from "@/components/facial-gazing/face-tracker"

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
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInput, setTextInput] = useState("")

  const [gazingMetrics, setGazingMetrics] = useState<any>(null)
  const [gazingEnabled, setGazingEnabled] = useState(true)
  const [trackingOn, setTrackingOn] = useState(true)
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'working' | 'not-working'>('unknown')

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const currentTranscript = useRef("")
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    initializeInterview()
    setupMediaDevices()
    checkSpeechRecognitionSupport()

    return () => {
      cleanup()
    }
  }, [])

  const initializeInterview = async () => {
    try {
      // Mock API call - replace with actual API
      // const response = await fetch(`/api/v1/interviews/${params.id}/start`, {
      //   method: "POST",
      // })
      // if (!response.ok) {
      //   throw new Error("Failed to start interview")
      // }

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
      // First check if we have microphone permissions
      const permissions = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      
      if (permissions.state === 'denied') {
        setError("Microphone permission denied. Please allow microphone access in your browser settings.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      })

      mediaStreamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Test microphone audio levels
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(dataArray)
      
      // Check if we're getting audio input
      const audioLevel = dataArray.reduce((a, b) => a + b) / dataArray.length
      console.log("Audio level detected:", audioLevel)
      
      if (audioLevel < 10) {
        console.warn("Low audio level detected - microphone may not be working properly")
      }

      // Run microphone test
      setTimeout(() => {
        testMicrophone()
      }, 1000)

    } catch (error) {
      console.error("Failed to access media devices:", error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError("Microphone permission denied. Please allow microphone access and refresh the page.")
        } else if (error.name === 'NotFoundError') {
          setError("No microphone found. Please check your microphone and try again.")
        } else {
          setError("Failed to access camera/microphone. Please check your permissions and refresh the page.")
        }
      } else {
        setError("Failed to access camera/microphone. Please allow permissions and refresh the page.")
      }
    }
  }

  const testMicrophone = async () => {
    try {
      setMicrophoneStatus('unknown')
      
      if (!mediaStreamRef.current) {
        setMicrophoneStatus('not-working')
        return
      }

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      let audioDetected = false
      let testDuration = 0
      const maxTestDuration = 3000 // 3 seconds
      
      const testInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        
        if (average > 5) {
          audioDetected = true
        }
        
        testDuration += 100
        
        if (testDuration >= maxTestDuration) {
          clearInterval(testInterval)
          audioContext.close()
          
          if (audioDetected) {
            setMicrophoneStatus('working')
            console.log("Microphone test passed")
          } else {
            setMicrophoneStatus('not-working')
            console.warn("Microphone test failed - no audio detected")
          }
        }
      }, 100)
      
    } catch (error) {
      console.error("Microphone test failed:", error)
      setMicrophoneStatus('not-working')
    }
  }

  const checkSpeechRecognitionSupport = () => {
    const isSupported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window
    setSpeechRecognitionSupported(isSupported)

    if (!isSupported) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
    }
  }

  const createSpeechRecognition = () => {
    if (!speechRecognitionSupported) {
      setError("Speech recognition is not supported in this browser")
      return null
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    // Add these properties to improve reliability
    recognition.serviceURI = ""
    recognition.grammars = null

    recognition.onstart = () => {
      console.log("Speech recognition started")
      setIsListening(true)
      setError("")
      currentTranscript.current = ""

      // Set a longer timeout to prevent premature "no-speech" errors
      setTimeout(() => {
        if (isListening && !currentTranscript.current.trim()) {
          console.log("No speech detected after 10 seconds, but continuing to listen...")
        }
      }, 10000)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        currentTranscript.current += " " + finalTranscript
        setCurrentResponse(currentTranscript.current.trim())

        // Reset silence timer when we get speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }

        // Set new silence timer if auto-advance is enabled
        if (autoAdvanceEnabled) {
          silenceTimeoutRef.current = setTimeout(() => {
            stopListening()
            setTimeout(() => {
              if (currentTranscript.current.trim()) {
                nextQuestion(currentTranscript.current.trim())
              }
            }, 1000)
          }, 4000) // Increased to 4 seconds
        }
      }

      // Show interim results
      if (interimTranscript && !finalTranscript) {
        const tempTranscript = currentTranscript.current + " " + interimTranscript
        setCurrentResponse(tempTranscript.trim())
      }
    }

    recognition.onend = () => {
      console.log("Speech recognition ended")
      setIsListening(false)

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }

      // If we have some transcript, don't show error
      if (currentTranscript.current.trim()) {
        console.log("Recognition ended with transcript:", currentTranscript.current)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setIsListening(false)

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }

      switch (event.error) {
        case "not-allowed":
        case "denied":
          setError("Microphone permission denied. Please allow microphone access and try again.")
          break
        case "audio-capture":
          setError("No microphone found. Please check your microphone and try again.")
          break
        case "no-speech":
          // Don't show error immediately, give user a chance to try again
          if (currentTranscript.current.trim()) {
            console.log("No-speech error but we have transcript, ignoring")
            return
          }
          // Only show error if we've been trying for a while
          if (isListening) {
            setError("No speech detected. Please check your microphone and try speaking again.")
          }
          break
        case "network":
          setError("Network error. Please check your internet connection.")
          break
        case "aborted":
          // User manually stopped, don't show error
          console.log("Speech recognition was stopped by user")
          break
        default:
          setError(`Speech recognition error: ${event.error}. Please try again.`)
      }
    }

    return recognition
  }

  const speakQuestion = (question: string) => {
    if ("speechSynthesis" in window) {
      setIsSpeaking(true)
      setError("")

      const utterance = new SpeechSynthesisUtterance(question)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onend = () => {
        setIsSpeaking(false)
        console.log("TTS finished speaking")
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setError("Failed to speak question. Please try again.")
      }

      speechSynthesisRef.current = utterance
      speechSynthesis.speak(utterance)
    } else {
      setError("Text-to-speech is not supported in this browser")
    }
  }

  const startListening = () => {
    if (!speechRecognitionSupported) {
      setError("Speech recognition is not supported in this browser")
      return
    }

    if (isListening) {
      console.log("Already listening")
      return
    }

    // Check microphone permission first
    if (!mediaStreamRef.current) {
      setError("Please allow microphone access first")
      return
    }

    setError("")
    setCurrentResponse("")
    currentTranscript.current = ""

    const startRecognition = (retryCount = 0) => {
      try {
        const recognition = createSpeechRecognition()
        if (recognition) {
          speechRecognitionRef.current = recognition

          // Add a small delay to ensure microphone is ready
          setTimeout(() => {
            try {
              recognition.start()
            } catch (startError) {
              console.error("Failed to start recognition:", startError)
              
              // Retry up to 3 times
              if (retryCount < 3) {
                console.log(`Retrying speech recognition (attempt ${retryCount + 1})`)
                setTimeout(() => startRecognition(retryCount + 1), 1000)
              } else {
                setError("Failed to start speech recognition after multiple attempts. Please try again.")
                setIsListening(false)
              }
            }
          }, 100)
        }
      } catch (error) {
        console.error("Failed to create speech recognition:", error)
        
        // Retry up to 3 times
        if (retryCount < 3) {
          console.log(`Retrying speech recognition creation (attempt ${retryCount + 1})`)
          setTimeout(() => startRecognition(retryCount + 1), 1000)
        } else {
          setError("Failed to initialize speech recognition. Please try again.")
        }
      }
    }

    startRecognition()
  }

  const stopListening = () => {
    if (speechRecognitionRef.current && isListening) {
      try {
        speechRecognitionRef.current.stop()
        speechRecognitionRef.current = null
      } catch (error) {
        console.error("Failed to stop speech recognition:", error)
      }
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    setIsListening(false)
  }

  const startInterview = () => {
    setInterviewStarted(true)
    if (session) {
      speakQuestion(session.questions[0])
    }
  }

  const nextQuestion = (transcript: string) => {
    if (!session) return

    stopListening()

    const updatedResponses = [...session.responses, transcript]

    if (session.currentQuestion < session.totalQuestions - 1) {
      const updatedSession = {
        ...session,
        currentQuestion: session.currentQuestion + 1,
        responses: updatedResponses,
      }
      setSession(updatedSession)
      setCurrentResponse("")
      currentTranscript.current = ""

      setTimeout(() => {
        speakQuestion(updatedSession.questions[updatedSession.currentQuestion])
      }, 1000)
    } else {
      endInterview(updatedResponses)
    }
  }

  const endInterview = async (finalResponses: string[]) => {
    try {
      // await fetch(`/api/v1/interviews/${params.id}/end`, {
      //   method: "POST",
      // })

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
      speechRecognitionRef.current = null
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Initializing interview...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Failed to load interview session</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

                  {/* Add this after the video element and before the controls */}
                  {gazingEnabled && (
                    <FaceTracker videoRef={videoRef} isActive={interviewStarted} onMetricsUpdate={setGazingMetrics} />
                  )}

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
            {/* Start Interview */}
            {!interviewStarted && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-800">Ready to Start?</CardTitle>
                  <CardDescription>Click the button below to begin your interview</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={startInterview} className="w-full bg-green-600 hover:bg-green-700">
                    Start Interview
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Current Question */}
            {interviewStarted && (
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
            )}

            {/* Response Capture */}
            {interviewStarted && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Response
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <Badge variant="secondary" className="animate-pulse">
                          <Mic className="h-3 w-3 mr-1" />
                          Listening...
                        </Badge>
                      )}
                      {microphoneStatus !== 'unknown' && (
                        <Badge 
                          variant={microphoneStatus === 'working' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <Mic className="h-3 w-3 mr-1" />
                          {microphoneStatus === 'working' ? 'Mic OK' : 'Mic Issue'}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {isListening
                      ? "Speak clearly into your microphone..."
                      : "Click 'Start Recording' to record your response"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="min-h-24 p-3 bg-gray-50 rounded-lg border">
                      {currentResponse ? (
                        <p className="text-sm text-gray-800">{currentResponse}</p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          {isListening ? "Listening... speak now" : "Your response will appear here..."}
                        </p>
                      )}
                    </div>

                    {!speechRecognitionSupported || showTextInput ? (
                      <div className="space-y-2">
                        <textarea
                          value={textInput}
                          onChange={(e) => {
                            setTextInput(e.target.value)
                            setCurrentResponse(e.target.value)
                          }}
                          placeholder="Type your response here..."
                          className="w-full min-h-24 p-3 border rounded-lg resize-none"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (textInput.trim()) {
                                nextQuestion(textInput.trim())
                              }
                            }}
                            disabled={!textInput.trim()}
                          >
                            Submit Response
                          </Button>
                          {speechRecognitionSupported && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowTextInput(false)
                                setTextInput("")
                                setCurrentResponse("")
                              }}
                            >
                              Use Voice Instead
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!isListening ? (
                          <Button
                            size="sm"
                            onClick={startListening}
                            className="flex items-center gap-1"
                            disabled={isSpeaking}
                          >
                            <Play className="h-3 w-3" />
                            Start Recording
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={stopListening}
                            variant="destructive"
                            className="flex items-center gap-1"
                          >
                            <Square className="h-3 w-3" />
                            Stop Recording
                          </Button>
                        )}

                        {currentResponse && (
                          <Button
                            size="sm"
                            onClick={() => nextQuestion(currentResponse)}
                            className="flex items-center gap-1"
                          >
                            Next →
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowTextInput(true)}
                          className="flex items-center gap-1"
                        >
                          Type Instead
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={testMicrophone}
                          className="flex items-center gap-1"
                        >
                          <Mic className="h-3 w-3" />
                          Test Mic
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Facial Gazing Metrics */}
            {interviewStarted && gazingEnabled && gazingMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Live Gazing Analysis
                    </span>
                    <Badge variant={gazingMetrics.attentionScore >= 80 ? "default" : "secondary"}>
                      {gazingMetrics.attentionScore}% Attention
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Eye Contact:</span>
                      <span className="font-medium ml-1 text-green-600">{gazingMetrics.eyeContact}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Blink Rate:</span>
                      <span className="font-medium ml-1">{gazingMetrics.blinkRate}/min</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Badge variant={gazingMetrics.eyesDetected ? "default" : "destructive"} className="text-xs">
                      {gazingMetrics.eyesDetected ? "Eyes OK" : "No Eyes"}
                    </Badge>
                    <Badge variant={gazingMetrics.facingCamera ? "default" : "secondary"} className="text-xs">
                      {gazingMetrics.facingCamera ? "Facing Camera" : "Not Facing"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {interviewStarted && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="autoAdvance"
                    checked={autoAdvanceEnabled}
                    onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoAdvance" className="text-gray-600">
                    Auto-advance after 3 seconds of silence
                  </label>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="gazingEnabled"
                    checked={gazingEnabled}
                    onChange={(e) => setGazingEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="gazingEnabled" className="text-gray-600">
                    Enable facial gazing analysis
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            {interviewStarted && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      onClick={() => nextQuestion(currentResponse)}
                      className="w-full"
                      disabled={!currentResponse.trim()}
                    >
                      {session.currentQuestion < session.totalQuestions - 1 ? "Next Question" : "Complete Interview"}
                    </Button>

                    <Button onClick={() => endInterview(session.responses)} variant="outline" className="w-full">
                      End Interview Early
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
