import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function checkColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    // Query system catalog to get column names for 'companion_state' table
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companion_state';
    `);

    console.log("Columns in 'companion_state':");
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    client.release();
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkColumns();