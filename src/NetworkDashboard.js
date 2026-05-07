import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CHART_CONFIGS = [
  {
    label: 'Throughput',
    yLabel: 'Throughput',
    color: '6, 182, 212',       // cyan
    gradientStart: 'rgba(6,182,212,0.25)',
    gradientEnd:   'rgba(6,182,212,0)',
  },
  {
    label: 'Packet Loss (%)',
    yLabel: 'Loss %',
    color: '244, 63, 94',       // rose
    gradientStart: 'rgba(244,63,94,0.25)',
    gradientEnd:   'rgba(244,63,94,0)',
  },
  {
    label: 'Latency (ms)',
    yLabel: 'ms',
    color: '245, 158, 11',      // amber
    gradientStart: 'rgba(245,158,11,0.25)',
    gradientEnd:   'rgba(245,158,11,0)',
  },
  {
    label: 'Congestion Window',
    yLabel: 'cwnd',
    color: '99, 102, 241',      // indigo
    gradientStart: 'rgba(99,102,241,0.25)',
    gradientEnd:   'rgba(99,102,241,0)',
  },
];

const darkGridColor  = 'rgba(255,255,255,0.06)';
const darkTickColor  = '#64748b';
const darkTitleColor = '#94a3b8';

const buildOptions = (cfg) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400, easing: 'easeOutCubic' },
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      grid:  { color: darkGridColor, drawBorder: false },
      ticks: { color: darkTickColor, font: { family: 'Inter', size: 11 } },
      title: {
        display: true,
        text: 'Time (s)',
        color: darkTitleColor,
        font: { family: 'Inter', size: 11 },
      },
    },
    y: {
      beginAtZero: true,
      grid:  { color: darkGridColor, drawBorder: false },
      ticks: { color: darkTickColor, font: { family: 'Inter', size: 11 } },
      title: {
        display: true,
        text: cfg.yLabel,
        color: darkTitleColor,
        font: { family: 'Inter', size: 11 },
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: cfg.label,
      color: '#e2e8f0',
      font: { family: 'Inter', size: 13, weight: '600' },
      padding: { bottom: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      titleFont: { family: 'Inter', size: 12, weight: '600' },
      bodyFont:  { family: 'JetBrains Mono', size: 12 },
      padding: 12,
      cornerRadius: 8,
    },
  },
});

const buildData = (data, cfg) => ({
  labels: data.map(p => p.x),
  datasets: [{
    label: cfg.label,
    data: data.map(p => p.y),
    borderColor: `rgb(${cfg.color})`,
    borderWidth: 2,
    pointBackgroundColor: `rgb(${cfg.color})`,
    pointBorderColor: 'transparent',
    pointRadius: data.length > 20 ? 0 : 4,
    pointHoverRadius: 6,
    backgroundColor: (ctx) => {
      const chart = ctx.chart;
      const { ctx: canvasCtx, chartArea } = chart;
      if (!chartArea) return cfg.gradientStart;
      const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, cfg.gradientStart);
      gradient.addColorStop(1, cfg.gradientEnd);
      return gradient;
    },
    fill: true,
    tension: 0.4,
  }],
});

const NetworkDashboard = ({ throughput, packetLoss, latency, congestionWindow }) => {
  const dataSets = [throughput, packetLoss, latency, congestionWindow];

  return (
    <div className="network-dashboard">
      {CHART_CONFIGS.map((cfg, i) => (
        <div key={i} className="chart-container">
          <Line
            options={buildOptions(cfg)}
            data={buildData(dataSets[i], cfg)}
          />
        </div>
      ))}
    </div>
  );
};

export default NetworkDashboard;