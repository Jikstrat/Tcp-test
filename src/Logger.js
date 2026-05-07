import { saveAs } from 'file-saver';
class Logger {
  constructor() {
    this.logs = [];
  }

  addLog(log) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      ...log
    });
  }

  exportLogs(format = 'csv') {
    if (format === 'csv') {
      return this.exportCSV();
    } else if (format === 'json') {
      return this.exportJSON();
    } else {
      throw new Error('Unsupported format');
    }
  }

  exportCSV() {
    const header = 'Timestamp,Algorithm,Packet Loss (%),Average Latency (ms),Throughput (Mbps)\n';
    const csvContent = this.logs.map(log => 
      `${log.timestamp},${log.algorithm},${log.packetLoss.toFixed(2)},${log.averageLatency.toFixed(2)},${log.throughput.toFixed(2)}`
    ).join('\n');

    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'simulation_logs.csv');
  }

  exportJSON() {
    const jsonContent = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, 'simulation_logs.json');
  }
}

export default Logger;