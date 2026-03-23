"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const COLORS = {
  HIGH: "#f43f5e",   // rose-500
  MEDIUM: "#f97316", // orange-500
  LOW: "#06b6d4",    // cyan-500
};

export default function AnalyticsCharts({
  dailyData,
  severityData,
  cameraData,
}) {
  return (
    <>
      {/* DAILY INCIDENTS */}
      <div className="mb-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <h2 className="text-sm font-mono tracking-widest uppercase font-bold mb-4 text-cyan-400">
          Anomalies Per Day
        </h2>

        <div className="h-[300px] w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontFamily: 'monospace', fontSize: '12px' }} 
                 itemStyle={{ color: '#22d3ee' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#06b6d4' }}
                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#22d3ee', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* SEVERITY PIE */}
        <div className="relative">
          <h2 className="text-sm font-mono tracking-widest uppercase font-bold mb-4 text-slate-100">
             Threat Distribution
          </h2>

          <div className="h-[300px] w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-inner flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={5}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelStyle={{ fontSize: '10px', fontFamily: 'monospace', fill: '#a1a1aa' }}
                >
                  {severityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name]}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontFamily: 'monospace', fontSize: '12px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CAMERA BAR */}
        <div className="relative">
          <h2 className="text-sm font-mono tracking-widest uppercase font-bold mb-4 text-slate-100">
             Node Incident Volume
          </h2>

          <div className="h-[300px] w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="camera" tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }} axisLine={{ stroke: '#3f3f46' }} tickLine={{ stroke: '#3f3f46' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontFamily: 'monospace', fontSize: '12px' }} 
                  cursor={{ fill: '#27272a' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
