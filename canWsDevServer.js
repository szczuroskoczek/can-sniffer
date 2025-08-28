#!/usr/bin/env node
/**
 * CAN Dev WebSocket server + TUI (single file)
 * Emits CSV frames exactly like the ESP sketch:
 *   ms,type,id_hex,dlc,HEX_BYTES
 *
 * Signals implemented:
 * - 0x1F0 (STD): Engine/Vehicle: RPM (u16, rpm*4, big-endian), Speed kph (u8), Throttle % (u8)
 * - 0x130 (STD): Doors/Locks bitfield: [bits] FL,FR,RL,RR open; bit7=locked; bit6=trunk
 * - 0x12F (STD): Button events: [code,u8][state,u8] where state 1=press,0=release
 * - 0x3D0 (STD): Lights/Indicators bitfield: bit0=low,1=high,2=left,3=right,4=hazard
 * - 0x2F0 (STD): Heartbeat (u8 rolling counter)
 *
 * Plus randomized filler frames (STD/EXT/RTR).
 *
 * WebSocket control JSON (optional):
 * {op:'pause',on:true|false}
 * {op:'setRate',fps:Number}
 * {op:'setRatios',ext:0..1,rtr:0..1}
 * {op:'tx', id:'0x1F0'|'1F0'|Number, ext:false, rtr:false, dlc:0..8, data:'AA BB ...'}
 * {op:'cmd', name:'setRpm'|'setSpeed'|'openDoor'|'closeDoor'|'lock'|'unlock'|'lights'|'indicator'|'horn', args:{...}}
 */

const { WebSocketServer } = require('ws');
const term = require('terminal-kit').terminal;

// ---------- Config ----------
const PORT = parseInt(process.env.WS_PORT || '3303', 10);
let   GEN_FPS = parseFloat(process.env.FPS || '50');   // random frame generator
let   EXT_RATIO = clamp01(parseFloat(process.env.EXT_RATIO || '0.20'));
let   RTR_RATIO = clamp01(parseFloat(process.env.RTR_RATIO || '0.05'));
const HOST = '0.0.0.0';

const ENGINE_HZ = 20;         // engine/vehicle frame rate
const HEARTBEAT_HZ = 2;       // heartbeat rate
const FILLER_ON = true;       // random filler frames

// ---------- WS server ----------
const wss = new WebSocketServer({ host: HOST, port: PORT });
const boot = Date.now();

log(`Listening on ws://${HOST}:${PORT}`);

wss.on('connection', (ws, req) => {
  const peer = `${req.socket.remoteAddress}`;
  log(`Client connected: ${peer}`);
  sendWs(ws, csvInfo('CONNECTED', 'dev_server'));

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); }
    catch { sendWs(ws, csvErr('BAD_JSON', '')); return; }
    handleControl(ws, msg);
  });

  ws.on('close', () => log(`Client disconnected: ${peer}`));
});

// ---------- Simulation state ----------
const state = {
  ignition: false,
  engineOn: false,
  rpm: 0,                // real rpm
  targetRpm: 0,
  speed: 0,              // kph
  targetSpeed: 0,
  throttle: 0,           // 0..100
  brake: 0,              // 0..100
  doors: { FL:false, FR:false, RL:false, RR:false, trunk:false },
  locked: false,
  lights: { low:false, high:false, left:false, right:false, hazard:false },
  horn: false,
  heartbeat: 0,
};

// ---------- Schedulers ----------
let running = true;
setInterval(()=>{ if (running && FILLER_ON) broadcast(randomFrameCsv()); }, Math.max(1, Math.round(1000/GEN_FPS)));
setInterval(()=>{ if (running) emitEngineVehicleFrame(); }, Math.round(1000/ENGINE_HZ));
setInterval(()=>{ if (running) emitHeartbeat(); }, Math.round(1000/HEARTBEAT_HZ));

// physics-ish update @50Hz
setInterval(()=>{ if (running) tickDynamics(); drawTui(); }, 20);

// ---------- TUI ----------
term.clear();
term.grabInput({ mouse: 'button' });
process.on('exit', () => term.grabInput(false));
printHelp();

