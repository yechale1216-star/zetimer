// @ts-nocheck
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

console.log('Attempting to connect to:', connectionString.replace(/:([^@]+)@/, ':****@'));

const client = new Client({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Successfully connected to the database!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
    if (err.stack) console.log(err.stack);
    process.exit(1);
  }
}

testConnection();
