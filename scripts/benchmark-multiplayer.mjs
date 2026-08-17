import WebSocket from 'ws';

const BOTS_COUNT = parseInt(process.argv[2]) || 25;
const SERVER_URL = 'ws://localhost:3001';

console.log(`Starting benchmark with ${BOTS_COUNT} simultaneous WebSocket connections...`);

let connected = 0;
let messagesReceived = 0;
let messagesSent = 0;

const bots = [];

for (let i = 0; i < BOTS_COUNT; i++) {
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    connected++;
    ws.send(JSON.stringify({
      type: 'join',
      roomId: 'central-plaza',
      name: `BenchBot_${i}`
    }));

    // Simulate movement every 100ms
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'move',
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 800
        }));
        messagesSent++;
      }
    }, 100);
  });

  ws.on('message', () => {
    messagesReceived++;
  });

  ws.on('error', (err) => {
    console.error(`Bot ${i} error:`, err);
  });

  bots.push(ws);
}

// Log stats every second
let lastReceived = 0;
let lastSent = 0;
const interval = setInterval(() => {
  const recvPerSec = messagesReceived - lastReceived;
  const sentPerSec = messagesSent - lastSent;
  lastReceived = messagesReceived;
  lastSent = messagesSent;

  console.log(`Connections: ${connected}/${BOTS_COUNT} | Sent/s: ${sentPerSec} | Recv/s: ${recvPerSec}`);
}, 1000);

// Run for 10 seconds then exit
setTimeout(() => {
  clearInterval(interval);
  console.log(`\nBenchmark Complete.`);
  console.log(`Total Messages Sent: ${messagesSent}`);
  console.log(`Total Messages Received: ${messagesReceived}`);
  bots.forEach(b => b.close());
  process.exit(0);
}, 10000);