term.on('key', (name, matches, data) => {
  switch (name) {
    case 'CTRL_C':
    case 'q':
      term.styleReset(); term('\nExiting...\n');
      process.exit(0);

    case 'g': // ignition toggle
      state.ignition = !state.ignition;
      if (!state.ignition) { state.engineOn = false; state.targetRpm = 0; state.targetSpeed = 0; }
      banner(`Ignition ${state.ignition?'ON':'OFF'}`);
      break;

    case 'e': // engine toggle
      if (!state.ignition) { banner('Ignition is OFF'); break; }
      state.engineOn = !state.engineOn;
      state.targetRpm = state.engineOn ? 900 : 0;
      banner(`Engine ${state.engineOn?'STARTED':'STOPPED'}`);
      break;

    case 'UP': // accelerate
      state.throttle = clamp(0, 100, state.throttle + 5);
      state.brake = 0;
      state.targetSpeed = clamp(0, 250, state.targetSpeed + 5);
      state.targetRpm   = rpmForSpeed(state.targetSpeed);
      break;

    case 'DOWN': // decelerate / brake
      state.brake = clamp(0, 100, state.brake + 10);
      state.throttle = 0;
      state.targetSpeed = clamp(0, 250, state.targetSpeed - 8);
      state.targetRpm   = rpmForSpeed(state.targetSpeed);
      break;

    case 'LEFT': // indicator left
      state.lights.left = !state.lights.left; if (state.lights.left) state.lights.right = false;
      emitLights();
      break;
    case 'RIGHT':
      state.lights.right = !state.lights.right; if (state.lights.right) state.lights.left = false;
      emitLights();
      break;

    case 'h': // hazard
      state.lights.hazard = !state.lights.hazard;
      emitLights();
      break;

    case 'l': // lock/unlock
      state.locked = !state.locked;
      emitDoors();
      break;

    case 'o': // toggle all doors
      const openAny = !(state.doors.FL && state.doors.FR && state.doors.RL && state.doors.RR);
      state.doors.FL = state.doors.FR = state.doors.RL = state.doors.RR = openAny;
      emitDoors();
      break;
    case '1': state.doors.FL = !state.doors.FL; emitDoors(); break;
    case '2': state.doors.FR = !state.doors.FR; emitDoors(); break;
    case '3': state.doors.RL = !state.doors.RL; emitDoors(); break;
    case '4': state.doors.RR = !state.doors.RR; emitDoors(); break;
    case 't': state.doors.trunk = !state.doors.trunk; emitDoors(); break;

    case ' ': // horn (momentary)
      state.horn = true; emitButton('HORN', 1);
      setTimeout(()=>{ state.horn=false; emitButton('HORN', 0); }, 200);
      break;

    case 'H': // high beam
      state.lights.high = !state.lights.high; emitLights(); break;
    case 'L': // low beam
      state.lights.low = !state.lights.low; emitLights(); break;

    case '+': case '=':
      GEN_FPS = clamp(1, 500, GEN_FPS + 5);
      banner(`Gen FPS: ${GEN_FPS}`);
      break;
    case '-': case '_':
      GEN_FPS = clamp(1, 500, GEN_FPS - 5);
      banner(`Gen FPS: ${GEN_FPS}`);
      break;

    case 'p':
      running = !running; banner(running ? 'RUNNING' : 'PAUSED'); break;
  }
});

// ---------- Emitters (CSV frames) ----------
function emitEngineVehicleFrame() {
  // 0x1F0: [rpm_hi, rpm_lo, speed, throttle, ...pad]
  const rpmEnc = Math.round(state.rpm * 4); // same as OBD-II PID scaling
  const hi = (rpmEnc >> 8) & 0xFF, lo = rpmEnc & 0xFF;
  const kph = clamp(0, 255, Math.round(state.speed));
  const thr = clamp(0, 100, Math.round(state.throttle));
  const bytes = [hi, lo, kph, thr, 0, 0, 0, 0];
  broadcast(csvFrame('STD', 0x1F0, bytes.length, bytes));
}

