// Production-like local entrypoint: serve the built React application and API
// together on one port. The server resolves its own dependencies from /server.
process.env.PORT ||= '3000';
process.env.CLIENT_URL ||= `http://localhost:${process.env.PORT},http://127.0.0.1:${process.env.PORT}`;
await import('../server/src/server.js');
