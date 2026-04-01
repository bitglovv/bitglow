
const { Pool } = require('pg');
const net = require('net');

async function checkPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, '127.0.0.1');
    });
}

async function run() {
    console.log('🔍 BitGlow Diagnostics 🔍');
    console.log('-------------------------');

    const pgPort = 5432;
    const mysqlPort = 3306;
    const backendPort = 3003;

    console.log(`Checking PostgreSQL (Port ${pgPort})...`);
    const pgUp = await checkPort(pgPort);
    console.log(pgUp ? '✅ PostgreSQL is ACTIVE' : '❌ PostgreSQL is DOWN');

    console.log(`Checking MySQL/XAMPP (Port ${mysqlPort})...`);
    const mysqlUp = await checkPort(mysqlPort);
    console.log(mysqlUp ? '✅ MySQL is ACTIVE' : '❌ MySQL is DOWN');

    console.log(`Checking Backend (Port ${backendPort})...`);
    const backendUp = await checkPort(backendPort);
    console.log(backendUp ? '✅ Backend is RUNNING' : '❌ Backend is NOT RUNNING');

    if (pgUp) {
        console.log('\nTrying database connection...');
        const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/bitglow' });
        try {
            await pool.query('SELECT 1');
            console.log('✅ Database connection SUCCESS');
        } catch (err) {
            console.log('❌ Database connection FAILED:', err.message);
        } finally {
            await pool.end();
        }
    } else {
        console.log('\n💡 SUGGESTION: Your PostgreSQL database is not running.');
        console.log('Since you have XAMPP (MySQL) active, did you mean to use MySQL?');
        console.log('Or do you need to start the PostgreSQL service?');
    }
}

run();
