require("dotenv").config();

const { Client } = require("pg");

const client = new Client({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false,
    },
});

(async () => {
    try {
        console.log("Testing database connection...");
        await client.connect();
        console.log("✅ Connected!");
        const res = await client.query("SELECT NOW()");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
})();