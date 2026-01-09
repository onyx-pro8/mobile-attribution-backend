const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Mobile Attribution Backend Service    ║
╠════════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV || 'development'.padEnd(27)} ║
║  Server: http://${HOST}:${PORT}${' '.repeat(Math.max(0, 18 - HOST.length - PORT.toString().length))} ║
║  API Prefix: ${process.env.API_PREFIX || '/api/v1'.padEnd(28)} ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
