import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, RefreshCw, Loader2, TrendingUp, AlertTriangle, CheckCircle2,
  Navigation, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const COLORS = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };

function StatCard({ title, value, sub, colorClass }: { title: string; value: number; sub?: string; colorClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-all">
      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-extrabold mt-1 tabular-nums ${colorClass || 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [footpaths, setFootpaths] = useState<any[]>([]);
  const [escalators, setEscalators] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);

  const parseBoolean = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    return false;
  };

  const fetchStats = async () => {
    setLoading(true);
    const [fpRes, escRes, elvRes] = await Promise.all([
      supabase.from('footpath_reports').select('*'),
      supabase.from('escalator1').select('*'),
      supabase.from('elevator1').select('*'),
    ]);
    setFootpaths(fpRes.data || []);
    setEscalators(escRes.data || []);
    setElevators(elvRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const fpGreen = footpaths.filter(f => f.color === 'green' || (!f.garbage && !f.encroachment && !f.obstruction)).length;
  const fpYellow = footpaths.filter(f => f.color === 'yellow').length;
  const fpRed = footpaths.filter(f => f.color === 'red').length;
  const fpGarbage = footpaths.filter(f => parseBoolean(f.garbage)).length;
  const fpEnc = footpaths.filter(f => parseBoolean(f.encroachment)).length;
  const fpObs = footpaths.filter(f => parseBoolean(f.obstruction)).length;

  const pieData = [
    { name: 'Clear (Green)', value: fpGreen, color: COLORS.green },
    { name: 'Warning (Yellow)', value: fpYellow, color: COLORS.yellow },
    { name: 'Critical (Red)', value: fpRed, color: COLORS.red },
  ].filter(d => d.value > 0);

  const issueBarData = [
    { issue: 'Garbage', count: fpGarbage },
    { issue: 'Encroachment', count: fpEnc },
    { issue: 'Obstruction', count: fpObs },
  ];

  // Reports over time
  const reportsByDate: Record<string, number> = {};
  footpaths.forEach(fp => {
    if (fp.created_at) {
      const d = new Date(fp.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      reportsByDate[d] = (reportsByDate[d] || 0) + 1;
    }
  });
  const timelineData = Object.entries(reportsByDate).slice(-10).map(([date, count]) => ({ date, count }));

  const escOp = escalators.filter(e => e.status === 'operational').length;
  const elvOp = elevators.filter(e => e.status === 'operational').length;

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">City Statistics</h1>
                <p className="text-xs text-slate-500">Live infrastructure monitoring data</p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Total Footpath Reports" value={footpaths.length} sub="All time" />
                <StatCard title="Critical (Red)" value={fpRed} colorClass="text-red-600" sub="Needs urgent attention" />
                <StatCard title="Warning (Yellow)" value={fpYellow} colorClass="text-yellow-600" sub="Single issue" />
                <StatCard title="Clear (Green)" value={fpGreen} colorClass="text-emerald-600" sub="No issues" />
              </div>
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Footpath Status Distribution</h3>
                <p className="text-xs text-slate-400 mb-5">Breakdown by severity classification</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} reports`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
                )}
              </div>

              {/* Issue bar chart */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Issues by Type</h3>
                <p className="text-xs text-slate-400 mb-6">Total occurrences across all reports</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={issueBarData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="issue" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Timeline */}
            {timelineData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Reports Over Time</h3>
                <p className="text-xs text-slate-400 mb-6">Last 10 dates with activity</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Reports" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Escalators & Elevators */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Escalators</h3>
                    <p className="text-xs text-slate-400">{escalators.length} monitored</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Operational</span>
                    <span className="font-bold text-emerald-600">{escOp}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><AlertTriangle className="w-4 h-4 text-red-500" /> Not Operational</span>
                    <span className="font-bold text-red-600">{escalators.length - escOp}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: escalators.length ? `${(escOp / escalators.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-right">{escalators.length ? Math.round((escOp / escalators.length) * 100) : 0}% operational</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Elevators</h3>
                    <p className="text-xs text-slate-400">{elevators.length} monitored</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Operational</span>
                    <span className="font-bold text-emerald-600">{elvOp}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600"><AlertTriangle className="w-4 h-4 text-red-500" /> Not Operational</span>
                    <span className="font-bold text-red-600">{elevators.length - elvOp}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: elevators.length ? `${(elvOp / elevators.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-right">{elevators.length ? Math.round((elvOp / elevators.length) * 100) : 0}% operational</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
