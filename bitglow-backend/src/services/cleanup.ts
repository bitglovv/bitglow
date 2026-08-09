import { db } from "./db";

let cleanupInterval: NodeJS.Timeout | null = null;

// Security log retention: keep logs for this many days (default 90).
// Override with SECURITY_LOG_RETENTION_DAYS env var.
const SECURITY_LOG_RETENTION_DAYS = Math.max(
    1,
    parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || "90", 10) || 90
);

async function pruneSecurityLogs(): Promise<number> {
    const res = await db.query(
        `DELETE FROM security_logs WHERE created_at < NOW() - ($1::int * interval '1 day')`,
        [SECURITY_LOG_RETENTION_DAYS]
    );
    return res.rowCount ?? 0;
}

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

        // Also prune old security logs on startup
        try {
            const prunedLogs = await pruneSecurityLogs();
            if (prunedLogs > 0) {
                console.log(`[Cleanup Service] Pruned ${prunedLogs} security log entries older than ${SECURITY_LOG_RETENTION_DAYS} days.`);
            }
        } catch (err) {
            console.error("[Cleanup Service] Error during security log pruning:", err);
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

        // Prune old security logs
        try {
            const prunedLogs = await pruneSecurityLogs();
            if (prunedLogs > 0) {
                console.log(`[Cleanup Service] Pruned ${prunedLogs} security log entries older than ${SECURITY_LOG_RETENTION_DAYS} days.`);
            }
        } catch (err) {
            console.error("[Cleanup Service] Error during security log pruning:", err);
        }
    }, 6 * 3600 * 1000);
}

export function stopBackgroundAccountCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
