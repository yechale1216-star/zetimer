import { createServer } from 'http';
import app from './app';
import { initSocket } from './socket';

const PORT = Number(process.env.PORT) || 5000;
const httpServer = createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

httpServer.listen(PORT, 'localhost', () => {
  console.log(`Server is running on port ${PORT}`);
});
