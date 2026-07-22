import { fetchWithAuth, readErrorMessage } from "./api";

export async function uploadAvatar(fileBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("file", fileBlob, "avatar.webp");

    const res = await fetchWithAuth("/upload/avatar", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        throw new Error(await readErrorMessage(res, "Failed to upload avatar"));
    }

    const data = await res.json();
    if (!data.url) {
        throw new Error("Invalid response from server: Missing URL");
    }

    return data.url;
}
