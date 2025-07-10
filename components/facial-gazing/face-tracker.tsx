"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";

interface GazingMetrics {
  eyeContact: number;
  attentionScore: number;
  eyesDetected: boolean;
  facingCamera: boolean;
}

interface FaceTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  onMetricsUpdate?: (metrics: GazingMetrics) => void;
}

export function FaceTracker({ videoRef, isActive, onMetricsUpdate }: FaceTrackerProps) {
  const [metrics, setMetrics] = useState<GazingMetrics>({
    eyeContact: 0,
    attentionScore: 0,
    eyesDetected: false,
    facingCamera: false,
  });
  // Remove faceBox state

  const frameCountRef = useRef(0);
  const lastEyeOpenAvg = useRef(1);
  const animationFrameRef = useRef<number | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  // --- Eye Contact & Facing Camera Tracking ---
  const totalTrackedFramesRef = useRef(0);
  const totalEyeContactFramesRef = useRef(0);
  const totalFacingCameraFramesRef = useRef(0);
  const attentionHistoryRef = useRef<number[]>([]);
  const lastDetectionTimeRef = useRef(Date.now());

  // Reset counters if face is lost for >2s
  const maybeResetCounters = () => {
    if (Date.now() - lastDetectionTimeRef.current > 2000) {
      totalTrackedFramesRef.current = 0;
      totalEyeContactFramesRef.current = 0;
      totalFacingCameraFramesRef.current = 0;
      attentionHistoryRef.current = [];
    }
  };

  const relaxedEyeContact = (lm: any[]) => {
    const iris = lm[468];
    const nose = lm[1];
    if (!iris || !nose) return false;
    // Revert to original broader bounds
    return iris.x > 0.1 && iris.x < 0.9 && iris.y > 0.1 && iris.y < 0.9;
  };

  const relaxedFacingCamera = (lm: any[]) => {
    const nose = lm[1];
    if (!nose) return false;
    // Revert to original broader bounds
    return nose.z > -1 && nose.z < 1 && nose.y > 0.1 && nose.y < 0.9;
  };

  const handleResults = (result: FaceLandmarkerResult) => {
    frameCountRef.current += 1;
    maybeResetCounters();

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      setMetrics((m) => ({ ...m, eyesDetected: false, facingCamera: false }));
      // Remove setFaceBox(null)
      return;
    }

    lastDetectionTimeRef.current = Date.now();
    const lm = result.faceLandmarks[0];
    totalTrackedFramesRef.current += 1;

    // Remove bounding box calculation

    // Eye contact and facing camera logic
    const isEyeContact = relaxedEyeContact(lm);
    const isFacingCamera = relaxedFacingCamera(lm);
    if (isEyeContact) totalEyeContactFramesRef.current += 1;
    if (isFacingCamera) totalFacingCameraFramesRef.current += 1;

    const eyeContactRatio = totalTrackedFramesRef.current > 0 ? totalEyeContactFramesRef.current / totalTrackedFramesRef.current : 0;
    const facingCameraRatio = totalTrackedFramesRef.current > 0 ? totalFacingCameraFramesRef.current / totalTrackedFramesRef.current : 0;

    // --- Attention Score Formula ---
    const attentionScoreRaw = eyeContactRatio * 60 + facingCameraRatio * 30;
    // Smoothing
    attentionHistoryRef.current.push(attentionScoreRaw);
    if (attentionHistoryRef.current.length > 30) attentionHistoryRef.current.shift();
    const attentionScore = Math.round(
      attentionHistoryRef.current.reduce((a, b) => a + b, 0) / attentionHistoryRef.current.length
    );

    // Only show metrics if enough frames tracked
    const minFrames = 15;
    const updated: GazingMetrics = {
      eyeContact: totalTrackedFramesRef.current >= minFrames ? Math.round(eyeContactRatio * 100) : 0,
      attentionScore: totalTrackedFramesRef.current >= minFrames ? attentionScore : 0,
      eyesDetected: true,
      facingCamera: isFacingCamera,
    };

    setMetrics(updated);
    onMetricsUpdate?.(updated);
  };

  const estimateEyeOpen = (lm: any[], topIdx: number, bottomIdx: number) => {
    const t = lm[topIdx];
    const b = lm[bottomIdx];
    return Math.hypot(t.x - b.x, t.y - b.y);
  };

  const getAttentionColor = (score: number) => {
    return score >= 80
      ? "text-green-600"
      : score >= 60
      ? "text-yellow-600"
      : "text-red-600";
  };

  const getAttentionIcon = (score: number) => {
    return score >= 80 ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : score >= 60 ? (
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    );
  };

  useEffect(() => {
    let running = true;
    let pollTimeout: number | null = null;
    let observer: MutationObserver | null = null;

    const resetAllMetrics = () => {
      totalTrackedFramesRef.current = 0;
      totalEyeContactFramesRef.current = 0;
      totalFacingCameraFramesRef.current = 0;
      attentionHistoryRef.current = [];
      // frameCountRef.current = 0; // Do not reset
      // blinkCountRef.current = 0; // Do not reset
      setMetrics({
        eyeContact: 0,
        attentionScore: 0,
        eyesDetected: false,
        facingCamera: false,
      });
      onMetricsUpdate?.({
        eyeContact: 0,
        attentionScore: 0,
        eyesDetected: false,
        facingCamera: false,
      });
    };

    const attachVideoListeners = () => {
      if (!videoRef.current) return;
      videoRef.current.addEventListener("pause", resetAllMetrics);
      videoRef.current.addEventListener("ended", resetAllMetrics);
      videoRef.current.addEventListener("emptied", resetAllMetrics);
      videoRef.current.addEventListener("abort", resetAllMetrics);
      videoRef.current.addEventListener("error", resetAllMetrics);
      observer = new MutationObserver(() => {
        if (!videoRef.current?.srcObject) resetAllMetrics();
      });
      observer.observe(videoRef.current, { attributes: true, attributeFilter: ["srcObject"] });
    };
    const detachVideoListeners = () => {
      if (!videoRef.current) return;
      videoRef.current.removeEventListener("pause", resetAllMetrics);
      videoRef.current.removeEventListener("ended", resetAllMetrics);
      videoRef.current.removeEventListener("emptied", resetAllMetrics);
      videoRef.current.removeEventListener("abort", resetAllMetrics);
      videoRef.current.removeEventListener("error", resetAllMetrics);
      if (observer) observer.disconnect();
    };

    const waitForVideo = () => {
      if (!isActive) {
        return;
      }
      if (!videoRef.current) {
        pollTimeout = window.setTimeout(waitForVideo, 100);
        return;
      }
      attachVideoListeners();
      startFaceTracking();
    };

    const startFaceTracking = () => {
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
          runningMode: "IMAGE",
        });
        await faceLandmarker.setOptions({ runningMode: "VIDEO" });
        faceLandmarkerRef.current = faceLandmarker;
        const processFrame = () => {
          if (!videoRef.current || !running) {
            resetAllMetrics();
            return;
          }
          if (
            videoRef.current.paused ||
            videoRef.current.ended ||
            videoRef.current.readyState < 2 ||
            videoRef.current.videoWidth === 0 ||
            videoRef.current.videoHeight === 0
          ) {
            resetAllMetrics();
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
          }
          if (frameCountRef.current % 10 === 0) {
          }
          const now = performance.now();
          const result = faceLandmarker.detectForVideo(videoRef.current, now);
          handleResults(result);
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };
        animationFrameRef.current = requestAnimationFrame(processFrame);
      };
      initFaceTracking();
    };

    waitForVideo();
    return () => {
      running = false;
      if (pollTimeout) clearTimeout(pollTimeout);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      faceLandmarkerRef.current?.close();
      detachVideoListeners();
      // Reset blink/frame counters on unmount
      frameCountRef.current = 0;
      // blinkCountRef.current = 0; // Do not reset
    };
  }, [isActive, videoRef]);

  // Remove overlay rendering
  if (!isActive) {
    return null;
  }
  return null;
}
