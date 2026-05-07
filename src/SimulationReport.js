import React from 'react';
import { Chart, registerables } from 'chart.js';
import { jsPDF } from "jspdf";

Chart.register(...registerables);

const SimulationReport = ({ nodes, connections, throughput, packetLoss, latency, congestionWindow }) => {
  const generateReport = async () => {
    console.log("Starting report generation");
    console.log("Nodes:", nodes);
    console.log("Connections:", connections);
    console.log("Throughput:", throughput);
    console.log("Packet Loss:", packetLoss);
    console.log("Latency:", latency);
    console.log("Congestion Window:", congestionWindow);

    const doc = new jsPDF();
    
    try {
      // Add title
      doc.setFontSize(18);
      doc.text("Simulation Report", 105, 15, null, null, "center");
      
      // Add network configuration
      doc.setFontSize(14);
      doc.text("Network Configuration", 20, 30);
      doc.setFontSize(12);
      doc.text(`Number of Nodes: ${nodes.length}`, 20, 40);
      doc.text(`Number of Connections: ${connections.length}`, 20, 50);
      
      // Add charts
      const chartConfigs = [
        { data: throughput, label: 'Throughput', color: 'rgb(75, 192, 192)' },
        { data: packetLoss, label: 'Packet Loss (%)', color: 'rgb(255, 99, 132)' },
        { data: latency, label: 'Latency (ms)', color: 'rgb(255, 205, 86)' },
        { data: congestionWindow, label: 'Congestion Window Size', color: 'rgb(54, 162, 235)' }
      ];
      
      let yPosition = 70;
      for (let index = 0; index < chartConfigs.length; index++) {
        const config = chartConfigs[index];
        console.log(`Processing chart: ${config.label}`);
        console.log("Chart data:", config.data);
        
        if (config.data.length === 0) {
          console.warn(`No data for ${config.label}. Skipping this chart.`);
          continue;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: config.data.map(point => point.x),
            datasets: [{
              label: config.label,
              data: config.data.map(point => point.y),
              borderColor: config.color,
              backgroundColor: config.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),

              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            scales: {
              x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Time' } },
              y: { beginAtZero: true, title: { display: true, text: config.label } }
            },
            plugins: { legend: { display: false } }
          }
        });
        
        // Wait for the chart to render
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`Adding ${config.label} chart to PDF`);
        doc.addImage(canvas.toDataURL(), 'PNG', 20, yPosition, 170, 80);
        yPosition += 90;
        
        if (index === 1) {
          doc.addPage();
          yPosition = 20;
        }
        
        chart.destroy();
      }
      
      console.log("Saving PDF");
      doc.save("simulation_report.pdf");
      console.log("PDF saved successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("An error occurred while generating the report. Please check the console for more information.");
    }
  };

  return (
    <button onClick={generateReport}>Generate Report</button>
  );
};

export default SimulationReport;