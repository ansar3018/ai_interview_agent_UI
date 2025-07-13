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
  Code,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { FaceTracker } from "@/components/facial-gazing/face-tracker"
import { GazingSummary } from "@/components/facial-gazing/gazing-summary"
import CodeEditor from "@/components/code-editor"
import CodingQuestion from "@/components/coding-question"
import { apiClient } from "@/lib/api"

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
  const [resumeAnalysis, setResumeAnalysis] = useState<any>(null)
  const [questionWarning, setQuestionWarning] = useState<string | null>(null)
  const [questionsHistory, setQuestionsHistory] = useState<{ question: string, answer: string }[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<string>("")
  const [feedback, setFeedback] = useState<any>(null)
  const [isCodingQuestionMode, setIsCodingQuestionMode] = useState(false)

  const [gazingMetrics, setGazingMetrics] = useState({
    eyeContact: 0,
    blinks: 0,
    attentionScore: 0,
    eyesDetected: false,
    facingCamera: false,
  })
  const [gazingEnabled, setGazingEnabled] = useState(true)
  const [trackingOn, setTrackingOn] = useState(true)
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'working' | 'not-working'>('unknown')
  const [videoReady, setVideoReady] = useState(false)
  const [videoInitialized, setVideoInitialized] = useState(false)
  const metricsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (metricsTimeoutRef.current) clearTimeout(metricsTimeoutRef.current);
    }
  }, [])

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear memory when component unmounts
      if (session) {
        apiClient.clearConversationMemory(session.id).catch(error => {
          console.warn("Failed to clear conversation memory on unmount:", error);
        });
      }
    };
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("ConductInterviewPage: rendering FaceTracker", {
      isActive: isVideoEnabled,
      hasVideo: !!videoRef.current,
      videoReady,
      videoInitialized
    });
    if (!videoRef.current) {
      // eslint-disable-next-line no-console
      console.warn("ConductInterviewPage: videoRef.current is null at FaceTracker mount");
    }
  }, [isVideoEnabled, videoRef.current, videoReady, videoInitialized])

  // Monitor videoRef initialization
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current && !videoReady) {
      console.log("VideoRef is available but videoReady is false, setting up video");
      videoRef.current.srcObject = mediaStreamRef.current;
      setVideoReady(true);
    }
  }, [videoRef.current, mediaStreamRef.current, videoReady]);

  const initializeInterview = async () => {
    try {
      const interviewId = params.id as string;
      const interviewDetails = await apiClient.getInterviewDetails(interviewId) as any;
      const candidateId = interviewDetails.candidate_id;
      const position = interviewDetails.position || "Software Engineer";
      let analysis: any = null;
      try {
        analysis = await apiClient.getResumeAnalysis(candidateId);
        setResumeAnalysis(analysis);
      } catch (e) {
        setResumeAnalysis(null);
      }
      // Get the first question from backend
      const nextQ = await apiClient.getNextQuestion({
        interview_id: interviewId,
        resume: analysis,
        history: [],
        position,
      }) as any;
      setQuestionsHistory([])
      setCurrentQuestion(nextQ.nextQuestion)
      setSession({
        id: interviewId,
        candidate_id: candidateId,
        position,
        status: "in_progress",
        currentQuestion: 0,
        totalQuestions: 1, // will update as we go
        questions: [], // not used
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

      // Wait for videoRef to be available
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log("Video stream set, videoRef.current:", videoRef.current);
        // Set video as ready when srcObject is set
        setVideoReady(true)
      } else {
        console.warn("videoRef.current is null when trying to set srcObject");
        // Retry after a short delay
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            console.log("Video stream set on retry, videoRef.current:", videoRef.current);
            setVideoReady(true)
          }
        }, 100);
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
    // Clear any existing memory for this interview before starting
    if (session) {
      apiClient.clearConversationMemory(session.id).catch(error => {
        console.warn("Failed to clear conversation memory:", error);
      });
    }
    
    setInterviewStarted(true)
    speakQuestion(currentQuestion)
  }

  // Detect if a question is a coding question
  const isCodingQuestion = (question: string): boolean => {
    const codingKeywords = [
      "coding challenge", "technical assessment", "write a function",
      "programming problem", "algorithm", "data structure",
      "coding problem", "technical question", "programming challenge"
    ]
    
    const lowerQuestion = question.toLowerCase()
    return codingKeywords.some(keyword => lowerQuestion.includes(keyword))
  }

  const nextQuestion = async (transcript: string) => {
    if (!session) return
    stopListening()
    
    // Check if current question was a coding question
    if (isCodingQuestion(currentQuestion)) {
      // For coding questions, we don't need to process the transcript
      // The coding question component handles the submission
      console.log("Coding question completed")
      setIsCodingQuestionMode(false)
    } else {
      // Add Q&A to history for regular questions
      const updatedHistory = [...questionsHistory, { question: currentQuestion, answer: transcript }]
      setQuestionsHistory(updatedHistory)
      setCurrentResponse("")
      currentTranscript.current = ""
      
      // Optionally get feedback
      try {
        const feedbackRes = await apiClient.getFeedback({
          interview_id: session.id,
          question: currentQuestion,
          response: transcript,
          expected_keywords: [], // Optionally fill from resumeAnalysis
        })
        setFeedback(feedbackRes)
      } catch (e) {
        setFeedback(null)
      }
    }
    
    // Check if we've reached the maximum number of questions (fallback)
    const maxQuestions = 12
    if (questionsHistory.length >= maxQuestions) {
      console.log(`Interview completed after ${maxQuestions} questions (maximum limit)`)
      endInterview(questionsHistory.map(h => h.answer))
      return
    }
    
    // Get next question from backend
    const nextQ = await apiClient.getNextQuestion({
      interview_id: session.id,
      resume: resumeAnalysis,
      history: questionsHistory,
      position: session.position,
    }) as any
    
    // Check if the interview is complete
    if (nextQ.nextQuestion && nextQ.nextQuestion.startsWith("INTERVIEW_COMPLETE:")) {
      // Interview is complete
      console.log("Interview completed by AI agent")
      endInterview(questionsHistory.map(h => h.answer))
    } else if (nextQ.nextQuestion && !nextQ.nextQuestion.toLowerCase().includes("thank you for completing")) {
      const newQuestion = nextQ.nextQuestion
      setCurrentQuestion(newQuestion)
      
      // Check if this is a coding question
      if (isCodingQuestion(newQuestion)) {
        setIsCodingQuestionMode(true)
        setFeedback(null) // Clear any previous feedback
      } else {
        setIsCodingQuestionMode(false)
        setTimeout(() => {
          speakQuestion(newQuestion)
        }, 1000)
      }
      
      setSession({
        ...session,
        currentQuestion: session.currentQuestion + 1,
        totalQuestions: session.currentQuestion + 2, // increment
      })
    } else {
      endInterview(questionsHistory.map(h => h.answer))
    }
  }

  const endInterview = async (finalResponses: string[]) => {
    try {
      // Clear LangChain memory when interview ends
      if (session) {
        await apiClient.clearConversationMemory(session.id);
      }
      
      cleanup()
      router.push(`/reports/${params.id}`)
    } catch (error) {
      console.error("Failed to clear conversation memory:", error);
      // Still proceed with ending the interview even if memory clearing fails
      cleanup()
      router.push(`/reports/${params.id}`)
    }
  }

  const cleanup = () => {
    // Clear LangChain memory on cleanup
    if (session) {
      apiClient.clearConversationMemory(session.id).catch(error => {
        console.warn("Failed to clear conversation memory during cleanup:", error);
      });
    }

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

  const handleVideoLoadedMetadata = () => {
    console.log("Video metadata loaded, videoRef.current:", videoRef.current);
    setVideoReady(true)
    setVideoInitialized(true)
  }

  const handleVideoCanPlay = () => {
    console.log("Video can play, videoRef.current:", videoRef.current);
    setVideoReady(true)
    setVideoInitialized(true)
  }

  const handleVideoError = (error: any) => {
    console.error("Video error:", error);
    setError("Failed to load video stream");
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

        {questionWarning && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>{questionWarning}</AlertDescription>
          </Alert>
        )}

        {/* Feedback Display */}
        {feedback && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>
              <div><b>AI Feedback:</b> {feedback.feedback}</div>
              <div>Score: {feedback.score}</div>
              <div>Strengths: {feedback.strengths?.join(", ")}</div>
              <div>Improvements: {feedback.improvements?.join(", ")}</div>
            </AlertDescription>
          </Alert>
        )}

        {/* Coding Question Mode */}
        {isCodingQuestionMode && session && (
          <CodingQuestion
            interviewId={session.id}
            question={currentQuestion}
            position={session.position}
            onComplete={(feedback) => {
              console.log("Coding question completed with feedback:", feedback)
              // Move to next question
              nextQuestion("")
            }}
            onSkip={() => {
              console.log("Coding question skipped")
              // Move to next question
              nextQuestion("")
            }}
          />
        )}

        {/* Regular Interview Mode */}
        {!isCodingQuestionMode && (
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
                    onLoadedMetadata={handleVideoLoadedMetadata}
                    onCanPlay={handleVideoCanPlay}
                    onError={handleVideoError}
                  />

                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex items-center justify-center">
                      <VideoOff className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Controls */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                    <Button size="default" variant={isVideoEnabled ? "secondary" : "destructive"} onClick={() => toggleVideo()} className="rounded-full shadow-md px-6 py-2 text-lg">
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>

                    <Button size="default" variant={isAudioEnabled ? "secondary" : "destructive"} onClick={() => toggleAudio()} className="rounded-full shadow-md px-6 py-2 text-lg">
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Real-Time Face Tracking Card above current question, only if session is in progress */}
            {session && session.status === "in_progress" && videoReady && videoInitialized && (
              <FaceTracker
                videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                isActive={isVideoEnabled}
                onMetricsUpdate={(metrics) => {
                  setGazingMetrics({
                    eyeContact: metrics.eyeContact || 0,
                    blinks: 0, // Add missing blinks property
                    attentionScore: metrics.attentionScore || 0,
                    eyesDetected: metrics.eyesDetected || false,
                    facingCamera: metrics.facingCamera || false,
                  });
                  if (metricsTimeoutRef.current) clearTimeout(metricsTimeoutRef.current);
                  metricsTimeoutRef.current = setTimeout(() => {
                    setGazingMetrics({
                      eyeContact: 0,
                      blinks: 0, // Add missing blinks property
                      attentionScore: 0,
                      eyesDetected: false,
                      facingCamera: false,
                    });
                  }, 4000); // Increased timeout to 4 seconds
                }}
              />
            )}
            {interviewStarted && gazingEnabled && gazingMetrics && (
              <GazingSummary
                data={{
                  attentionScore: gazingMetrics.attentionScore,
                  eyeContact: gazingMetrics.eyeContact,
                  engagementLevel: gazingMetrics.attentionScore >= 80 ? "High" : gazingMetrics.attentionScore >= 60 ? "Medium" : "Low",
                  recommendations: [
                    !gazingMetrics.eyesDetected ? "Eyes Not Detected" : null,
                    !gazingMetrics.facingCamera ? "Not Facing Camera" : null,
                  ].filter((x): x is string => Boolean(x)),
                }}
              />
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
                    <p className="text-lg font-semibold text-gray-900 bg-indigo-50 rounded-lg p-4 shadow-sm">{currentQuestion}</p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="default"
                        onClick={() => speakQuestion(currentQuestion)}
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
                            size="default"
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
                              size="default"
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
                            size="default"
                            onClick={startListening}
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                            disabled={isSpeaking}
                          >
                            <Play className="h-4 w-4" />
                            Start Recording
                          </Button>
                        ) : (
                          <Button
                            size="default"
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
                            size="default"
                            onClick={() => nextQuestion(currentResponse)}
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                          >
                            Next →
                          </Button>
                        )}

                        <Button
                          size="default"
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
        )}
      </div>
    </div>
  )
}
