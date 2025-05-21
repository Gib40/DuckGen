// keepalive.js

setInterval(() => {
  const now = new Date().toLocaleTimeString();
  console.log(`[Keep-Alive] Still here at ${now}`);
}, 240000); // 4 minutes