function emitDoors() {
  // 0x130: bit0 FL,1 FR,2 RL,3 RR, bit6 TRUNK, bit7 LOCKED
  let b0 = 0;
  if (state.doors.FL) b0 |= 1<<0;
  if (state.doors.FR) b0 |= 1<<1;
  if (state.doors.RL) b0 |= 1<<2;
  if (state.doors.RR) b0 |= 1<<3;
  if (state.doors.trunk) b0 |= 1<<6;
  if (state.locked) b0 |= 1<<7;
  const bytes = [b0, 0,0,0,0,0,0,0];
  broadcast(csvFrame('STD', 0x130, 2, bytes.slice(0,2)));
}

function emitLights() {
  // 0x3D0: bit0 low,1 high,2 left,3 right,4 hazard
  let b0 = 0;
  if (state.lights.low)    b0 |= 1<<0;
  if (state.lights.high)   b0 |= 1<<1;
  if (state.lights.left)   b0 |= 1<<2;
  if (state.lights.right)  b0 |= 1<<3;
  if (state.lights.hazard) b0 |= 1<<4;
  const bytes = [b0];
  broadcast(csvFrame('STD', 0x3D0, 1, bytes));
}

function emitButton(code, pressed) {
  // 0x12F: [code,u8][state,u8]
  // We’ll hash some codes to bytes
  const c = (hash8(code) & 0xFF);
  const bytes = [c, pressed & 1];
  broadcast(csvFrame('STD', 0x12F, 2, bytes));
}

function emitHeartbeat() {
  state.heartbeat = (state.heartbeat + 1) & 0xFF;
  const bytes = [state.heartbeat];
  broadcast(csvFrame('STD', 0x2F0, 1, bytes));
}

// ---------- Random filler frames ----------
function randomFrameCsv() {
  const isExt = Math.random() < EXT_RATIO;
  const isRtr = Math.random() < RTR_RATIO;
  const id = isExt ? randInt(0, 0x1FFFFFFF) : randInt(0, 0x7FF);
  const dlc = randInt(0, 8);
  const data = isRtr ? [] : Array.from({ length: dlc }, () => randInt(0,255));
  const type = isRtr ? (isExt?'EXT:RTR':'STD:RTR') : (isExt?'EXT':'STD');
  return csv(type, id, dlc, data);
}

// ---------- WebSocket helpers ----------
function csvFrame(type, id, dlc, bytes) {
  return csv(type, id, dlc, bytes);
}
function csv(type, id, dlc, bytes) {
  const idHex = id.toString(16).toUpperCase();
  const dataHex = (bytes||[]).map(b => b.toString(16).toUpperCase().padStart(2,'0')).join(' ');
  return `${now()} ,${type},${idHex},${dlc},${dataHex}`.replace(/^(\d+)\s,/, '$1,'); // keep exact commas
}
function csvInfo(idHex, data='') { return `${now()},INFO,${idHex},0,${data}`; }
function csvErr(idHex, data='')  { return `${now()},ERR,${idHex},0,${data}`; }

function broadcast(line) {
  for (const c of wss.clients) if (c.readyState === 1) c.send(line);
}
function sendWs(ws, line){ if (ws.readyState === 1) ws.send(line); }

