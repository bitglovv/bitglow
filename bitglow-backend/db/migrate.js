const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bitglow'
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Add missing columns to users table
        try {
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0');
            console.log('Added followers_count column');
        } catch (err) {
            console.log('followers_count column already exists or error:', err.message);
        }

        try {
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS follows_count INTEGER DEFAULT 0');
            console.log('Added follows_count column');
        } catch (err) {
            console.log('follows_count column already exists or error:', err.message);
        }

        // Check if the users table has the new columns
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('followers_count', 'follows_count')
        `);
        
        console.log('Users table columns:');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });

        await client.end();
        console.log('Migration completed');
    } catch (err) {
        console.error('Migration failed:', err);
        await client.end();
        process.exit(1);
    }
}

runMigration();