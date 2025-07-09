"use client";

import { useEffect, useRef, useState } from "react";
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
  blinkRate: number;
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
    blinkRate: 0,
    attentionScore: 0,
    eyesDetected: false,
    facingCamera: false,
  });

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
      setMetrics((m) => ({ ...m, eyesDetected: false, facingCamera: false }));
      return;
    }

    const lm = result.faceLandmarks[0];
    const leftEyeOpen = estimateEyeOpen(lm, 159, 145); // top/bottom of left eye
    const rightEyeOpen = estimateEyeOpen(lm, 386, 374); // top/bottom of right eye
    const eyeOpenAvg = (leftEyeOpen + rightEyeOpen) / 2;

    const blinked = eyeOpenAvg < 0.13 && lastEyeOpenAvg.current >= 0.13;
    lastEyeOpenAvg.current = eyeOpenAvg;
    if (blinked) blinkCountRef.current += 1;

    const eyeContact = Math.min(100, Math.round(eyeOpenAvg * 300));
    const blinkRate = Math.round(
      (blinkCountRef.current / (frameCountRef.current / 30)) * 60
    ); // per minute

    const attentionScore = Math.round(eyeContact * 0.6 + (eyeOpenAvg > 0.15 ? 30 : 0));

    const updated: GazingMetrics = {
      eyeContact,
      blinkRate,
      attentionScore,
      eyesDetected: true,
      facingCamera: true,
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

  if (!isActive) return null;

  return (
    <Card className="absolute top-2 right-2 w-64 shadow-md bg-white z-10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Real-Time Face Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Attention Score</span>
          <div className="flex items-center gap-1">
            {getAttentionIcon(metrics.attentionScore)}
            <span className={`font-bold ${getAttentionColor(metrics.attentionScore)}`}>
              {metrics.attentionScore}%
            </span>
          </div>
        </div>
        <Progress value={metrics.attentionScore} className="h-2" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex justify-between">
              <span>Eye Contact</span>
              <span className="font-medium">{metrics.eyeContact}%</span>
            </div>
            <Progress value={metrics.eyeContact} className="h-1" />
          </div>
          <div>
            <div className="flex justify-between">
              <span>Blink Rate</span>
              <span className="font-medium">{metrics.blinkRate}/min</span>
            </div>
          </div>
        </div>

        <div className="flex gap-1 text-xs">
          <Badge variant={metrics.eyesDetected ? "default" : "destructive"}>
            {metrics.eyesDetected ? "Eyes Detected" : "Eyes Not Detected"}
          </Badge>
          <Badge variant={metrics.facingCamera ? "default" : "secondary"}>
            {metrics.facingCamera ? "Facing Camera" : "Not Facing"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
