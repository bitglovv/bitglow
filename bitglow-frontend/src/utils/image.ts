export async function processAvatar(file: File): Promise<Blob> {
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size must be less than ${MAX_SIZE_MB}MB.`);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
        throw new Error("Invalid image type. Only JPEG, PNG, and WebP are allowed.");
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 500;
            const MAX_HEIGHT = 500;

            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return reject(new Error("Failed to initialize image processor"));
            }

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Export to WebP
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to compress image"));
                    }
                },
                "image/webp",
                0.85 // quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Invalid or corrupted image file"));
        };

        img.src = url;
    });
}