// ---------- Control channel ----------
function handleControl(ws, msg) {
  switch (msg.op) {
    case 'pause': running = !!msg.on; sendWs(ws, csvInfo(running?'RUNNING':'PAUSED')); break;
    case 'setRate': {
      const n = Number(msg.fps);
      if (!Number.isFinite(n) || n <= 0) { sendWs(ws, csvErr('BAD_FPS')); break; }
      GEN_FPS = clamp(1, 500, n);
      sendWs(ws, csvInfo('FPS', String(GEN_FPS)));
      break;
    }
    case 'setRatios': {
      if (msg.ext != null) EXT_RATIO = clamp01(Number(msg.ext));
      if (msg.rtr != null) RTR_RATIO = clamp01(Number(msg.rtr));
      sendWs(ws, csvInfo('RATIOS', `ext=${EXT_RATIO},rtr=${RTR_RATIO}`));
      break;
    }
    case 'tx': {
      // Echo custom frame to all listeners
      const ext = !!msg.ext, rtr = !!msg.rtr;
      const id = normalizeId(msg.id, ext);
      if (id == null) { sendWs(ws, csvErr('BAD_ID')); break; }
      let dlc = Number(msg.dlc ?? 0);
      if (!Number.isInteger(dlc) || dlc < 0 || dlc > 8) dlc = 0;
      const bytes = rtr ? [] : parseBytes(msg.data);
      if (!rtr && msg.dlc == null) dlc = bytes.length;
      const type = rtr ? (ext ? 'EXT:RTR' : 'STD:RTR') : (ext ? 'EXT' : 'STD');
      broadcast(csv(type, id, dlc, bytes));
      break;
    }
    case 'cmd': {
      // Simple state commands from client
      const { name, args = {} } = msg;
      if (name === 'setRpm') state.targetRpm = clamp(0, 7000, Number(args.rpm)||0);
      else if (name === 'setSpeed') state.targetSpeed = clamp(0, 250, Number(args.kph)||0);
      else if (name === 'openDoor') setDoor(args.pos, true), emitDoors();
      else if (name === 'closeDoor') setDoor(args.pos, false), emitDoors();
      else if (name === 'lock') state.locked = true, emitDoors();
      else if (name === 'unlock') state.locked = false, emitDoors();
      else if (name === 'lights') setLights(args), emitLights();
      else if (name === 'indicator') setIndicator(args.side), emitLights();
      else if (name === 'horn') state.horn = !!args.on, emitButton('HORN', state.horn?1:0);
      sendWs(ws, csvInfo('CMD_OK', name||''));
      break;
    }
    case 'ping': sendWs(ws, csvInfo('PONG')); break;
    default: sendWs(ws, csvErr('BAD_OP', String(msg.op)));
  }
}

function setDoor(pos, open) {
  const k = String(pos||'').toUpperCase();
  if (k === 'FL'||k==='FR'||k==='RL'||k==='RR'||k==='TRUNK') {
    if (k==='TRUNK') state.doors.trunk = !!open;
    else state.doors[k] = !!open;
  }
}
function setLights(a) {
  const on = (v)=>!!v;
  if ('low' in a) state.lights.low = on(a.low);
  if ('high' in a) state.lights.high = on(a.high);
  if ('hazard' in a) state.lights.hazard = on(a.hazard);
  if ('left' in a) state.lights.left = on(a.left);
  if ('right'in a) state.lights.right= on(a.right);
}
function setIndicator(side){
  if (side==='left'){ state.lights.left = !state.lights.left; if (state.lights.left) state.lights.right=false; }
  if (side==='right'){ state.lights.right= !state.lights.right; if (state.lights.right) state.lights.left=false; }
}

// ---------- Dynamics ----------
function tickDynamics() {
  // simple ramp/smoothing
  const rpmAlpha = 0.12, spdAlpha = 0.10;

  // If engine off, decay
  if (!state.engineOn) {
    state.targetRpm = 0;
    state.targetSpeed = Math.max(0, state.targetSpeed - 1 - state.brake*0.05);
  } else {
    // throttle influences target
    const add = state.throttle * 0.08;
    state.targetSpeed = clamp(0, 250, state.targetSpeed + add - state.brake*0.15);
    state.targetRpm = rpmForSpeed(state.targetSpeed) + (state.throttle*15);
  }

  state.rpm += (state.targetRpm - state.rpm) * rpmAlpha;
  state.speed += (state.targetSpeed - state.speed) * spdAlpha;

  // natural decay of inputs
  state.brake = Math.max(0, state.brake - 2);
  state.throttle = Math.max(0, state.throttle - 1);

  // emit occasional engine frame even if no big change (handled by interval)
}

function rpmForSpeed(kph) {
  // Faux mapping: 5th gear-ish; RPM ~= 50*kph + idle
  if (!state.engineOn) return 0;
  return Math.max(700, Math.min(6000, 50 * (kph/10)));
}

