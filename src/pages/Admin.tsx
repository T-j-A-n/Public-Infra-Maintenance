import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, LogIn, LogOut, AlertTriangle, CheckCircle2, ShieldAlert,
  RefreshCw, Navigation, TrendingUp, Activity, Footprints, Eye, Clock,
  Download
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444'];

function StatCard({ title, value, icon: Icon, colorClass, bg }: {
  title: string; value: number | string; icon: any; colorClass: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3.5 border shadow-sm hover:shadow-md transition-all`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ footpaths: any[]; escalators: any[]; elevators: any[] }>({
    footpaths: [], escalators: [], elevators: []
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'footpaths' | 'escalators' | 'elevators'>('footpaths');

  const parseBoolean = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    return false;
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (username === "admin" && password === "admin123") {
      setAuthenticated(true);
      setRefreshKey(p => p + 1);
    } else {
      setError("Invalid username or password.");
    }
    setLoading(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const [fpRes, escRes, elvRes] = await Promise.all([
      supabase.from('footpath_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('escalator1').select('*').order('updated_at', { ascending: false }),
      supabase.from('elevator1').select('*').order('updated_at', { ascending: false }),
    ]);
    setData({
      footpaths: fpRes.data || [],
      escalators: escRes.data || [],
      elevators: elvRes.data || [],
    });
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, refreshKey]);

  const fps = data.footpaths;
  const fpRed = fps.filter(f => f.color === 'red').length;
  const fpYellow = fps.filter(f => f.color === 'yellow').length;
  const fpGreen = fps.filter(f => f.color === 'green').length;
  const fpGarbage = fps.filter(f => parseBoolean(f.garbage)).length;
  const fpEnc = fps.filter(f => parseBoolean(f.encroachment)).length;
  const fpObs = fps.filter(f => parseBoolean(f.obstruction)).length;

  const pieData = [
    { name: 'Clear', value: fpGreen },
    { name: 'Warning', value: fpYellow },
    { name: 'Critical', value: fpRed },
  ].filter(d => d.value > 0);

  const issueBar = [
    { name: 'Garbage', count: fpGarbage },
    { name: 'Encroachment', count: fpEnc },
    { name: 'Obstruction', count: fpObs },
  ];

  // Recent reports (last 5)
  const recentFps = fps.slice(0, 5);

  // Color badge component
  const ColorBadge = ({ color }: { color: string }) => {
    if (color === 'red') return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />Critical</span>;
    if (color === 'yellow') return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Warning</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Clear</span>;
  };

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
              <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-xs text-slate-500">Secure infrastructure control panel</p>
              </div>
            </div>
          </div>
          {authenticated && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(p => p + 1)}
                disabled={loading}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setAuthenticated(false)}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {!authenticated ? (
          <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 65px)' }}>
            <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-8">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-5">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-1">Admin Login</h2>
              <p className="text-sm text-slate-500 text-center mb-8">Enter credentials to access the dashboard</p>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
              <p className="text-center text-xs text-slate-400 mt-4">Use: admin / admin123</p>
            </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard title="Total Reports" value={fps.length} icon={Footprints} colorClass="bg-slate-700" bg="bg-white border-slate-200" />
                <StatCard title="Critical" value={fpRed} icon={ShieldAlert} colorClass="bg-red-500" bg="bg-red-50 border-red-200" />
                <StatCard title="Warning" value={fpYellow} icon={AlertTriangle} colorClass="bg-yellow-500" bg="bg-yellow-50 border-yellow-200" />
                <StatCard title="Clear" value={fpGreen} icon={CheckCircle2} colorClass="bg-emerald-500" bg="bg-emerald-50 border-emerald-200" />
                <StatCard title="Escalators" value={data.escalators.length} icon={TrendingUp} colorClass="bg-blue-500" bg="bg-blue-50 border-blue-200" />
                <StatCard title="Elevators" value={data.elevators.length} icon={Activity} colorClass="bg-purple-500" bg="bg-purple-50 border-purple-200" />
              </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Footpath Status</h3>
                <p className="text-xs text-slate-400 mb-4">Classification breakdown</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 3]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Issue Type Breakdown</h3>
                <p className="text-xs text-slate-400 mb-4">Garbage vs Encroachment vs Obstruction</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={issueBar} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0369a1" radius={[6, 6, 0, 0]} name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            {recentFps.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Recent Footpath Reports</h3>
                    <p className="text-xs text-slate-400">Latest 5 submissions</p>
                  </div>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="divide-y divide-slate-100">
                  {recentFps.map(fp => (
                    <div key={fp.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-all">
                      {fp.image_url ? (
                        <img src={fp.image_url} alt="Footpath" className="w-12 h-12 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Eye className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{fp.location_desc || 'Footpath Report'}</p>
                        {fp.ai_description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">"{fp.ai_description}"</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(fp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <ColorBadge color={fp.color} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Tables */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center border-b border-slate-100">
                {(['footpaths', 'escalators', 'elevators'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-semibold transition-all cursor-pointer border-b-2 ${
                      activeTab === tab
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} ({data[tab].length})
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'footpaths' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Image</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Location</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">AI Description</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Issues</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.footpaths.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-400 py-10 text-sm">No reports yet</td></tr>
                      )}
                      {data.footpaths.map(fp => (
                        <tr key={fp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4"><ColorBadge color={fp.color} /></td>
                          <td className="px-6 py-4">
                            {fp.image_url
                              ? <img src={fp.image_url} alt="Footpath" className="w-14 h-14 rounded-lg object-cover border border-slate-100" />
                              : <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-xs">No img</div>
                            }
                          </td>
                          <td className="px-6 py-4 text-slate-700 max-w-[150px] truncate" title={fp.location_desc}>{fp.location_desc || '—'}</td>
                          <td className="px-6 py-4 text-slate-500 max-w-[200px]">
                            <span className="text-xs italic line-clamp-2">{fp.ai_description || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1 flex-wrap">
                              {parseBoolean(fp.garbage) && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Garbage</span>}
                              {parseBoolean(fp.encroachment) && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Encroachment</span>}
                              {parseBoolean(fp.obstruction) && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">Obstruction</span>}
                              {!parseBoolean(fp.garbage) && !parseBoolean(fp.encroachment) && !parseBoolean(fp.obstruction) && <span className="text-slate-400 text-xs">None</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">{new Date(fp.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'escalators' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Location</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Priority</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Accessible</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Issue</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.escalators.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-400 py-10 text-sm">No escalators</td></tr>
                      )}
                      {data.escalators.map(esc => (
                        <tr key={esc.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${esc.status !== 'operational' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            {esc.status === 'operational'
                              ? <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Operational</span>
                              : <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">{esc.status || 'Down'}</span>
                            }
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">{esc.location_desc || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${esc.priority === 'high' ? 'bg-red-100 text-red-700' : esc.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                              {esc.priority || 'low'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{parseBoolean(esc.accessible) ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs max-w-[150px] truncate">{esc.issue || '—'}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">{new Date(esc.updated_at || esc.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'elevators' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Status</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Location</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Priority</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Accessible</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Issue</th>
                        <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.elevators.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-slate-400 py-10 text-sm">No elevators</td></tr>
                      )}
                      {data.elevators.map(elv => (
                        <tr key={elv.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-all ${elv.status !== 'operational' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            {elv.status === 'operational'
                              ? <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Operational</span>
                              : <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">{elv.status || 'Down'}</span>
                            }
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-700">{elv.location_desc || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${elv.priority === 'high' ? 'bg-red-100 text-red-700' : elv.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                              {elv.priority || 'low'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{parseBoolean(elv.accessible) ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs max-w-[150px] truncate">{elv.issue || '—'}</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">{new Date(elv.updated_at || elv.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
