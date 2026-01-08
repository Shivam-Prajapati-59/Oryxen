const PORT = process.env.PORT || 8080;

Bun.serve({
  port: PORT,
  fetch(req) {
    return Response.json({
      message: "Hello from Bun native server ⚡",
      method: req.method,
      url: req.url,
      time: new Date().toISOString(),
    });
  },
});

console.log(`Server running at http://localhost:${PORT}`);
