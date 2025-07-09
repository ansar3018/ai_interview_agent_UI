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
import { FaceTracker, RealTimeFaceTrackingCard } from "@/components/facial-gazing/face-tracker"

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

  const [gazingMetrics, setGazingMetrics] = useState({
    eyeContact: 0,
    blinkRate: 0,
    attentionScore: 0,
    eyesDetected: false,
    facingCamera: false,
  })
  const [gazingEnabled, setGazingEnabled] = useState(true)
  const [trackingOn, setTrackingOn] = useState(true)
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'working' | 'not-working'>('unknown')
  const [videoReady, setVideoReady] = useState(false)

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

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("ConductInterviewPage: rendering FaceTracker", {
      isActive: isVideoEnabled,
      hasVideo: !!videoRef.current
    });
    if (!videoRef.current) {
      // eslint-disable-next-line no-console
      console.warn("ConductInterviewPage: videoRef.current is null at FaceTracker mount");
    }
  }, [isVideoEnabled, videoRef.current])

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100 p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6 shadow-lg rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-900 drop-shadow-lg">Live Interview</h1>
            <p className="text-lg text-gray-600 font-medium">{session.position}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1 text-base px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Clock className="h-4 w-4" />
              {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, "0")}
            </Badge>
            <Badge className="bg-green-100 text-green-800 text-base px-4 py-2 rounded-xl">Live</Badge>
          </div>
        </div>
        <Progress value={(session.currentQuestion / session.totalQuestions) * 100} className="h-3 rounded-full bg-indigo-200" />
        <p className="text-md text-gray-500 mt-1 font-medium">
          Question {session.currentQuestion + 1} of {session.totalQuestions}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Feed */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-white/70 backdrop-blur-lg shadow-2xl border-0 ring-1 ring-indigo-100 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900 drop-shadow-lg text-2xl font-bold">
                  <User className="h-6 w-6" />
                  Candidate Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video border-2 border-indigo-100 shadow-xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-cover rounded-xl"
                    onLoadedMetadata={() => setVideoReady(true)}
                  />

                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex items-center justify-center">
                      <VideoOff className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                    <Button size="lg" variant={isVideoEnabled ? "secondary" : "destructive"} onClick={() => toggleVideo()} className="rounded-full shadow-md px-6 py-2 text-lg">
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>

                    <Button size="lg" variant={isAudioEnabled ? "secondary" : "destructive"} onClick={() => toggleAudio()} className="rounded-full shadow-md px-6 py-2 text-lg">
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Real-Time Face Tracking Card above current question, only if session is in progress */}
            {session && session.status === "in_progress" && videoReady && videoRef.current && (
              <FaceTracker
                videoRef={videoRef}
                isActive={isVideoEnabled}
                onMetricsUpdate={setGazingMetrics}
              />
            )}
            {interviewStarted && gazingEnabled && gazingMetrics && (
              <RealTimeFaceTrackingCard metrics={gazingMetrics} />
            )}
          </div>
          {/* Interview Control */}
          <div className="lg:col-span-1 space-y-8">
            {/* Start Interview */}
            {!interviewStarted && (
              <Card className="border-green-200 bg-green-50 shadow-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-green-800 text-xl font-bold">Ready to Start?</CardTitle>
                  <CardDescription className="text-base">Click the button below to begin your interview</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={startInterview} className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 rounded-xl">
                    Start Interview
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Current Question */}
            {interviewStarted && (
              <Card className="shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900 text-xl font-bold">
                    <MessageSquare className="h-6 w-6" />
                    Current Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-lg font-semibold text-gray-900 bg-indigo-50 rounded-lg p-4 shadow-sm">{session.questions[session.currentQuestion]}</p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="md"
                        onClick={() => speakQuestion(session.questions[session.currentQuestion])}
                        disabled={isSpeaking}
                        variant="outline"
                        className="rounded-lg px-4 py-2 text-base"
                      >
                        {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        {isSpeaking ? "Speaking..." : "Repeat Question"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Response Capture */}
            {interviewStarted && (
              <Card className="shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg font-bold">
                    Response
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <Badge variant="secondary" className="animate-pulse text-base px-3 py-1 rounded-xl">
                          <Mic className="h-4 w-4 mr-1" />
                          Listening...
                        </Badge>
                      )}
                      {microphoneStatus !== 'unknown' && (
                        <Badge 
                          variant={microphoneStatus === 'working' ? 'default' : 'destructive'}
                          className="text-base px-3 py-1 rounded-xl"
                        >
                          <Mic className="h-4 w-4 mr-1" />
                          {microphoneStatus === 'working' ? 'Mic OK' : 'Mic Issue'}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isListening
                      ? "Speak clearly into your microphone..."
                      : "Click 'Start Recording' to record your response"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="min-h-24 p-4 bg-gray-50 rounded-xl border shadow-sm">
                      {currentResponse ? (
                        <p className="text-base text-gray-800 font-medium">{currentResponse}</p>
                      ) : (
                        <p className="text-base text-gray-500 italic">
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
                          className="w-full min-h-24 p-4 border rounded-xl resize-none text-base shadow-sm"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="md"
                            onClick={() => {
                              if (textInput.trim()) {
                                nextQuestion(textInput.trim())
                              }
                            }}
                            disabled={!textInput.trim()}
                            className="rounded-lg px-4 py-2 text-base"
                          >
                            Submit Response
                          </Button>
                          {speechRecognitionSupported && (
                            <Button
                              size="md"
                              variant="outline"
                              onClick={() => {
                                setShowTextInput(false)
                                setTextInput("")
                                setCurrentResponse("")
                              }}
                              className="rounded-lg px-4 py-2 text-base"
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
                            size="md"
                            onClick={startListening}
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                            disabled={isSpeaking}
                          >
                            <Play className="h-4 w-4" />
                            Start Recording
                          </Button>
                        ) : (
                          <Button
                            size="md"
                            onClick={stopListening}
                            variant="destructive"
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                          >
                            <Square className="h-4 w-4" />
                            Stop Recording
                          </Button>
                        )}

                        {currentResponse && (
                          <Button
                            size="md"
                            onClick={() => nextQuestion(currentResponse)}
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                          >
                            Next →
                          </Button>
                        )}

                        <Button
                          size="md"
                          variant="outline"
                          onClick={() => setShowTextInput(true)}
                          className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                        >
                          Type Instead
                        </Button>

                        {/* <Button
                          size="md"
                          variant="outline"
                          onClick={testMicrophone}
                          className="flex items-center gap-1 rounded-lg px-4 py-2 textbase"
                        >
                          <Mic className="h-4 w-4" />
                          Test Mic
                        </Button> */}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Real-Time Face Tracking Card above current question, only if session is in progress */}
            {/* Only show in main section, not here in sidebar */}

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
