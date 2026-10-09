import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";

type CameraCaptureModalProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void | Promise<void>;
};

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function friendlyCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access was denied. You can choose a photo from your computer instead.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use or unavailable.";
  }
  return "Unable to start the camera. You can choose a photo from your computer instead.";
}

export function CameraCaptureModal({ open, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [usingPhoto, setUsingPhoto] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      cleanup();
      setCapturedDataUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setStarting(true);
    setError(null);
    setUsingPhoto(false);
    setCapturedDataUrl(null);

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          void video.play();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(friendlyCameraError(err));
        }
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open, cleanup]);

  function captureVideoFrame(video: HTMLVideoElement): string | null {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function handleTakePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const dataUrl = captureVideoFrame(video);
    if (!dataUrl) {
      setError("Camera is not ready yet. Wait a moment and try again.");
      return;
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    video.srcObject = null;
    setCapturedDataUrl(dataUrl);
  }

  function handleRetake() {
    setCapturedDataUrl(null);
    setStarting(true);
    setError(null);
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          void video.play();
        }
      })
      .catch((err) => setError(friendlyCameraError(err)))
      .finally(() => setStarting(false));
  }

  async function handleUsePhoto() {
    if (!capturedDataUrl || usingPhoto) return;
    setUsingPhoto(true);
    setError(null);
    try {
      await onCapture(capturedDataUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save captured photo.");
    } finally {
      setUsingPhoto(false);
    }
  }

  function handleClose() {
    cleanup();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Take photo"
      onClose={handleClose}
      layer="top"
      className="max-w-md"
      footer={
        capturedDataUrl ? (
          <>
            <Button variant="secondary" onClick={handleRetake}>
              Retake
            </Button>
            <Button loading={usingPhoto} onClick={() => void handleUsePhoto()}>
              Use photo
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button disabled={!!error || starting} onClick={handleTakePhoto}>
              <Camera className="size-4" />
              Take photo
            </Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        {error ? (
          <p className="rounded-shawish border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-shawish-lg border border-shawish-border bg-black/80">
          {capturedDataUrl ? (
            <img src={capturedDataUrl} alt="Captured preview" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-[4/3] w-full object-cover"
            />
          )}
        </div>

        {starting ? <p className="text-xs text-shawish-muted">Starting camera...</p> : null}
      </div>
    </Modal>
  );
}
