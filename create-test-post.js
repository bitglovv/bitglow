const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:26092008@localhost:5432/bitglow'
});

async function createTestPost() {
  try {
    // Create a test post
    const res = await pool.query(
      "INSERT INTO posts (author_id, content, title, visibility) VALUES ('adaa268f-1e14-4d20-b2f1-23060155167f', 'Test post content for like testing', 'Test Title', 'public') RETURNING id"
    );
    
    const postId = res.rows[0].id;
    console.log('Created post with ID:', postId);
    
    // Like the post
    await pool.query(
      'INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)',
      ['adaa268f-1e14-4d20-b2f1-23060155167f', postId]
    );
    
    console.log('Liked the post');
    
    // Verify the like count
    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1',
      [postId]
    );
    
    console.log('Like count:', countRes.rows[0].count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestPost();