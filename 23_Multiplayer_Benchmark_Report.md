# HUMAN WORLD — MULTIPLAYER BENCHMARK REPORT

## 1. OBJECTIVE
Benchmark the initial Node.js WebSocket backend to determine the theoretical scaling limits of a single-room instance. The test isolates message throughput capabilities before optimizing movement compression.

## 2. TEST PARAMETERS
- **Tool:** Headless Node.js WebSocket clients (`scripts/benchmark-multiplayer.mjs`).
- **Simulated Activity:** Each client sends a `move` coordinate update every 100ms (10 updates/second/client).
- **Server Logic:** Naive O(N²) broadcast. The server relays every movement message to every other client in the room.

## 3. RESULTS

### Scenario 1: 25 Simultaneous Users
- **Outbound:** ~250 messages/sec
- **Inbound:** ~6,000 messages/sec
- **Performance:** Excellent. The server comfortably handled the throughput with zero perceivable latency.

### Scenario 2: 50 Simultaneous Users
- **Outbound:** ~500 messages/sec
- **Inbound:** ~24,500 messages/sec
- **Performance:** Stable. The Node.js event loop processed ~25k messages per second without dropping connections.

### Scenario 3: 100 Simultaneous Users
- **Outbound:** ~1,000 messages/sec
- **Inbound:** ~98,000 to ~115,000 messages/sec
- **Performance:** Reaching theoretical un-optimized limits. The single-threaded Node.js server processed nearly 1 million total messages over a 10-second window. We observed slight throughput jitter (Sent/s occasionally dipped to ~975 from 1000), indicating the event loop was under heavy load.

## 4. CONCLUSION
A naive WebSocket implementation comfortably supports 50 concurrent users per room on a basic server.

At 100 concurrent users, the O(N²) broadcast topology generates over 100,000 messages per second. While the server survived this stress test without crashing, it is not viable for mobile/WebView clients to process 1,000 incoming JSON messages every second on the frontend thread.

## 5. NEXT STEPS (FOR FUTURE OPTIMIZATION)
Before scaling room capacity beyond 50 humans, we must implement:
1. **Tick-Based Broadcasting:** The server should batch movement updates into a single binary payload (e.g., ArrayBuffer) and transmit it 10-20 times per second, changing the topology from O(N²) to O(N).
2. **Spatial Hashing / Interest Management:** Clients should only receive updates for avatars within their visible viewport.
