# TCP Congestion Control Simulator — How It Works

> A React-based interactive simulator for studying TCP congestion control algorithms, network topology, packet loss behaviour, and real-time performance metrics.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Core Concepts: TCP Congestion Control](#4-core-concepts-tcp-congestion-control)
5. [Module-by-Module Breakdown](#5-module-by-module-breakdown)
   - [App.js — Main Controller](#51-appjs--main-controller)
   - [simulation.js — The Engine](#52-simulationjs--the-engine)
   - [FastCongestionControl.js — Advanced Algorithm](#53-fastcongestioncontroljs--advanced-algorithm)
   - [NetworkDashboard.js — Live Charts](#54-networkdashboardjs--live-charts)
   - [Logger.js — Event Logger](#55-loggerjs--event-logger)
   - [SimulationReport.js — PDF Export](#56-simulationreportjs--pdf-export)
6. [Step-by-Step User Flow](#6-step-by-step-user-flow)
7. [TCP Algorithm Deep Dive](#7-tcp-algorithm-deep-dive)
8. [Data Flow Diagram](#8-data-flow-diagram)
9. [State Management Reference](#9-state-management-reference)
10. [Metrics Explained](#10-metrics-explained)
11. [Export & Reporting](#11-export--reporting)
12. [Running the Project](#12-running-the-project)

---

## 1. Project Overview

This simulator lets you:
- Build a **custom network topology** (nodes + connections)
- Run **TCP congestion control** step by step or in real-time auto mode
- Inject **packet loss** manually or by percentage
- Observe **live charts** for throughput, packet loss, latency, and congestion window
- Switch between **Default TCP** and **Fast Congestion Control** algorithms
- **Export logs** (CSV/JSON) and generate a **PDF report**

The project is entirely frontend — no backend server required. All simulation logic runs in the browser.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (Create React App) |
| Charts | Chart.js 4 + react-chartjs-2 |
| PDF Generation | jsPDF |
| File Download | file-saver |
| Styling | Vanilla CSS (dark-mode design system) |
| Fonts | Inter + JetBrains Mono (Google Fonts) |

---

## 3. Project Structure

```
src/
├── App.js                  # Root component — state management & UI layout
├── App.css                 # Full dark-mode design system
├── index.js                # React entry point
├── index.css               # Global base styles
│
├── simulation.js           # Core TCP simulation engine (class-based)
├── FastCongestionControl.js# Fast Retransmit + Fast Recovery algorithm
├── NetworkDashboard.js     # 4-panel live chart dashboard
├── Logger.js               # Event log manager + CSV/JSON export
└── SimulationReport.js     # PDF report generator using jsPDF
```

---

## 4. Core Concepts: TCP Congestion Control

Before reading the code, understand these TCP fundamentals:

### Congestion Window (cwnd)
The number of packets a sender is allowed to have "in flight" (sent but not yet acknowledged) at any moment. It limits how fast data is sent.

### Slow Start Threshold (ssthresh)
A boundary value. Below it → **Slow Start** (exponential growth). Above it → **Congestion Avoidance** (linear growth).

### Slow Start Phase
- Starts with `cwnd = 1`
- Every acknowledged packet: `cwnd` doubles each round
- Continues until `cwnd >= ssthresh` or a loss occurs

### Congestion Avoidance Phase
- Once `cwnd >= ssthresh`, growth slows
- `cwnd` increases by 1 per round (additive increase)

### Packet Loss Response
- `ssthresh = max(2, cwnd / 2)` — halve the threshold
- `cwnd = 1` — reset to slow start
- This is called **Multiplicative Decrease**

Together these form **AIMD** — Additive Increase / Multiplicative Decrease.

---

## 5. Module-by-Module Breakdown

### 5.1 `App.js` — Main Controller

This is the brain of the application. It holds **all simulation state** in React `useState` hooks and orchestrates every other module.

#### Key State Variables

| State | Type | Purpose |
|---|---|---|
| `nodes` | Array | All network nodes, each with `cwnd`, `ssthresh`, `ack`, `sent`, `lost`, `connections` |
| `connections` | Array | List of `[from, to]` pairs defining network links |
| `numNodes` | Number | How many nodes the user wants to create |
| `selectedNodeId` | Number | Which node is the current source |
| `selectedDestNodeId` | Number | Which node is the destination |
| `throughput` | Array | `{x, y}` data points for the throughput chart |
| `packetLoss` | Array | `{x, y}` data points for the packet loss chart |
| `latency` | Array | `{x, y}` data points for the latency chart |
| `congestionWindow` | Array | `{x, y}` data points for the cwnd chart |
| `simulationTime` | Number | Increments each step — used as the X axis |
| `isAutoSimulationRunning` | Boolean | Whether auto-simulation timer is active |
| `algorithm` | String | `'default'` or `'fast_congestion_control'` |
| `lossMode` | String | `'manual'` or `'percentage'` |
| `simulation` | Object | The `Simulation` class instance |
| `logger` | Object | The `Logger` class instance |

#### Node Object Shape

Each node is a plain JavaScript object:

```js
{
  id: 0,            // Unique node identifier
  cwnd: 1,          // Congestion window (starts at 1)
  ssthresh: 64,     // Slow start threshold (starts at 64)
  ack: 0,           // Total acknowledged packets
  sent: [0],        // Array of packet sequence numbers queued to send
  lost: [],         // Array of sequence numbers marked as lost
  connections: []   // IDs of connected neighbour nodes
}
```

#### Core Functions in App.js

**`createNodes()`**
Creates N node objects and instantiates the `Simulation` engine with them.

**`addConnection()`**
Validates and adds a bidirectional link between two nodes. Updates both nodes' `.connections` arrays.

**`handleClick()`** — Manual step
1. Verifies the source→destination connection exists
2. Calls `simulation.simulateNodeStep(node)`
3. Calls `updateNetworkMetrics()` to push new chart points

**`toggleAutoSimulation()`**
Starts/stops a `setInterval` timer (1 second) that calls `simulateStep()` on all nodes automatically.

**`updateNetworkMetrics()`**
Reads the latest metrics from the simulation engine and appends `{x: time, y: value}` data points to all four chart state arrays.

**`simulatePacketLoss(percentage)`**
Randomly selects `percentage`% of sent packets and marks them as lost by adding their sequence numbers to `node.lost[]`.

**`resetSimulation()`**
Clears all state back to initial values — nodes, connections, charts, logger, simulation instance.

---

### 5.2 `simulation.js` — The Engine

A plain JavaScript **class** (not a React component). This is where the actual TCP algorithm lives.

#### Constructor

```js
new Simulation(nodes, connections, logger)
```

Initialises each node with:
- `cwnd = 1` (slow start)
- `ssthresh = 64`
- `totalPacketsSent = 0`
- `totalPacketsLost = 0`
- `packetLossRate = 0.02` (2% random loss)

#### `simulateNodeStep(node)` — The Core Algorithm

This method runs one "round" of TCP for a single node:

```
Step 1: Determine packets to send = node.cwnd

Step 2: For each packet:
    Roll random number (0–1)
    If random < 0.02 (2% chance):
        → LOSS EVENT
        → cwnd = max(1, floor(cwnd / 2))   [cut in half]
        → ssthresh = max(2, cwnd)           [update threshold]
        → packetsLost++
    Else:
        → SUCCESS
        → node.ack++                        [acknowledge packet]
        → packetsSent++

Step 3: Update congestion window for next round:
    If cwnd < ssthresh:
        → cwnd = min(cwnd * 2, ssthresh)    [Slow Start: double]
    Else:
        → cwnd += 1                         [Congestion Avoidance: +1]

Step 4: Guard — ensure cwnd >= 1

Step 5: Update node.totalPacketsSent and node.totalPacketsLost

Step 6: Return { packetsSent, packetsLost, cwnd }
```

#### `simulateStep()` — Full Network Step

Iterates through all nodes that have connections and calls `simulateNodeStep()` on each. Used by the auto-simulation timer.

#### `calculateAverageMetrics()`

Computes averages across all nodes:

| Metric | Formula |
|---|---|
| `packetLoss` | `(totalPacketsLost / totalPacketsSent) * 100` |
| `throughput` | `node.ack / currentTime` |
| `averageLatency` | `Math.random() * 150 + 50` (simulated 50–200ms) |
| `averageCwnd` | Average of all nodes' cwnd |

> **Note:** Latency is randomised to simulate realistic network jitter. In a real TCP stack, latency would be measured via RTT (Round Trip Time).

#### `start()` / `stop()`

Toggle `isRunning` and call `run()` which uses `setTimeout` recursively every 1 second.

---

### 5.3 `FastCongestionControl.js` — Advanced Algorithm

A React component that implements **TCP Fast Retransmit** and **Fast Recovery** on top of the default simulation.

#### What Problem Does This Solve?

In default TCP Reno, a packet loss causes a **full timeout** before retransmission begins. Fast Retransmit avoids the timeout by detecting loss earlier using **duplicate ACKs**.

#### How It Works

**Duplicate ACK Detection:**
- After sending a packet, if the receiver gets an out-of-order packet, it re-sends the last good ACK
- 3 duplicate ACKs for the same sequence = almost certain a packet was lost
- This component watches `currentNode.ack` and counts how many times it stays equal to the last sent packet

**Fast Retransmit (triggered at 3 duplicate ACKs):**
```
cwnd = 1          → immediately retransmit (don't wait for timeout)
recoveryMode = true
duplicateAcks = 0
```

**Fast Recovery (triggered when in recovery mode):**
```
cwnd = max(cwnd / 2, 1)   → reduce window by half (less aggressive than full reset)
recoveryMode = false
```

#### React Hooks Used

- `useEffect` watches `currentNode` — detects duplicate ACKs on every render
- `useEffect` watches `duplicateAcks` — triggers Fast Retransmit when threshold hit
- `useCallback` memoises `handleFastRetransmit` and `handleFastRecovery` to avoid stale closures

---

### 5.4 `NetworkDashboard.js` — Live Charts

Renders a 2×2 grid of real-time line charts using **Chart.js** via `react-chartjs-2`.

#### Chart Configurations

| Chart | Color | Data Source |
|---|---|---|
| Throughput | Cyan | `throughput[]` — acks per second |
| Packet Loss % | Rose/Red | `packetLoss[]` — % of packets dropped |
| Latency (ms) | Amber | `latency[]` — simulated 50–200ms |
| Congestion Window | Indigo | `congestionWindow[]` — cwnd over time |

#### Data Format

Each dataset is an array of `{ x, y }` objects where:
- `x` = simulation time (seconds)
- `y` = metric value at that time

#### Chart Features

- **Gradient fills** — each chart has a colour-matched gradient under the line
- **Dark theme** — dark grid lines, muted tick labels, styled tooltip popups
- **Smooth curves** — `tension: 0.4` on the line
- **Point visibility** — dots hidden when data > 20 points (performance)
- **Animation** — 400ms `easeOutCubic` easing per update

#### Registered Chart.js Components

```js
CategoryScale, LinearScale, PointElement, LineElement,
Title, Tooltip, Legend, Filler
```

The `Filler` plugin is required for the gradient `fill: true` to work.

---

### 5.5 `Logger.js` — Event Logger

A plain JavaScript class that accumulates simulation events and exports them.

#### `addLog(entry)`

Pushes a timestamped entry to `this.logs[]`:
```js
{
  timestamp: "2026-05-07T14:10:00.000Z",
  algorithm: "TCP",
  packetLoss: 2.3,
  averageLatency: 127.4,
  throughput: 5.2
}
```

Called after every simulation step from both `App.js` and `simulation.js`.

#### `exportCSV()`

Formats logs as CSV rows and downloads `simulation_logs.csv`:
```
Timestamp,Algorithm,Packet Loss (%),Average Latency (ms),Throughput (Mbps)
2026-05-07T...,TCP,2.30,127.40,5.20
```

#### `exportJSON()`

Downloads the raw `logs[]` array as `simulation_logs.json` with 2-space indentation.

Both exports use the `file-saver` library's `saveAs()` which triggers a browser file download.

---

### 5.6 `SimulationReport.js` — PDF Export

Generates a downloadable PDF (`simulation_report.pdf`) containing all 4 charts and network configuration.

#### Process

1. Creates an off-screen `<canvas>` element (400×200px)
2. Renders a Chart.js chart into it programmatically
3. Waits 100ms for render to complete
4. Calls `canvas.toDataURL()` to get a PNG base64 string
5. Embeds PNG into the jsPDF document with `doc.addImage()`
6. Adds a new page after the second chart (keeps layout clean)
7. Destroys each chart instance to free memory
8. Calls `doc.save()` to trigger the download

#### PDF Contents

- Title: "Simulation Report"
- Number of nodes
- Number of connections
- Charts: Throughput, Packet Loss, Latency, Congestion Window

---

## 6. Step-by-Step User Flow

```
1. Enter number of nodes (e.g., 4) → Click "Create Nodes"
        ↓
   4 Node objects created, Simulation instance initialised

2. Enter From=0, To=1 → Click "Add Link"
        ↓
   nodes[0].connections = [1]
   nodes[1].connections = [0]
   connections = [[0, 1]]

3. (Repeat for all desired links)

4. Select Source Node, Destination Node

5. Choose Algorithm: Default TCP or Fast Congestion Control

6. Choose Loss Mode: Manual (enter packet #) or Percentage (e.g., 10%)

7. Click "Simulate Packet Transfer"
        ↓
   simulateNodeStep(nodes[sourceId])
   → packets sent (up to cwnd)
   → random loss applied
   → cwnd adjusted
   → ack updated
        ↓
   updateNetworkMetrics()
   → new {x,y} pushed to chart arrays
   → charts re-render

8. OR Click "Start Auto Simulation"
        ↓
   setInterval every 1s
   → simulateStep() on all nodes
   → all charts update continuously

9. Watch charts update in real time

10. Export logs (CSV/JSON) or Generate PDF Report

11. Click "Reset" to start over
```

---

## 7. TCP Algorithm Deep Dive

### Slow Start → Congestion Avoidance Transition

```
Round 1:  cwnd=1  → sends 1 pkt  → cwnd=2  (doubles, still < ssthresh=64)
Round 2:  cwnd=2  → sends 2 pkts → cwnd=4
Round 3:  cwnd=4  → sends 4 pkts → cwnd=8
...
Round 6:  cwnd=32 → sends 32 pkts → cwnd=64  (hits ssthresh)
Round 7:  cwnd=64 → congestion avoidance → cwnd=65 (now +1 per round)
Round 8:  cwnd=65 → cwnd=66
...
```

### Packet Loss Event

```
Round 10: cwnd=70 → one packet lost!
         → ssthresh = max(2, floor(70/2)) = 35
         → cwnd = max(1, floor(70/2)) = 35

Round 11: cwnd=35 → back to slow start (cwnd < new ssthresh=35? no, equal)
         → congestion avoidance: cwnd=36
```

### Fast Retransmit vs Default

| Scenario | Default TCP | Fast Congestion Control |
|---|---|---|
| 3 duplicate ACKs received | Wait for full timeout (~seconds) | Immediately retransmit |
| cwnd after loss | Reset to 1 | Halved (÷2), less disruptive |
| Recovery time | Slow (waits for timeout) | Fast (milliseconds) |

---

## 8. Data Flow Diagram

```
User Action
    │
    ▼
App.js (React State)
    │
    ├──► simulation.js
    │        │
    │        ├── simulateNodeStep()
    │        │       ├── Packet send loop
    │        │       ├── Random loss check
    │        │       ├── cwnd adjustment
    │        │       └── Returns {packetsSent, packetsLost, cwnd}
    │        │
    │        └── calculateAverageMetrics()
    │                └── Returns {throughput, packetLoss, latency, averageCwnd}
    │
    ├──► Logger.js
    │        └── addLog() → logs[]
    │
    ├──► setState (throughput, packetLoss, latency, congestionWindow)
    │        └── React re-render triggered
    │
    └──► NetworkDashboard.js
             └── Chart.js renders 4 updated line charts
```

---

## 9. State Management Reference

All state lives in `App.js` and flows **down** as props. No external state library is used.

```
App.js state
├── nodes[]                  → NetworkDashboard (via metrics), FastCongestionControl
├── connections[]            → SimulationReport
├── throughput[]             → NetworkDashboard, SimulationReport
├── packetLoss[]             → NetworkDashboard, SimulationReport
├── latency[]                → NetworkDashboard, SimulationReport
├── congestionWindow[]       → NetworkDashboard, SimulationReport
├── simulation (instance)    → called directly in event handlers
└── logger (instance)        → called directly, passed to Simulation constructor
```

State updates use the **functional updater pattern** to avoid stale closures in callbacks:
```js
setThroughput(prev => [...prev, { x: simulationTime, y: metrics.throughput }]);
```

---

## 10. Metrics Explained

| Metric | Unit | How Calculated | What to Watch |
|---|---|---|---|
| **Throughput** | pkts/sec | `node.ack / simulationTime` | Should grow during slow start, plateau during congestion avoidance |
| **Packet Loss %** | % | `(totalLost / totalSent) * 100` | Spikes indicate network congestion |
| **Latency** | ms | `random(50–200)` | Represents real-world network jitter |
| **Congestion Window** | packets | `node.cwnd` | Exponential rise (slow start) then saw-tooth pattern |

### The Sawtooth Pattern

The congestion window (`cwnd`) over time typically looks like a sawtooth wave — this is the hallmark of TCP congestion control:

```
cwnd
 ↑
64│     /\        /\
32│    /  \      /  \
16│   /    \    /    \
 8│  /      \  /      \
 4│ /        \/        \
 2│/
 1└─────────────────────→ time
   Slow  Loss Slow  Loss
   Start      Start
```

---

## 11. Export & Reporting

### Log Export (CSV)

```csv
Timestamp,Algorithm,Packet Loss (%),Average Latency (ms),Throughput (Mbps)
2026-05-07T14:00:01.000Z,TCP,2.00,134.52,3.45
2026-05-07T14:00:02.000Z,TCP,0.00,89.21,5.12
```

### Log Export (JSON)

```json
[
  {
    "timestamp": "2026-05-07T14:00:01.000Z",
    "algorithm": "TCP",
    "packetLoss": 2.00,
    "averageLatency": 134.52,
    "throughput": 3.45
  }
]
```

### PDF Report

Contains:
- Network summary (node count, connection count)
- All 4 metric charts rendered as PNG images
- Two charts per page, auto page-break after chart 2

---

## 12. Running the Project

### Prerequisites
- Node.js 16+ and npm

### Install and Run

```bash
# Navigate to project directory
cd tcp_congestion

# Install dependencies
npm install

# Start development server (opens at http://localhost:3000)
npm start
```

### Other Commands

```bash
npm run build    # Production bundle → /build folder
npm test         # Run test suite
npm run deploy   # Deploy to GitHub Pages (requires gh-pages setup)
```

### Quick Simulation Guide

1. Open `http://localhost:3000`
2. Enter `4` nodes → **Create Nodes**
3. Add connections: 0→1, 1→2, 2→3
4. Select Source: Node 0, Destination: Node 1
5. Click **Start Auto Simulation**
6. Watch the congestion window chart show the classic TCP sawtooth
7. Click **Stop** → **Export Logs (CSV)** to download data
8. Click **Generate Report** for a PDF summary

---

*This document covers the complete internal working of the TCP Congestion Control Simulator. Refer to inline code comments in each `.js` file for function-level detail.*
