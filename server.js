const app = require('./app');
const db = require('./config/mongoose');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const start = async () => {
  try {
    // connect to DB if configured
    await db.connect();

    const server = app.listen(PORT, HOST, () => {
      console.log(`Mobile Attribution Backend listening on http://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutdown signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
};

start();
