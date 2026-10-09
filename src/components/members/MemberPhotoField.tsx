import { ProfilePhotoPicker } from "@/components/common/ProfilePhotoPicker";

type MemberPhotoFieldProps = {
  name: string;
  photoPath: string | null;
  previewUrl: string | null;
  savedPhotoPath: string | null;
  onChange: (next: { photoPath: string | null; previewUrl: string | null }) => void;
  onError?: (message: string) => void;
};

export function MemberPhotoField(props: MemberPhotoFieldProps) {
  return (
    <ProfilePhotoPicker
      label="Member photo"
      folder="members"
      {...props}
    />
  );
}
