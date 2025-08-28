// Dev WebSocket server that simulates the ESP8266+MCP2515 sniffer
// Emits CAN frames at a regular rate in the exact CSV format:
// ms,type,id_hex,dlc,HEX_BYTES
//
// Example:
// 1234,STD,1F0,8,10 22 00 7A 03 00 00 40

const { WebSocketServer } = require("ws");

const PORT = process.env.WS_PORT || 3303;
const FRAME_RATE = process.env.FPS || 50; // frames per second
const startTime = Date.now();

const wss = new WebSocketServer({ port: PORT,host: '0.0.0.0' });
console.log(`[CAN-WS] Listening on ws://localhost:${PORT}`);

wss.on("connection", (ws, req) => {
  console.log(`[CAN-WS] Client connected: ${req.socket.remoteAddress}`);

  ws.send(`${nowMs()},INFO,CONNECTED,0,dev_server`);

  ws.on("close", () => console.log("[CAN-WS] Client disconnected"));
});

// broadcast helper
function broadcast(line) {
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(line);
  }
}

// generate frames periodically
setInterval(() => {
  const frame = randomFrame();
  broadcast(frame);
}, 1000 / FRAME_RATE);

// ---- Frame generation ----
function randomFrame() {
  const ms = nowMs();

  const isExt = Math.random() < 0.2; // 20% extended frames
  const isRtr = Math.random() < 0.05; // 5% RTR

  const id = isExt
    ? Math.floor(Math.random() * 0x1FFFFFFF) // 29-bit
    : Math.floor(Math.random() * 0x7FF);     // 11-bit

  let dlc = isRtr ? Math.floor(Math.random() * 9) : Math.floor(Math.random() * 9);
  const bytes = isRtr ? [] : Array.from({ length: dlc }, randByte);

  const type = isExt ? "EXT" : "STD";
  const typeStr = isRtr ? `${type}:RTR` : type;
  const idHex = id.toString(16).toUpperCase();
  const dataHex = bytes.map(byteHex).join(" ");

  return `${ms},${typeStr},${idHex},${dlc},${dataHex}`;
}

function nowMs() {
  return Date.now() - startTime;
}
function randByte() {
  return Math.floor(Math.random() * 256);
}
function byteHex(b) {
  return b.toString(16).toUpperCase().padStart(2, "0");
}
