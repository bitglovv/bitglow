require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('✅ Successfully connected to database!');
        
        // Test a simple query
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query test successful:', result.rows[0]);
        
        // Check if users table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ Users table exists');
            
            // Count users
            const userCount = await client.query('SELECT COUNT(*) FROM users');
            console.log(`📊 Total users in database: ${userCount.rows[0].count}`);
        } else {
            console.log('❌ Users table does not exist - you need to run the migration');
        }
        
        await client.end();
        console.log('✅ Connection closed');
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        
        if (err.code === '28P01') {
            console.log('\n🔧 AUTHENTICATION ERROR SOLUTIONS:');
            console.log('1. Check your PostgreSQL password in .env file');
            console.log('2. Common default passwords: postgres, root, or empty password');
            console.log('3. If using XAMPP, the default password might be empty');
            console.log('4. Update your .env file with the correct password');
        }
        
        await client.end();
        process.exit(1);
    }
}

testConnection();