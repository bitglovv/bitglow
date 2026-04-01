import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:26092008@localhost:5432/bitglow",
});

const rawLimit = Number(process.argv[2] || 500);
const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 500;

async function main() {
  const result = await pool.query(
    `WITH canonical_rooms AS (
        SELECT DISTINCT ON (r.created_by)
            r.id,
            r.created_by
        FROM live_rooms r
        ORDER BY r.created_by, r.created_at ASC, r.id ASC
     )
     SELECT lm.id AS "messageId",
            lm.room_id AS "roomId",
            room.created_by AS "roomOwnerId",
            owner_user.username AS "roomOwnerUsername",
            lm.sender_id AS "senderId",
            sender_user.username AS "senderUsername",
            lm.created_at AS "createdAt",
            CASE
              WHEN canonical.id IS DISTINCT FROM lm.room_id THEN 'non_canonical_room'
              ELSE 'sender_not_currently_allowed'
            END AS "auditStatus"
     FROM live_messages lm
     JOIN live_rooms room ON room.id = lm.room_id
     LEFT JOIN canonical_rooms canonical ON canonical.created_by = room.created_by
     LEFT JOIN users owner_user ON owner_user.id = room.created_by
     LEFT JOIN users sender_user ON sender_user.id = lm.sender_id
     WHERE canonical.id IS DISTINCT FROM lm.room_id
        OR (
             lm.sender_id <> room.created_by
             AND NOT EXISTS (
                 SELECT 1
                 FROM friends f1
                 JOIN friends f2
                   ON f1.user_id = room.created_by
                  AND f1.friend_id = lm.sender_id
                  AND f2.user_id = lm.sender_id
                  AND f2.friend_id = room.created_by
                 WHERE f1.status = 'accepted'
                   AND f2.status = 'accepted'
             )
        )
     ORDER BY lm.created_at DESC
     LIMIT $1`,
    [limit]
  );

  console.log("Suspicious live message audit");
  console.log("These rows are suspicious under current owner-room access rules only.");
  console.log("Review manually before deleting anything.\n");

  if (result.rows.length === 0) {
    console.log("No suspicious live messages found.");
    return;
  }

  console.table(
    result.rows.map((row) => ({
      messageId: row.messageId,
      roomId: row.roomId,
      roomOwnerId: row.roomOwnerId,
      roomOwnerUsername: row.roomOwnerUsername,
      senderId: row.senderId,
      senderUsername: row.senderUsername,
      createdAt: row.createdAt,
      auditStatus: row.auditStatus,
    }))
  );

  console.log(`\nFound ${result.rows.length} suspicious live messages.`);
}

main()
  .catch((error) => {
    console.error("Failed to run live-message audit:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
