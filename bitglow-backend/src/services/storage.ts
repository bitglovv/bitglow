import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import crypto from "crypto";

let supabase: ReturnType<typeof createClient> | null = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
} else {
    console.warn("[Storage] Missing Supabase credentials. Uploads will fail.");
}

/**
 * Uploads an avatar image to Supabase Storage.
 * @param userId The ID of the user uploading the avatar
 * @param fileBuffer The binary content of the image
 * @param mimeType The MIME type (e.g. image/webp)
 * @returns The public HTTPS URL of the uploaded image
 */
export async function uploadAvatar(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (!supabase) {
        throw new Error("Storage is not configured on the server.");
    }

    const uuid = crypto.randomUUID();
    // Default to webp if we can't parse MIME for some reason, though it should always be present
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "webp";
    const filePath = `${userId}/${uuid}.${extension}`;

    const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
        });

    if (error) {
        console.error("[Storage] Avatar upload error:", error);
        throw new Error("Upload failed");
    }

    const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}
