import { createServer } from 'http';
import app from './app';
import { initSocket } from './socket';
import prisma from './config/db';

const PORT = Number(process.env.PORT) || 5000;
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Drop the unique constraint on School.name if it still exists (schema migration workaround)
async function applyStartupMigrations() {
  try {
    await prisma.$executeRaw`ALTER TABLE "School" DROP CONSTRAINT IF EXISTS "School_name_key"`;
    console.log('[migration] School name uniqueness constraint removed (or was already absent).');
  } catch (e) {
    console.warn('[migration] Could not remove School_name_key constraint:', e);
  }
}

applyStartupMigrations().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

