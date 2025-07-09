"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, MicOff, Play, Square, Volume2, VolumeX } from "lucide-react"

export default function SpeechTestPage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState("")
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'working' | 'not-working'>('unknown')
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  
  const speechRecognitionRef = useRef<any>(null)

  useEffect(() => {
    checkSpeechRecognitionSupport()
    setupMicrophone()
  }, [])

  const checkSpeechRecognitionSupport = () => {
    const isSupported = "webkitSpeechRecognition" in window || "SpeechRecognition" in window
    setSpeechRecognitionSupported(isSupported)

    if (!isSupported) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
    }
  }

  const setupMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      })
      
      setMediaStream(stream)
      testMicrophone(stream)
    } catch (error) {
      console.error("Failed to access microphone:", error)
      setError("Failed to access microphone. Please allow microphone permissions.")
    }
  }

  const testMicrophone = async (stream: MediaStream) => {
    try {
      setMicrophoneStatus('unknown')
      
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
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

    recognition.onstart = () => {
      console.log("Speech recognition started")
      setIsListening(true)
      setError("")
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
        setTranscript(prev => prev + " " + finalTranscript)
      }

      if (interimTranscript) {
        setTranscript(prev => prev + " " + interimTranscript)
      }
    }

    recognition.onend = () => {
      console.log("Speech recognition ended")
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setIsListening(false)

      switch (event.error) {
        case "not-allowed":
        case "denied":
          setError("Microphone permission denied. Please allow microphone access and try again.")
          break
        case "audio-capture":
          setError("No microphone found. Please check your microphone and try again.")
          break
        case "no-speech":
          setError("No speech detected. Please try speaking again.")
          break
        case "network":
          setError("Network error. Please check your internet connection.")
          break
        case "aborted":
          console.log("Speech recognition was stopped by user")
          break
        default:
          setError(`Speech recognition error: ${event.error}. Please try again.`)
      }
    }

    return recognition
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

    if (!mediaStream) {
      setError("Please allow microphone access first")
      return
    }

    setError("")
    setTranscript("")

    try {
      const recognition = createSpeechRecognition()
      if (recognition) {
        speechRecognitionRef.current = recognition
        recognition.start()
      }
    } catch (error) {
      console.error("Failed to create speech recognition:", error)
      setError("Failed to initialize speech recognition. Please try again.")
    }
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
    setIsListening(false)
  }

  const clearTranscript = () => {
    setTranscript("")
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Speech Recognition Test</h1>
        <p className="text-gray-600">Test your microphone and speech recognition functionality</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Microphone Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Microphone Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge 
                variant={microphoneStatus === 'working' ? 'default' : microphoneStatus === 'not-working' ? 'destructive' : 'secondary'}
              >
                {microphoneStatus === 'working' ? 'Working' : microphoneStatus === 'not-working' ? 'Not Working' : 'Testing...'}
              </Badge>
              <span className="text-sm text-gray-600">
                {microphoneStatus === 'working' ? 'Microphone is working properly' : 
                 microphoneStatus === 'not-working' ? 'Microphone not detected or not working' : 
                 'Testing microphone...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={speechRecognitionSupported ? 'default' : 'destructive'}>
                {speechRecognitionSupported ? 'Supported' : 'Not Supported'}
              </Badge>
              <span className="text-sm text-gray-600">
                {speechRecognitionSupported ? 'Speech recognition is supported' : 'Speech recognition not supported in this browser'}
              </span>
            </div>

            <Button 
              onClick={() => mediaStream && testMicrophone(mediaStream)}
              variant="outline"
              size="sm"
            >
              Retest Microphone
            </Button>
          </CardContent>
        </Card>

        {/* Speech Recognition Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Speech Recognition Test
            </CardTitle>
            <CardDescription>
              Click "Start Recording" and speak to test speech recognition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  className="flex items-center gap-1"
                  disabled={!speechRecognitionSupported || !mediaStream}
                >
                  <Play className="h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}

              <Button
                onClick={clearTranscript}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            </div>

            {isListening && (
              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  Listening... Speak now!
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <MicOff className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="min-h-32 p-3 bg-gray-50 rounded-lg border">
              {transcript ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{transcript}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Your speech will appear here...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>If speech recognition is not working:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Make sure you're using Chrome, Edge, or Safari</li>
              <li>Allow microphone permissions when prompted</li>
              <li>Check that your microphone is not muted</li>
              <li>Try speaking clearly and at a normal volume</li>
              <li>Check if your microphone is selected as the default input device</li>
              <li>Try refreshing the page and allowing permissions again</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 