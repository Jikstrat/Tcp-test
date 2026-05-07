class Simulation {
    constructor(nodes, connections, logger) {
        this.nodes = nodes.map(node => ({
            ...node,
            cwnd: 1, // Initial congestion window size (slow start)
            ssthresh: 64, // Initial threshold for slow start to congestion avoidance
            ack: 0,
            totalPacketsSent: 0,
            totalPacketsLost: 0
        }));
        this.connections = connections;
        this.logger = logger;
        this.currentTime = 0;
        this.isRunning = false;
        this.algorithm = 'TCP';
        this.packetLossRate = 0.02; // 2% packet loss rate
    }
  
    start() {
        this.isRunning = true;
        this.run();
    }
  
    stop() {
        this.isRunning = false;
    }
  
    run() {
        if (!this.isRunning) return;
  
        this.simulateStep();
        this.currentTime++;
  
        setTimeout(() => this.run(), 1000); // Run every second
    }
  
    simulateStep() {
        this.nodes.forEach(node => {
            if (node.connections.length > 0) {
                this.simulateNodeStep(node);
            }
        });
  
        this.logSimulationState();
    }
  
    simulateNodeStep(node) {
        const packetsToSend = node.cwnd;
        let packetsSent = 0;
        let packetsLost = 0;
    
        for (let i = 0; i < packetsToSend; i++) {
            packetsSent++;
            if (Math.random() < this.packetLossRate) {
                packetsLost++;
                // Reduce cwnd on packet loss, but ensure it doesn't go below 1
                node.cwnd = Math.max(1, Math.floor(node.cwnd / 2));
                node.ssthresh = Math.max(2, node.cwnd); // Adjust the slow start threshold
            } else {
                // Successful packet, increase ACK
                node.ack++;
            }
        }
    
        // Update congestion window based on the phase
        if (node.cwnd < node.ssthresh) {
            // Slow start: exponential growth (double cwnd)
            node.cwnd = Math.min(node.cwnd * 2, node.ssthresh);
        } else {
            // Congestion avoidance: linear growth
            node.cwnd += 1;
        }
    
        // Avoid dropping the congestion window size too aggressively
        if (node.cwnd < 1) {
            node.cwnd = 1;
        }
    
        // Update node statistics
        node.totalPacketsSent += packetsSent;
        node.totalPacketsLost += packetsLost;
    
        // Return the packet data for logging
        return { packetsSent, packetsLost, cwnd: node.cwnd };
    }
    
    logSimulationState() {
        const averageMetrics = this.calculateAverageMetrics();
        
        this.logger.addLog({
            timestamp: new Date().toISOString(),
            algorithm: this.algorithm,
            ...averageMetrics,
            packetsSent: this.nodes.reduce((sum, node) => sum + node.totalPacketsSent, 0),
            packetsLost: this.nodes.reduce((sum, node) => sum + node.totalPacketsLost, 0),
            cwnd: this.nodes.map(node => node.cwnd)
        });
    }
    
    calculateAverageMetrics() {
        const metrics = this.nodes.map(node => ({
            packetLoss: node.totalPacketsSent > 0 ? (node.totalPacketsLost / node.totalPacketsSent) * 100 : 0,
            latency: Math.random() * 150 + 50, // Simulated latency between 50-200ms
            throughput: this.currentTime > 0 ? (node.ack / this.currentTime) : 0,
            cwnd: node.cwnd
        }));
  
        return {
            packetLoss: metrics.reduce((sum, m) => sum + m.packetLoss, 0) / this.nodes.length,
            averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / this.nodes.length,
            throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / this.nodes.length,
            averageCwnd: metrics.reduce((sum, m) => sum + m.cwnd, 0) / this.nodes.length
        };
    }
  
    setAlgorithm(algorithm) {
        this.algorithm = algorithm;
    }
  }
  
  export default Simulation;
  