import { useState } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CameraCaptureModal } from "@/components/common/CameraCaptureModal";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import {
  deletePendingProfilePhoto,
  pickProfilePhoto,
  saveCapturedProfilePhoto,
  type PhotoFolder,
} from "@/services/profilePhotoApi";

type ProfilePhotoPickerProps = {
  label: string;
  folder: PhotoFolder;
  name: string;
  photoPath: string | null;
  previewUrl: string | null;
  savedPhotoPath: string | null;
  onChange: (next: { photoPath: string | null; previewUrl: string | null }) => void;
  onError?: (message: string) => void;
};

export function ProfilePhotoPicker({
  label,
  folder,
  name,
  photoPath,
  previewUrl,
  savedPhotoPath,
  onChange,
  onError,
}: ProfilePhotoPickerProps) {
  const [picking, setPicking] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [savingCapture, setSavingCapture] = useState(false);

  async function replacePending(nextPath: string | null) {
    if (photoPath && photoPath !== savedPhotoPath && photoPath !== nextPath) {
      await deletePendingProfilePhoto(photoPath);
    }
  }

  async function handleChooseFile() {
    setPicking(true);
    try {
      const result = await pickProfilePhoto(
        folder,
        folder === "members"
          ? "Choose member photo"
          : folder === "products"
            ? "Choose product photo"
            : "Choose trainer photo",
      );
      if (result.cancelled) return;
      if ("error" in result && result.error) {
        onError?.(result.error);
        return;
      }
      if ("relativePath" in result) {
        await replacePending(result.relativePath);
        onChange({
          photoPath: result.relativePath,
          previewUrl: result.previewUrl,
        });
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Unable to choose photo.");
    } finally {
      setPicking(false);
    }
  }

  async function handleCaptured(dataUrl: string) {
    setSavingCapture(true);
    try {
      const result = await saveCapturedProfilePhoto(folder, dataUrl);
      if (!result.ok) {
        const message = result.error || "Unable to save captured photo.";
        onError?.(message);
        throw new Error(message);
      }
      await replacePending(result.relativePath);
      onChange({
        photoPath: result.relativePath,
        previewUrl: result.previewUrl,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to save captured photo.";
      onError?.(message);
      throw e instanceof Error ? e : new Error(message);
    } finally {
      setSavingCapture(false);
    }
  }

  async function handleRemove() {
    await replacePending(null);
    onChange({ photoPath: null, previewUrl: null });
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-4">
        <MemberAvatar name={name || label} photoPath={photoPath} previewUrl={previewUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-shawish-muted">Camera or JPG, PNG, WEBP · stored locally</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={savingCapture}
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="size-4" />
              Camera
            </Button>
            <Button type="button" variant="secondary" loading={picking} onClick={() => void handleChooseFile()}>
              <ImageUp className="size-4" />
              Choose from computer
            </Button>
            {photoPath || previewUrl ? (
              <Button type="button" variant="ghost" onClick={() => void handleRemove()}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => void handleCaptured(dataUrl)}
      />
    </>
  );
}
