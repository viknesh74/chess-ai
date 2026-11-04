import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import defaultProfile from '../data/viknesh_profile.json';
import { PlayerProfile } from '../types/chess';
import { BarChart2, PieChart, Activity, Zap } from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

export const StatisticsPage: React.FC = () => {
  const profile = defaultProfile as unknown as PlayerProfile;
  const overview = profile.overview;
  const openings = profile.openings;
  const pieceActivity = profile.pieceActivity;

  // Outcome Doughnut
  const outcomeData = {
    labels: ['Wins', 'Losses', 'Draws'],
    datasets: [
      {
        data: [overview.wins, overview.losses, overview.draws],
        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
        borderColor: '#1e1e1e',
        borderWidth: 3,
      },
    ],
  };

  // Color Performance Bar
  const colorData = {
    labels: ['White', 'Black'],
    datasets: [
      {
        label: 'Win Rate (%)',
        data: [overview.whiteStats.winRate, overview.blackStats.winRate],
        backgroundColor: ['#e2e8f0', '#64748b'],
        borderRadius: 8,
      },
    ],
  };

  // Top Openings Bar
  const topOps = openings.topOpenings.slice(0, 6);
  const openingsData = {
    labels: topOps.map((o) => o.name),
    datasets: [
      {
        label: 'Games Played',
        data: topOps.map((o) => o.played),
        backgroundColor: '#81b64c',
        borderRadius: 6,
      },
      {
        label: 'Wins',
        data: topOps.map((o) => o.wins),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
    ],
  };

  // Piece Activity Bar
  const pieceData = {
    labels: pieceActivity.map((p) => p.piece),
    datasets: [
      {
        label: 'Total Moves Recorded',
        data: pieceActivity.map((p) => p.moves),
        backgroundColor: '#a855f7',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#d1d5db',
          font: { size: 11, family: 'Inter' },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 10 } },
        grid: { color: '#2b2b30' },
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 10 } },
        grid: { color: '#2b2b30' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#d1d5db',
          font: { size: 11, family: 'Inter' },
          padding: 16,
        },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
          <BarChart2 className="w-7 h-7 text-[#81b64c]" />
          <span>Advanced Dataset Analytics</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Visual metrics derived from all {overview.totalGames} Chess.com Rapid matches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outcome Breakdown Doughnut */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <span>Match Outcome Distribution</span>
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={outcomeData} options={doughnutOptions} />
          </div>
        </div>

        {/* White vs Black Performance */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Win Rate by Piece Color</span>
          </h3>
          <div className="h-64">
            <Bar data={colorData} options={chartOptions} />
          </div>
        </div>

        {/* Top Openings */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Most Played Openings & Wins</span>
          </h3>
          <div className="h-64">
            <Bar data={openingsData} options={chartOptions} />
          </div>
        </div>

        {/* Piece Activity */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span>Piece Move Frequency</span>
          </h3>
          <div className="h-64">
            <Bar data={pieceData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

