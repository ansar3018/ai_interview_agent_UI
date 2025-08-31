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
  HelpCircle,
  Loader2,
  Send,
  MessageCircle,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { FaceTracker } from "@/components/facial-gazing/face-tracker"
import { GazingSummary } from "@/components/facial-gazing/gazing-summary"
import CodeEditor from "@/components/code-editor"
import CodingQuestion from "@/components/coding-question"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Drawer } from "@/components/ui/drawer";
import { FeedbackDialog } from "@/components/ui/feedback-dialog";

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

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>("")
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speechRecognitionRef = useRef<any>(null)
  const currentTranscript = useRef("")
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const INTERVIEW_STATE_KEY = (id: string) => `interview_state_${id}`;
  const { toast } = useToast();
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [pendingEndResponses, setPendingEndResponses] = useState<string[] | null>(null)
  const [showSessionExpiryDialog, setShowSessionExpiryDialog] = useState(false)
  const [logoutTimer, setLogoutTimer] = useState<NodeJS.Timeout | null>(null)
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { sender: "Interviewer", text: "Welcome to the interview!", timestamp: new Date() },
    { sender: "Candidate", text: "Thank you!", timestamp: new Date() },
  ]);

  const handleSendChat = () => {
    if (chatInput.trim()) {
      setChatMessages([...chatMessages, { sender: "Interviewer", text: chatInput, timestamp: new Date() }]);
      setChatInput("");
    }
  };

  const SESSION_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  const WARNING_TIMEOUT = 14 * 60 * 1000 // 14 minutes

  const [sections, setSections] = useState([
    { key: 'behavioral', label: 'Behavioral', questions: [] },
    { key: 'technical', label: 'Technical', questions: [] },
    { key: 'coding', label: 'Coding', questions: [] },
  ])
  const [currentSection, setCurrentSection] = useState(0)
  const [skippedQuestions, setSkippedQuestions] = useState<{ section: number, question: string }[]>([])
  const [questionHistoryStack, setQuestionHistoryStack] = useState<{ section: number, question: string }[]>([])

  useEffect(() => {
    initializeInterview()
    setupMediaDevices()
    checkSpeechRecognitionSupport()

    return () => {
      cleanup()
      if (metricsTimeoutRef.current) clearTimeout(metricsTimeoutRef.current);
    }
  }, [])

  useEffect(() => {
    // Restore state from localStorage if available and id matches
    const id = params.id as string;
    const saved = localStorage.getItem(INTERVIEW_STATE_KEY(id));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.session?.id === id) {
          setSession(parsed.session);
          setQuestionsHistory(parsed.questionsHistory || []);
          setCurrentQuestion(parsed.currentQuestion || "");
          setInterviewStarted(parsed.interviewStarted || false);
          setIsCodingQuestionMode(parsed.isCodingQuestionMode || false);
        }
      } catch {}
    }
  }, [params.id]);

  useEffect(() => {
    // Persist state to localStorage on change
    const id = params.id as string;
    if (!id) return;
    const state = {
      session,
      questionsHistory,
      currentQuestion,
      interviewStarted,
      isCodingQuestionMode,
    };
    localStorage.setItem(INTERVIEW_STATE_KEY(id), JSON.stringify(state));
  }, [session, questionsHistory, currentQuestion, interviewStarted, isCodingQuestionMode, params.id]);

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

  // Reset timers on user activity
  useEffect(() => {
    const resetTimers = () => {
      if (logoutTimer) clearTimeout(logoutTimer)
      if (warningTimer) clearTimeout(warningTimer)
      setWarningTimer(setTimeout(() => setShowSessionExpiryDialog(true), WARNING_TIMEOUT))
      setLogoutTimer(setTimeout(() => handleSessionLogout(), SESSION_TIMEOUT))
    }
    window.addEventListener("mousemove", resetTimers)
    window.addEventListener("keydown", resetTimers)
    window.addEventListener("click", resetTimers)
    resetTimers()
    return () => {
      window.removeEventListener("mousemove", resetTimers)
      window.removeEventListener("keydown", resetTimers)
      window.removeEventListener("click", resetTimers)
      if (logoutTimer) clearTimeout(logoutTimer)
      if (warningTimer) clearTimeout(warningTimer)
    }
  }, [])

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

  // Fetch devices on mount and when devices change
  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioDevices(devices.filter(d => d.kind === "audioinput"))
      setVideoDevices(devices.filter(d => d.kind === "videoinput"))
    }
    navigator.mediaDevices.addEventListener("devicechange", getDevices)
    getDevices()
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", getDevices)
    }
  }, [])

  // Update media stream when device selection changes
  useEffect(() => {
    if (!selectedAudioDeviceId && !selectedVideoDeviceId) return
    const getStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
          audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
        })
        mediaStreamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (e) {
        setError("Failed to access selected devices. Please check permissions.")
      }
    }
    getStream()
  }, [selectedAudioDeviceId, selectedVideoDeviceId])

  // Audio quality monitoring
  useEffect(() => {
    let audioInterval: NodeJS.Timeout | null = null
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const audioContext = new window.AudioContext()
        const source = audioContext.createMediaStreamSource(mediaStreamRef.current)
        const analyser = audioContext.createAnalyser()
        source.connect(analyser)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        audioInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          if (avg < 5) {
            toast({
              title: "Low Audio Detected",
              description: "Your microphone input is very low. Please check your microphone.",
            })
          }
        }, 5000)
      }
    }
    return () => {
      if (audioInterval) clearInterval(audioInterval)
    }
  }, [mediaStreamRef.current])

  // Video quality monitoring
  useEffect(() => {
    let videoTimeout: NodeJS.Timeout | null = null
    const checkVideo = () => {
      if (videoRef.current && videoRef.current.readyState < 2) {
        videoTimeout = setTimeout(() => {
          toast({
            title: "Video Stream Interrupted",
            description: "Your camera feed appears to be interrupted or frozen.",
          })
        }, 3000)
      } else if (videoTimeout) {
        clearTimeout(videoTimeout)
      }
    }
    if (videoRef.current) {
      videoRef.current.addEventListener("pause", checkVideo)
      videoRef.current.addEventListener("stalled", checkVideo)
      videoRef.current.addEventListener("playing", checkVideo)
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("pause", checkVideo)
        videoRef.current.removeEventListener("stalled", checkVideo)
        videoRef.current.removeEventListener("playing", checkVideo)
      }
      if (videoTimeout) clearTimeout(videoTimeout)
    }
  }, [videoRef.current])

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
      // Placeholder: assign first question to first section
      const newSections = [
        { ...sections[0], questions: [nextQ.nextQuestion] },
        { ...sections[1], questions: [] },
        { ...sections[2], questions: [] },
      ]
      setSections(newSections)
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
    setQuestionHistoryStack(prev => [...prev, { section: currentSection, question: currentQuestion }])
    
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

      // AUTOSAVE: Save answer to backend
      apiClient.saveAnswer(session.id, {
        question: currentQuestion,
        answer: transcript,
        index: updatedHistory.length - 1,
      }).catch((err) => {
        toast({
          title: "Failed to autosave answer",
          description: "Click to retry.",
          action: (
            <button
              className="px-2 py-1 bg-indigo-600 text-white rounded ml-2"
              onClick={() => {
                apiClient.saveAnswer(session.id, {
                  question: currentQuestion,
                  answer: transcript,
                  index: updatedHistory.length - 1,
                })
              }}
            >Retry</button>
          ),
        })
      })

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
        toast({
          title: "Failed to get feedback",
          description: "Click to retry.",
          action: (
            <button
              className="px-2 py-1 bg-indigo-600 text-white rounded ml-2"
              onClick={async () => {
                try {
                  const feedbackRes = await apiClient.getFeedback({
                    interview_id: session.id,
                    question: currentQuestion,
                    response: transcript,
                    expected_keywords: [],
                  })
                  setFeedback(feedbackRes)
                } catch {}
              }}
            >Retry</button>
          ),
        })
      }
    }
    
    // Check if we've reached the maximum number of questions (fallback)
    const maxQuestions = 12
    if (questionsHistory.length >= maxQuestions) {
      console.log(`Interview completed after ${maxQuestions} questions (maximum limit)`)
      handleEndInterview(questionsHistory.map(h => h.answer))
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
      handleEndInterview(questionsHistory.map(h => h.answer))
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
      handleEndInterview(questionsHistory.map(h => h.answer))
    }
  }

  const skipQuestion = () => {
    setSkippedQuestions(prev => [...prev, { section: currentSection, question: currentQuestion }])
    // Move to next question (simulate by incrementing currentQuestion or fetching next)
    // For now, just clear currentQuestion
    setCurrentQuestion("")
  }

  const goBack = () => {
    if (questionHistoryStack.length === 0) return
    const last = questionHistoryStack[questionHistoryStack.length - 1]
    setCurrentSection(last.section)
    setCurrentQuestion(last.question)
    setQuestionHistoryStack(prev => prev.slice(0, -1))
  }

  const handleEndInterview = (finalResponses: string[]) => {
    setPendingEndResponses(finalResponses)
    setShowEndDialog(true)
  }

  const confirmEndInterview = async () => {
    if (!pendingEndResponses) return
    setShowEndDialog(false)
    await endInterview(pendingEndResponses)
    setPendingEndResponses(null)
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

  const handleSessionLogout = () => {
    setShowSessionExpiryDialog(false)
    setSession(null)
    setInterviewStarted(false)
    setQuestionsHistory([])
    setCurrentQuestion("")
    setIsCodingQuestionMode(false)
    localStorage.removeItem(INTERVIEW_STATE_KEY(params.id as string))
    router.push("/auth/login")
  }

  const stayLoggedIn = () => {
    setShowSessionExpiryDialog(false)
    if (logoutTimer) clearTimeout(logoutTimer)
    if (warningTimer) clearTimeout(warningTimer)
    setWarningTimer(setTimeout(() => setShowSessionExpiryDialog(true), WARNING_TIMEOUT))
    setLogoutTimer(setTimeout(() => handleSessionLogout(), SESSION_TIMEOUT))
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
    <div className="relative">
      {/* Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
          <Loader2 className="animate-spin w-12 h-12 text-indigo-600" />
        </div>
      )}
      {/* Error Alert */}
      {error && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-blue-100 p-2 sm:p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:gap-8">
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
          {/* Section navigation UI */}
          <div className="flex gap-2 mb-4">
            {sections.map((section, idx) => (
              <Button
                key={section.key}
                variant={idx === currentSection ? "default" : "outline"}
                onClick={() => setCurrentSection(idx)}
                aria-label={`Go to ${section.label} section`}
              >
                {section.label}
              </Button>
            ))}
          </div>
          {/* Section progress bar */}
          <Progress value={((session?.currentQuestion || 0) / (session?.totalQuestions || 1)) * 100} className="h-3 rounded-full bg-indigo-200" />
          <p className="text-md text-gray-500 mt-1 font-medium">
            Section: {sections[currentSection].label}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 overflow-x-auto">
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
                      <Button size="default" variant={isVideoEnabled ? "secondary" : "destructive"} onClick={() => toggleVideo()} className="rounded-full shadow-md px-6 py-2 text-lg" aria-label="Toggle Video">
                        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </Button>

                      <Button size="default" variant={isAudioEnabled ? "secondary" : "destructive"} onClick={() => toggleAudio()} className="rounded-full shadow-md px-6 py-2 text-lg" aria-label="Toggle Audio">
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
                    <Button onClick={startInterview} className="w-full bg-green-600 hover:bg-green-700 text-lg py-3 rounded-xl" aria-label="Start Interview">
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
                          aria-label="Repeat Question"
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
                          <Badge variant="secondary" className="animate-pulse text-base px-3 py-1 rounded-xl" aria-label="Listening">
                            <Mic className="h-4 w-4 mr-1" />
                            Listening...
                          </Badge>
                        )}
                        {microphoneStatus !== 'unknown' && (
                          <Badge 
                            variant={microphoneStatus === 'working' ? 'default' : 'destructive'}
                            className="text-base px-3 py-1 rounded-xl"
                            aria-label={microphoneStatus === 'working' ? 'Microphone OK' : 'Microphone Issue'}
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
                            aria-label="Type Response"
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
                              aria-label="Submit Response"
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
                                aria-label="Use Voice Instead"
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
                              aria-label="Start Recording"
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
                              aria-label="Stop Recording"
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
                              aria-label="Next Question"
                            >
                              Next →
                            </Button>
                          )}

                          <Button
                            size="default"
                            variant="outline"
                            onClick={() => setShowTextInput(true)}
                            className="flex items-center gap-1 rounded-lg px-4 py-2 text-base"
                            aria-label="Type Instead"
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
                        aria-label="Next Question"
                      >
                        {session.currentQuestion < session.totalQuestions - 1 ? "Next Question" : "Complete Interview"}
                      </Button>

                      <Button onClick={goBack} variant="outline" className="w-full" disabled={questionHistoryStack.length === 0} aria-label="Go Back">Back</Button>
                      <Button onClick={skipQuestion} variant="secondary" className="w-full" aria-label="Skip Question">Skip</Button>

                      <Button onClick={() => handleEndInterview(session.responses)} variant="outline" className="w-full" aria-label="End Interview Early">
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
        {/* End Interview Confirmation Dialog */}
        <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle id="end-interview-title">End Interview?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <p id="end-interview-desc">
                  Are you sure you want to end the interview? You will not be able to return to this session.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowEndDialog(false)} aria-label="Cancel End Interview">Cancel</AlertDialogCancel>
              <AlertDialogAction aria-label="Confirm End Interview" onClick={confirmEndInterview}>End Interview</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Session Expiry Warning Dialog */}
        <AlertDialog open={showSessionExpiryDialog} onOpenChange={setShowSessionExpiryDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle id="session-expiry-title">Session Expiring Soon</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <p id="session-expiry-desc">
                  You have been inactive for a while. You will be logged out in 1 minute unless you choose to stay logged in.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction aria-label="Stay Logged In" onClick={stayLoggedIn}>Stay Logged In</AlertDialogAction>
              <AlertDialogCancel aria-label="Logout Now" onClick={handleSessionLogout}>Logout Now</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Device Selection UI */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
          <div>
            <label htmlFor="audio-device" className="block text-sm font-medium text-gray-700">Microphone</label>
            <select
              id="audio-device"
              value={selectedAudioDeviceId}
              onChange={e => setSelectedAudioDeviceId(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              aria-label="Select Microphone"
            >
              <option value="">Default</option>
              {audioDevices.length === 0 && <option disabled>No microphones found</option>}
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${device.deviceId}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="video-device" className="block text-sm font-medium text-gray-700">Camera</label>
            <select
              id="video-device"
              value={selectedVideoDeviceId}
              onChange={e => setSelectedVideoDeviceId(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              aria-label="Select Camera"
            >
              <option value="">Default</option>
              {videoDevices.length === 0 && <option disabled>No cameras found</option>}
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId}`}</option>
              ))}
            </select>
          </div>
        </div>
        {skippedQuestions.length > 0 && (
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">Skipped Questions</h3>
            <ul className="list-disc ml-6">
              {skippedQuestions.map((q, idx) => (
                <li key={idx}>
                  <Button size="sm" variant="ghost" onClick={() => { setCurrentSection(q.section); setCurrentQuestion(q.question); }}>
                    {q.question}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Floating Help Button */}
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogTrigger asChild>
            <button
              className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Help & Support"
              type="button"
            >
              <HelpCircle className="w-7 h-7" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Help & FAQ</DialogTitle>
              <DialogDescription>
                Find answers to common questions or contact support below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <strong>Q: What if my microphone or camera isn't working?</strong>
                    <br />A: Please check your browser permissions and device settings. Refresh the page after allowing access.
                  </li>
                  <li>
                    <strong>Q: Can I skip a question?</strong>
                    <br />A: Yes, use the 'Skip' button below each question.
                  </li>
                  <li>
                    <strong>Q: How do I end the interview early?</strong>
                    <br />A: Click the 'End Interview Early' button in the navigation section.
                  </li>
                  <li>
                    <strong>Q: Who can I contact for technical support?</strong>
                    <br />A: Use the button below to contact support.
                  </li>
                </ul>
              </div>
              <div className="flex justify-end">
                <a
                  href="mailto:support@example.com"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Interviewer Chat Button (bottom left) */}
        <button
          className="fixed bottom-6 left-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Open Interviewer Chat"
          type="button"
          onClick={() => setShowChat(true)}
        >
          <MessageCircle className="w-7 h-7" />
        </button>
        {/* Interviewer Chat Drawer */}
        <Drawer open={showChat} onOpenChange={setShowChat} side="left">
          <div className="flex flex-col h-full w-80 bg-white shadow-lg rounded-r-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-bold text-lg">Interviewer Chat</span>
              <button onClick={() => setShowChat(false)} aria-label="Close Chat" className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === "Interviewer" ? "items-end" : "items-start"}`}>
                  <div className={`px-3 py-2 rounded-lg max-w-xs ${msg.sender === "Interviewer" ? "bg-indigo-100 text-indigo-900" : "bg-gray-100 text-gray-800"}`}>
                    <span className="block text-xs font-semibold mb-1">{msg.sender}</span>
                    <span>{msg.text}</span>
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
            <form
              className="p-4 border-t flex gap-2"
              onSubmit={e => { e.preventDefault(); handleSendChat(); }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Chat message input"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-3 py-2 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </Drawer>
        {/* Floating Feedback Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <FeedbackDialog />
        </div>
      </div>
    </div>
  )
}
