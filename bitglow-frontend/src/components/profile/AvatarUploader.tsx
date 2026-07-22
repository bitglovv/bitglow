import { useState, ChangeEvent } from "react";
import { User, Camera, Loader2 } from "lucide-react";
import clsx from "clsx";
import { processAvatar } from "../../utils/image";
import { uploadAvatar } from "../../services/storage";

interface AvatarUploaderProps {
    currentAvatarUrl?: string;
    onUploadSuccess: (url: string) => void;
    onUploadError: (error: string) => void;
    onUploadStart: () => void;
    onUploadEnd: () => void;
}

export function AvatarUploader({
    currentAvatarUrl,
    onUploadSuccess,
    onUploadError,
    onUploadStart,
    onUploadEnd
}: AvatarUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Optimistic preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        setIsUploading(true);
        onUploadStart();

        try {
            const blob = await processAvatar(file);
            const uploadedUrl = await uploadAvatar(blob);
            onUploadSuccess(uploadedUrl);
        } catch (error: any) {
            onUploadError(error.message || "Failed to upload avatar");
            setPreviewUrl(null); // Revert preview on failure
        } finally {
            setIsUploading(false);
            onUploadEnd();
        }
    };

    const displayUrl = previewUrl || currentAvatarUrl;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <div className={clsx(
                    "w-28 h-28 rounded-full overflow-hidden bg-white/5 flex items-center justify-center transition-all",
                    isUploading && "opacity-50 blur-[2px] grayscale"
                )}>
                    {displayUrl ? (
                        <img src={displayUrl} alt="avatar preview" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-8 h-8 text-zinc-500" />
                    )}
                </div>

                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 z-10">
                        <Loader2 className="w-6 h-6 text-white animate-spin drop-shadow-md" />
                    </div>
                )}

                <label className={clsx(
                    "absolute inset-0 flex items-center justify-center rounded-full cursor-pointer z-20 group transition-all",
                    isUploading ? "pointer-events-none" : "hover:bg-black/20",
                    !displayUrl && !isUploading ? "bg-black/20" : "" // Show camera if no avatar
                )}>
                    {!isUploading && (
                        <Camera className={clsx(
                            "w-6 h-6 text-white drop-shadow-md transition-opacity",
                            displayUrl ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                        )} />
                    )}
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleAvatarChange} disabled={isUploading} />
                </label>
            </div>
            <p className="text-xs text-zinc-500">Change your profile picture</p>
        </div>
    );
}