// ---------- TUI rendering ----------
function printHelp() {
  term.bold.green("\nCAN Dev WS + TUI\n");
  term("Controls: ");
  term.gray("q")(": quit  ");
  term.gray("g")(": ignition  ");
  term.gray("e")(": engine  ");
  term.gray("\u2191/\u2193")(": accel/brake  ");
  term.gray("\u2190/\u2192")(": indicators  ");
  term.gray("h")(": hazard  ");
  term.gray("L")(": low beam  ");
  term.gray("H")(": high beam  ");
  term.gray("space")(": horn  ");
  term.gray("o/1/2/3/4/t")(": doors FL/FR/RL/RR/trunk  ");
  term.gray("l")(": lock/unlock  ");
  term.gray("+/-")(": filler FPS  ");
  term.gray("p")(": pause filler\n\n");
}

let lastDraw = 0;
function drawTui() {
  const nowTs = Date.now();
  if (nowTs - lastDraw < 80) return; // ~12 fps
  lastDraw = nowTs;

  term.moveTo(1, 8);
  term.eraseDisplayBelow();

  term.bold("State:\n");
  term(` Ignition: ${state.ignition?term.green('ON'):term.red('OFF')}   `);
  term(`Engine: ${state.engineOn?term.green('ON'):term.red('OFF')}   `);
  term(`Locked: ${state.locked?term.green('YES'):term.red('NO')}   `);
  term(`Hazard: ${state.lights.hazard?'ON':'OFF'}\n`);

  term(` RPM: ${state.rpm.toFixed(0)}  (target ${state.targetRpm.toFixed(0)})   `);
  term(`Speed: ${state.speed.toFixed(1)} kph  (target ${state.targetSpeed.toFixed(1)})\n`);
  term(` Throttle: ${state.throttle|0}%   Brake: ${state.brake|0}%\n`);

  term(` Doors: FL=${flag(state.doors.FL)} FR=${flag(state.doors.FR)} RL=${flag(state.doors.RL)} RR=${flag(state.doors.RR)} TRUNK=${flag(state.doors.trunk)}\n`);
  term(` Lights: low=${flag(state.lights.low)} high=${flag(state.lights.high)} left=${flag(state.lights.left)} right=${flag(state.lights.right)} hazard=${flag(state.lights.hazard)}\n`);
  term(` Filler: ${FILLER_ON?flag(running):'OFF'}  GEN_FPS=${GEN_FPS}  EXT=${Math.round(EXT_RATIO*100)}%  RTR=${Math.round(RTR_RATIO*100)}%\n`);
}

function flag(v){ return v ? term.green('ON') : term.gray('OFF'); }
function banner(s){ term.moveTo(1,6); term.eraseLine(); term.bold.cyan(` ${s}\n`); }

// ---------- Utils ----------
function now(){ return Date.now() - boot; }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(lo,hi,v){ return Math.max(lo, Math.min(hi, v)); }
function clamp01(x){ x = Number(x); return Number.isFinite(x) ? clamp(0,1,x) : 0; }
function log(...a){ console.log('[CAN-WS]', ...a); }
function hash8(str){ let h=0; for (let i=0;i<str.length;i++) h=(h*31 + str.charCodeAt(i))&0xFF; return h; }

function normalizeId(id, isExt){
  let n;
  if (typeof id === 'number') n = id >>> 0;
  else if (typeof id === 'string') {
    const s = id.trim().toUpperCase().replace(/^0X/, '');
    if (!/^[0-9A-F]+$/.test(s)) return null;
    n = parseInt(s,16)>>>0;
  } else return null;
  return isExt ? (n & 0x1FFFFFFF) : (n & 0x7FF);
}
function parseBytes(x){
  if (Array.isArray(x)) return x.slice(0,8).map(n => Number(n)&0xFF);
  if (x == null) return [];
  let s = String(x).trim().toUpperCase();
  s = s.replace(/[^0-9A-F]/g,' ').replace(/\s+/g,' ').trim();
  if (!s) return [];
  return s.split(' ').slice(0,8).map(h => parseInt(h,16)&0xFF);
}
