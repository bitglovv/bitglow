
const { Pool } = require('pg');

// Set empty password via environment variable
process.env.PGPASSWORD = '';

const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/bitglow',
});

async function test() {
    try {
        const res = await pool.query('SELECT 1');
        console.log('Connection successful');
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.rows.map(r => r.table_name));

        const usersTable = tables.rows.find(r => r.table_name === 'users');
        if (usersTable) {
            const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
            console.log('Users columns:');
            columns.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
        } else {
            console.log('Table "users" NOT found');
        }
    } catch (err) {
        console.error('Detailed Error:', err);
    } finally {
        await pool.end();
    }
}

test();
