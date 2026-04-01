const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:26092008@localhost:5432/bitglow'
});

async function testFeedQuery() {
  try {
    // Test the exact query from db.ts
    const res = await pool.query(`
      SELECT p.id,
             p.content,
             p.title,
             p.visibility,
             p.created_at,
             u.id   AS author_id,
             u.username,
             u.display_name,
             u.avatar_url,
             COALESCE(l.count, 0) AS "likesCount",
             COALESCE(c.count, 0) AS "commentsCount",
             COALESCE(s.count, 0) AS "savesCount",
             (SELECT 1 FROM post_likes pl2 WHERE pl2.user_id = 'adaa268f-1e14-4d20-b2f1-23060155167f' AND pl2.post_id = p.id LIMIT 1) AS "likedByMe",
             (SELECT 1 FROM post_saves ps2 WHERE ps2.user_id = 'adaa268f-1e14-4d20-b2f1-23060155167f' AND ps2.post_id = p.id LIMIT 1) AS "savedByMe"
      FROM posts p
      JOIN users u ON u.id = p.author_id
      LEFT JOIN LATERAL (
          SELECT count(*)::int AS count FROM post_likes pl WHERE pl.post_id = p.id
      ) l ON true
      LEFT JOIN LATERAL (
          SELECT count(*)::int AS count FROM post_comments pc WHERE pc.post_id = p.id
      ) c ON true
      LEFT JOIN LATERAL (
          SELECT count(*)::int AS count FROM post_saves ps WHERE ps.post_id = p.id
      ) s ON true
      WHERE
          p.visibility = 'public'
          OR p.author_id = 'adaa268f-1e14-4d20-b2f1-23060155167f'
          OR EXISTS (
              SELECT 1 FROM friends f
              WHERE p.author_id = 'adaa268f-1e14-4d20-b2f1-23060155167f'
          )
      ORDER BY p.created_at DESC
      LIMIT 10 OFFSET 0
    `);

    console.log('Raw row structure:');
    if (res.rows.length > 0) {
      console.log('Keys:', Object.keys(res.rows[0]));
      console.log('Sample row:', res.rows[0]);
      
      // Test the mapping
      const mapped = res.rows.map(row => ({
        id: row.id,
        content: row.content,
        title: row.title,
        visibility: row.visibility,
        createdAt: row.created_at,
        author: {
          id: row.author_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url
        },
        likesCount: row.likesCount,
        commentsCount: row.commentsCount,
        savesCount: row.savesCount,
        likedByMe: !!row.likedByMe,
        savedByMe: !!row.savedByMe,
      }));
      
      console.log('\nMapped structure:');
      console.log(mapped[0]);
    } else {
      console.log('No posts found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testFeedQuery();