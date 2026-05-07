import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import NetworkDashboard from './NetworkDashboard';
import Logger from './Logger';
import Simulation from './simulation';
import SimulationReport from './SimulationReport';
import FastCongestionControl from './FastCongestionControl';

function App() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [numNodes, setNumNodes] = useState(0);
  const [newConnection, setNewConnection] = useState({ from: 0, to: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(0);
  const [selectedDestNodeId, setSelectedDestNodeId] = useState(1);
  const [lost_pkt, setLost_pkt] = useState(0);
  const [throughput, setThroughput] = useState([]);
  const [packetLoss, setPacketLoss] = useState([]);
  const [latency, setLatency] = useState([]);
  const [congestionWindow, setCongestionWindow] = useState([]);
  const [simulationTime, setSimulationTime] = useState(0);
  const [error, setError] = useState('');
  const [isAutoSimulationRunning, setIsAutoSimulationRunning] = useState(false);
  const [logger] = useState(new Logger());
  const [simulation, setSimulation] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  const [lossMode, setLossMode] = useState('manual');
  const [lossPercentage, setLossPercentage] = useState(0);
  const [packetsSent, setPacketsSent] = useState(0);
  const [packetsLost, setPacketsLost] = useState(0);
  const [algorithm, setAlgorithm] = useState('default');

  const updateNetworkMetrics = useCallback(() => {
    if (!simulation) return;

    const currentNode = nodes[selectedNodeId];
    const metrics = simulation.calculateAverageMetrics();

    setThroughput(prev => [...prev, { x: simulationTime, y: metrics.throughput }]);
    setPacketLoss(prev => [...prev, { x: simulationTime, y: metrics.packetLoss }]);
    setLatency(prev => [...prev, { x: simulationTime, y: metrics.averageLatency }]);
    setCongestionWindow(prev => [...prev, { x: simulationTime, y: currentNode.cwnd }]);

    logger.addLog({
      algorithm: 'TCP',
      packetLoss: metrics.packetLoss,
      averageLatency: metrics.averageLatency,
      throughput: metrics.throughput
    });
  }, [simulation, nodes, selectedNodeId, simulationTime, logger]);

  useEffect(() => {
    let timer;
    if (isAutoSimulationRunning && simulation) {
      timer = setInterval(() => {
        setSimulationTime(prev => prev + 1);
        simulation.simulateStep();
        updateNetworkMetrics();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoSimulationRunning, simulation, updateNetworkMetrics]);

  useEffect(() => {
    setDebugInfo({
      nodes: nodes.length,
      connections: connections.length,
      throughput: throughput.length,
      packetLoss: packetLoss.length,
      latency: latency.length,
      congestionWindow: congestionWindow.length,
    });
  }, [nodes, connections, throughput, packetLoss, latency, congestionWindow]);

  const handleNumNodesChange = (e) => {
    const value = parseInt(e.target.value);
    setNumNodes(value > 0 ? value : 0);
  };

  const createNodes = () => {
    if (numNodes <= 0) { setError('Please enter a valid number of nodes.'); return; }
    const newNodes = Array.from({ length: numNodes }, (_, id) => ({
      id, cwnd: 1, ssthresh: 64, sent: [0], lost: [], ack: 0, connections: []
    }));
    setNodes(newNodes);
    setError('');
    setSimulation(new Simulation(newNodes, connections, logger));
  };

  const handleConnectionChange = (e) => {
    const { name, value } = e.target;
    setNewConnection({ ...newConnection, [name]: parseInt(value) });
  };

  const addConnection = () => {
    const { from, to } = newConnection;
    if (from >= 0 && from < nodes.length && to >= 0 && to < nodes.length && from !== to && !isConnected(from, to)) {
      const newConnections = [...connections, [from, to]];
      setConnections(newConnections);
      setNodes(prev => {
        const updated = [...prev];
        updated[from].connections.push(to);
        updated[to].connections.push(from);
        return updated;
      });
      if (simulation) simulation.connections = newConnections;
      setError('');
    } else {
      setError('Invalid connection. Please check the node numbers and ensure the connection is unique.');
    }
  };

  const handleChangeLostPkt = (e) => setLost_pkt(parseInt(e.target.value));

  const handleLost = () => {
    const sourceNode = nodes.find(n => n.id === selectedNodeId);
    if (sourceNode.lost.indexOf(lost_pkt) === -1 && sourceNode.sent.indexOf(lost_pkt) !== -1) {
      const updatedLost = [...sourceNode.lost, lost_pkt];
      setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, lost: updatedLost } : n));
      updatePacketLoss(updatedLost.length, sourceNode.sent.length);
      setError('');
    } else {
      setError('Invalid packet number. Please check the packet exists and is not already marked as lost.');
    }
  };

  const simulatePacketLoss = (percentage) => {
    const sourceNode = nodes[selectedNodeId];
    const totalPackets = sourceNode.sent.length;
    const packetsToLose = Math.floor((percentage / 100) * totalPackets);
    const randomLostPackets = [];
    while (randomLostPackets.length < packetsToLose) {
      const packet = sourceNode.sent[Math.floor(Math.random() * totalPackets)];
      if (!randomLostPackets.includes(packet)) randomLostPackets.push(packet);
    }
    const updatedLost = [...sourceNode.lost, ...randomLostPackets];
    setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, lost: updatedLost } : n));
    updatePacketLoss(updatedLost.length, sourceNode.sent.length);
  };

  const updatePacketLoss = (lostPackets, totalPackets) => {
    const lossRate = (lostPackets / totalPackets) * 100 || 0;
    setPacketLoss(prev => [...prev, { x: simulationTime, y: lossRate }]);
    logger.addLog({ algorithm: 'TCP', packetLoss: lossRate, averageLatency: 0, throughput: 0 });
  };

  const isConnected = (from, to) =>
    connections.some(c => (c[0] === from && c[1] === to) || (c[1] === from && c[0] === to));

  const handleClick = () => {
    if (!isConnected(selectedNodeId, selectedDestNodeId)) {
      setError(`No connection exists between Node ${selectedNodeId} and Node ${selectedDestNodeId}`);
      return;
    }
    if (simulation) {
      const packetData = simulation.simulateNodeStep(nodes[selectedNodeId]);
      setNodes([...nodes]);
      updateNetworkMetrics();
      setPacketsSent(packetData.packetsSent);
      setPacketsLost(packetData.packetsLost);
      setError('');
    }
  };

  const toggleAutoSimulation = () => {
    if (isAutoSimulationRunning) simulation.stop();
    else simulation.start();
    setIsAutoSimulationRunning(prev => !prev);
  };

  const resetSimulation = () => {
    setNodes([]); setConnections([]); setNumNodes(0);
    setNewConnection({ from: 0, to: 0 }); setSelectedNodeId(0);
    setSelectedDestNodeId(1); setLost_pkt(0);
    setThroughput([]); setPacketLoss([]); setLatency([]);
    setCongestionWindow([]); setSimulationTime(0); setError('');
    if (simulation) simulation.stop();
    setSimulation(null);
    logger.logs = [];
  };

  const exportLogs = (format) => logger.exportLogs(format);
  const handleUpdateNetwork = () => updateNetworkMetrics();

  return (
    <div className="App">
      {/* ── Header ── */}
      <header className="App-header">
        <div className="header-badge">
          <span className="dot" />
          Network Simulator
        </div>
        <h1 className="header-title">TCP Congestion Control Simulator</h1>
        <p className="header-subtitle">
          Model network nodes, define connections, and observe real-time congestion algorithms
        </p>
      </header>

      <div className="App-body">

        {/* ── Node Creation ── */}
        <div className="section">
          <p className="section-label">Step 1 — Network Setup</p>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>
            Create Network Nodes
          </h3>
          <div className="row">
            <div>
              <label>Number of Nodes</label>
              <input type="number" value={numNodes} onChange={handleNumNodesChange} min="0" placeholder="e.g. 4" />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <button onClick={createNodes} style={{ marginTop: '22px', width: '100%' }}>
                ＋ Create Nodes
              </button>
            </div>
          </div>
        </div>

        {/* ── Connections ── */}
        {nodes.length > 0 && (
          <div className="section">
            <p className="section-label">Step 2 — Topology</p>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>
              Define Node Connections
            </h3>
            <div className="row">
              <div>
                <label>From Node</label>
                <input type="number" name="from" value={newConnection.from}
                  onChange={handleConnectionChange} min="0" max={numNodes - 1} />
              </div>
              <div>
                <label>To Node</label>
                <input type="number" name="to" value={newConnection.to}
                  onChange={handleConnectionChange} min="0" max={numNodes - 1} />
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <button onClick={addConnection} style={{ marginTop: '22px', width: '100%' }}>
                  Add Link
                </button>
              </div>
            </div>

            {connections.length > 0 && (
              <>
                <p className="section-label" style={{ marginTop: '20px' }}>Active connections</p>
                <ul>
                  {connections.map((conn, i) => (
                    <li key={i}>Node {conn[0]} ↔ Node {conn[1]}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* ── Simulation Controls ── */}
        {nodes.length > 0 && (
          <>
            {/* Stat Cards */}
            <div className="initialvalues">
              <div className="stat-card">
                <p className="stat-label">Source Node</p>
                <select onChange={(e) => setSelectedNodeId(parseInt(e.target.value))} value={selectedNodeId}>
                  {nodes.map(n => <option key={n.id} value={n.id}>Node {n.id}</option>)}
                </select>
              </div>

              <div className="stat-card">
                <p className="stat-label">Destination Node</p>
                <select onChange={(e) => setSelectedDestNodeId(parseInt(e.target.value))} value={selectedDestNodeId}>
                  {nodes.map(n => <option key={n.id} value={n.id}>Node {n.id}</option>)}
                </select>
              </div>

              <div className="stat-card">
                <p className="stat-label">Congestion Window — Node {selectedNodeId}</p>
                <p className="stat-value">{nodes[selectedNodeId].cwnd}</p>
              </div>

              <div className="stat-card">
                <p className="stat-label">Slow Start Threshold — Node {selectedNodeId}</p>
                <p className="stat-value">{nodes[selectedNodeId].ssthresh}</p>
              </div>
            </div>

            {/* Algorithm & Loss Mode */}
            <div className="section">
              <p className="section-label">Step 3 — Configuration</p>
              <div className="row">
                <div>
                  <label>Congestion Control Algorithm</label>
                  <select onChange={(e) => setAlgorithm(e.target.value)} value={algorithm}>
                    <option value="default">Default TCP</option>
                    <option value="fast_congestion_control">Fast Congestion Control (Retransmit + Recovery)</option>
                  </select>
                </div>
                <div>
                  <label>Loss Input Mode</label>
                  <select onChange={(e) => setLossMode(e.target.value)} value={lossMode}>
                    <option value="manual">Manual Entry</option>
                    <option value="percentage">Simulate Percentage</option>
                  </select>
                </div>
              </div>

              <div className="divider" />

              {lossMode === 'manual' && (
                <div className="row">
                  <div>
                    <label>Packet Sequence Number to Mark Lost</label>
                    <input type="number" onChange={handleChangeLostPkt} value={lost_pkt} min={0} />
                  </div>
                  <div style={{ flex: '0 0 auto' }}>
                    <button onClick={handleLost} style={{ marginTop: '22px', background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                      Mark as Lost
                    </button>
                  </div>
                </div>
              )}

              {lossMode === 'percentage' && (
                <div className="row">
                  <div>
                    <label>Packet Loss Percentage</label>
                    <input type="number" onChange={(e) => setLossPercentage(parseInt(e.target.value))}
                      value={lossPercentage} min={0} max={100} />
                  </div>
                  <div style={{ flex: '0 0 auto' }}>
                    <button onClick={() => simulatePacketLoss(lossPercentage)}
                      style={{ marginTop: '22px', background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                      Simulate Loss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fast Congestion Control Component */}
            {algorithm === 'fast_congestion_control' && (
              <FastCongestionControl
                nodes={nodes}
                setNodes={setNodes}
                selectedNodeId={selectedNodeId}
                onUpdateNetwork={handleUpdateNetwork}
              />
            )}

            {/* Packet Info */}
            <div className="send">
              <div className="packet-box">
                <h4>Packets to Transfer — Node {selectedNodeId}</h4>
                <h5>#{nodes[selectedNodeId].sent.join(', ')}</h5>
              </div>
              <div className="packet-box">
                <h4>Packets Lost This Window</h4>
                <h5 style={{ color: 'var(--rose)' }}>
                  {nodes[selectedNodeId].lost.length > 0
                    ? `#${nodes[selectedNodeId].lost.join(', ')}`
                    : '—'}
                </h5>
              </div>
            </div>

            {/* Mini Stats */}
            <div className="stats-row">
              <div className="mini-stat">
                <p className="mini-label">Packets Sent</p>
                <p className="mini-value">{packetsSent}</p>
              </div>
              <div className="mini-stat">
                <p className="mini-label">Packets Lost</p>
                <p className="mini-value lost">{packetsLost}</p>
              </div>
              <div className="mini-stat" style={{ flex: 2 }}>
                <p className="mini-label">Simulation Time</p>
                <p className="mini-value" style={{ color: 'var(--cyan)' }}>{simulationTime}s</p>
              </div>
            </div>

            {/* Simulate Buttons */}
            <div className="button-group">
              <button id="btn-simulate" onClick={handleClick} className="simulate">
                ▶ Simulate Packet Transfer
              </button>
              <button
                id="btn-auto"
                onClick={toggleAutoSimulation}
                className={`simulate${isAutoSimulationRunning ? ' stop' : ''}`}
              >
                {isAutoSimulationRunning ? '⏹ Stop Auto Simulation' : '⚡ Start Auto Simulation'}
              </button>
            </div>

            {/* ACK */}
            <div className="ack-section">
              <div>
                <p className="ack-label">Received Acknowledgement (ACK)</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Node {selectedNodeId}
                </p>
              </div>
              <p className="ack-value">{nodes[selectedNodeId].ack}</p>
            </div>

            {/* Charts */}
            <div>
              <div className="dashboard-header">
                <h2 className="dashboard-header-title">Network Metrics</h2>
                <div className="dashboard-header-line" />
              </div>
              <NetworkDashboard
                throughput={throughput}
                packetLoss={packetLoss}
                latency={latency}
                congestionWindow={congestionWindow}
              />
            </div>

            {/* Actions */}
            <div className="button-group">
              <button id="btn-reset" onClick={resetSimulation} className="reset">
                ↺ Reset Simulation
              </button>
              <button id="btn-export-csv" onClick={() => exportLogs('csv')} className="export">
                ↓ Export CSV
              </button>
              <button id="btn-export-json" onClick={() => exportLogs('json')} className="export">
                ↓ Export JSON
              </button>
              <SimulationReport
                nodes={nodes}
                connections={connections}
                throughput={throughput}
                packetLoss={packetLoss}
                latency={latency}
                congestionWindow={congestionWindow}
              />
            </div>

            {/* Debug */}
            <div className="debug-section">
              <h3>Debug Info</h3>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </>
        )}

        {/* Error */}
        {error && <div className="error-message">{error}</div>}

      </div>
    </div>
  );
}

export default App;
