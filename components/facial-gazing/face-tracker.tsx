"use client";

import { useEffect, useRef } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface GazingMetrics {
  eyeContact: number;
  blinkRate: number;
  attentionScore: number;
  eyesDetected: boolean;
  facingCamera: boolean;
}

interface FaceTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>; // Update the type to allow null
  isActive: boolean;
  onMetricsUpdate?: (metrics: GazingMetrics) => void;
}

export function FaceTracker({ videoRef, isActive, onMetricsUpdate }: FaceTrackerProps) {
  const frameCountRef = useRef(0);
  const blinkCountRef = useRef(0);
  const lastEyeOpenAvg = useRef(1);
  const animationFrameRef = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    let running = true;

    const initFaceTracking = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        numFaces: 1,
        outputFaceBlendshapes: false,
        runningMode: "IMAGE", // create first in IMAGE mode
      });

      await faceLandmarker.setOptions({ runningMode: "VIDEO" }); // set to VIDEO after init
      faceLandmarkerRef.current = faceLandmarker;

      const processFrame = () => {
        if (!videoRef.current || !running) return;
        // Only process if video is ready and has size
        if (
          videoRef.current.readyState < 2 ||
          videoRef.current.videoWidth === 0 ||
          videoRef.current.videoHeight === 0
        ) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
        const now = performance.now();
        const result = faceLandmarker.detectForVideo(videoRef.current, now);
        handleResults(result);
        animationFrameRef.current = requestAnimationFrame(processFrame);
      };

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    initFaceTracking();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      faceLandmarkerRef.current?.close();
    };
  }, [isActive]);

  const handleResults = (result: FaceLandmarkerResult) => {
    frameCountRef.current += 1;

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      const emptyMetrics = { eyeContact: 0, blinkRate: 0, attentionScore: 0, eyesDetected: false, facingCamera: false };
      onMetricsUpdate?.(emptyMetrics);
      return;
    }

    const lm = result.faceLandmarks[0];
    const leftEyeOpen = estimateEyeOpen(lm, 159, 145); // top/bottom of left eye
    const rightEyeOpen = estimateEyeOpen(lm, 386, 374); // top/bottom of right eye
    const eyeOpenAvg = (leftEyeOpen + rightEyeOpen) / 2;

    const blinked = eyeOpenAvg < 0.13 && lastEyeOpenAvg.current >= 0.13;
    lastEyeOpenAvg.current = eyeOpenAvg;
    if (blinked) blinkCountRef.current += 1;

    // --- New scoring logic for higher attention when facing camera ---
    // Normalize eyeOpenAvg: typical open is ~0.18-0.22, closed <0.13
    // We'll map 0.13 (closed) to 0, 0.22 (open) to 1
    // Use robust scaling for eyeContact and attentionScore
    const eyeContact = Math.min(100, Math.round(eyeOpenAvg * 400));
    const blinkRate = Math.round(
      (blinkCountRef.current / (frameCountRef.current / 30)) * 60
    ); // per minute

    // Give a strong bonus for open eyes (facing camera)
    const attentionScore = Math.round(eyeContact * 0.7 + (eyeOpenAvg > 0.15 ? 30 : 0));

    const updated: GazingMetrics = {
      eyeContact,
      blinkRate,
      attentionScore,
      eyesDetected: true,
      facingCamera: true,
    };

    onMetricsUpdate?.(updated);
  };

  const estimateEyeOpen = (lm: any[], topIdx: number, bottomIdx: number) => {
    const t = lm[topIdx];
    const b = lm[bottomIdx];
    return Math.hypot(t.x - b.x, t.y - b.y);
  };

  if (!isActive) return null;
  return null;
}

export function RealTimeFaceTrackingCard({ metrics }: { metrics: GazingMetrics }) {
  return (
    <div className="mb-4 flex justify-center">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl shadow-xl border-0 ring-1 ring-indigo-100 rounded-2xl px-4 py-3 flex flex-col gap-2 min-h-0">
        <div className="flex flex-col items-center gap-1">
          <span className="bg-gradient-to-br from-indigo-200 to-blue-200 rounded-full p-2 shadow mb-1">
            <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </span>
          <span className="text-base font-bold text-indigo-900 tracking-tight">Real-Time Face Tracking</span>
        </div>
        <div className="flex flex-row items-center justify-between gap-3">
          {/* Main stats */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-semibold">Attention</span>
            <span className={`text-xl font-extrabold tracking-tight ${metrics.attentionScore >= 80 ? "text-green-600" : metrics.attentionScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>{metrics.attentionScore}%</span>
            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-1 rounded-full transition-all duration-300 ${metrics.attentionScore >= 80 ? "bg-green-400" : metrics.attentionScore >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${metrics.attentionScore}%` }} />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-semibold">Eye Contact</span>
            <span className="text-lg font-bold text-blue-700 tracking-tight">{metrics.eyeContact}%</span>
            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-1 rounded-full bg-blue-400 transition-all duration-300" style={{ width: `${metrics.eyeContact}%` }} />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-semibold">Blink Rate</span>
            <span className="text-lg font-bold text-indigo-700 tracking-tight">{metrics.blinkRate}/min</span>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-2 mt-1">
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow ${metrics.eyesDetected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {metrics.eyesDetected ? "Eyes Detected" : "Eyes Not Detected"}
          </span>
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow ${metrics.facingCamera ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {metrics.facingCamera ? "Facing Camera" : "Not Facing"}
          </span>
        </div>
      </div>
    </div>
  );
}
