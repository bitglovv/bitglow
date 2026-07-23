import { db } from "./db";

let cleanupInterval: NodeJS.Timeout | null = null;

export function startBackgroundAccountCleanup() {
    // Run initial cleanup check 10 seconds after server start
    setTimeout(async () => {
        try {
            console.log("[Cleanup Service] Running initial check for expired deleted accounts...");
            const purgedCount = await db.purgeExpiredDeletedAccounts();
            if (purgedCount > 0) {
                console.log(`[Cleanup Service] Initial check purged ${purgedCount} expired accounts.`);
            }
        } catch (err) {
            console.error("[Cleanup Service] Error during initial account purge:", err);
        }
    }, 10000);

    // Schedule periodic check every 6 hours (6 * 3600 * 1000 ms)
    cleanupInterval = setInterval(async () => {
        try {
            console.log("[Cleanup Service] Running scheduled purge check for expired accounts...");
            const purgedCount = await db.purgeExpiredDeletedAccounts();
            if (purgedCount > 0) {
                console.log(`[Cleanup Service] Scheduled purge job removed ${purgedCount} expired accounts.`);
            }
        } catch (err) {
            console.error("[Cleanup Service] Error during scheduled account purge:", err);
        }
    }, 6 * 3600 * 1000);
}

export function stopBackgroundAccountCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
