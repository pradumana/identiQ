import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Video, Loader2, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoRecorderProps {
  onVideoRecorded: (file: File) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const VideoRecorder = ({ onVideoRecorded, onError, disabled }: VideoRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlinkCount, setRecordedBlinkCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [blinkDetected, setBlinkDetected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blinkCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera
  useEffect(() => {
    if (!disabled) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [disabled]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      onError?.(error.message || 'Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (blinkCheckIntervalRef.current) {
      clearInterval(blinkCheckIntervalRef.current);
      blinkCheckIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const detectBlink = useCallback(async () => {
    if (!videoRef.current || !isRecording) return;

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to blob and send to backend for blink detection
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        // Simple client-side blink detection using face detection
        // In production, this would call a backend API
        // For now, we'll use a simple heuristic: check if eyes are visible
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple eye region detection (upper middle portion of face)
        // This is a simplified version - real implementation would use ML
        const eyeRegionY = Math.floor(canvas.height * 0.3);
        const eyeRegionHeight = Math.floor(canvas.height * 0.2);
        
        // Check brightness in eye region (closed eyes = darker)
        let totalBrightness = 0;
        let pixelCount = 0;
        
        for (let y = eyeRegionY; y < eyeRegionY + eyeRegionHeight; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;
            pixelCount++;
          }
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        
        // If brightness drops significantly, might be a blink
        // This is a simplified heuristic - real implementation would be more sophisticated
        if (avgBrightness < 100) {
          setBlinkDetected(true);
          setRecordedBlinkCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
              // User has blinked enough, can stop recording
              setTimeout(() => {
                stopRecording();
              }, 500);
            }
            return newCount;
          });
          
          // Reset blink indicator after a moment
          setTimeout(() => setBlinkDetected(false), 300);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Blink detection error:', error);
    }
  }, [isRecording]);

  const startRecording = () => {
    if (!mediaStreamRef.current || !videoRef.current) {
      onError?.('Camera not initialized');
      return;
    }

    try {
      chunksRef.current = [];
      setRecordedBlinkCount(0);
      setRecordingTime(0);
      setBlinkDetected(false);
      setShowGuidance(false);

      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: 'video/webm;codecs=vp8'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `selfie_${Date.now()}.webm`, { type: 'video/webm' });
        onVideoRecorded(file);
        setIsProcessing(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start blink detection interval
      blinkCheckIntervalRef.current = setInterval(detectBlink, 200); // Check every 200ms

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 10) {
            // Auto-stop after 10 seconds
            stopRecording();
            return 10;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (error: any) {
      console.error('Recording error:', error);
      onError?.(error.message || 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      if (blinkCheckIntervalRef.current) {
        clearInterval(blinkCheckIntervalRef.current);
        blinkCheckIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Guidance Alert */}
      {showGuidance && (
        <Alert className="border-blue-200 bg-blue-50">
          <Eye className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <div className="space-y-2">
              <p className="font-semibold">📹 Video Recording Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Look directly at the camera</li>
                <li><strong>Blink your eyes 2-3 times</strong> during recording</li>
                <li>Keep your face well-lit and visible</li>
                <li>Recording will auto-stop after detecting blinks or 10 seconds</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Video Preview */}
      <div className="relative w-full max-w-md mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full rounded-lg border-2",
            isRecording ? "border-red-500" : "border-gray-300"
          )}
        />
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Recording... {recordingTime.toFixed(1)}s
          </div>
        )}

        {/* Blink Detection Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4">
            {blinkDetected ? (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Blink Detected!
              </div>
            ) : (
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Blink {recordedBlinkCount}/2
              </div>
            )}
          </div>
        )}

        {/* Blink Count Progress */}
        {isRecording && (
          <div className="absolute bottom-4 left-0 right-0 mx-auto w-3/4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((recordedBlinkCount / 2) * 100, 100)}%` }}
              />
            </div>
            <p className="text-center text-xs text-white mt-1 font-semibold drop-shadow-lg">
              {recordedBlinkCount >= 2 ? '✅ Blinks detected! Stopping...' : '👁️ Please blink your eyes'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        {!isRecording && !isProcessing && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            size="lg"
            className="w-full max-w-md"
          >
            <Video className="h-5 w-5 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="lg"
            className="w-full max-w-md"
          >
            <Camera className="h-5 w-5 mr-2" />
            Stop Recording ({recordedBlinkCount} blinks detected)
          </Button>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing video...</span>
          </div>
        )}

        {recordedBlinkCount > 0 && !isRecording && !isProcessing && (
          <div className="text-sm text-green-600 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {recordedBlinkCount} blink{recordedBlinkCount > 1 ? 's' : ''} detected
          </div>
        )}
      </div>
    </div>
  );
};

