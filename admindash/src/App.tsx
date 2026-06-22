import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Download,
  Gauge,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TabletSmartphone,
  TriangleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type FootpathRow = {
  id: number | string;
  created_at?: string | null;
  location_desc?: string | null;
  color?: string | null;
  garbage?: unknown;
  encroachment?: unknown;
  obstruction?: unknown;
  ai_description?: string | null;
  image_url?: string | null;
};

type MobilityRow = {
  id: number | string;
  created_at?: string | null;
  updated_at?: string | null;
  location_desc?: string | null;
  status?: string | null;
  priority?: string | null;
  accessible?: unknown;
  issue?: string | null;
};

type TableKey = "footpaths" | "escalators" | "elevators";

type DashboardData = {
  footpaths: FootpathRow[];
  escalators: MobilityRow[];
  elevators: MobilityRow[];
};

const PIE_COLORS = ["#f97316", "#fdba74", "#c2410c"];
const TABLES: { key: TableKey; label: string }[] = [
  { key: "footpaths", label: "Footpaths" },
  { key: "escalators", label: "Escalators" },
  { key: "elevators", label: "Elevators" },
];

function isTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
  return false;
}

function formatDate(value?: string | null): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatShortDate(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function daysAgo(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const deltaMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(deltaMs / 86_400_000));
}

function getPriorityTone(priority?: string | null): string {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warning";
  return "calm";
}

function getStatusTone(value?: string | null): string {
  if (!value) return "danger";
  return value === "operational" ? "success" : "danger";
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  hint: string;
  accent: string;
}) {
  return (
    <article className="metric-card panel">
      <div className="metric-topline">
        <span className={`metric-icon ${accent}`}>
          <Icon size={18} />
        </span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-hint">{hint}</div>
    </article>
  );
}

async function loadTable<T>(table: string, orderColumn?: string): Promise<T[]> {
  if (!supabase) return [];
  const query = supabase.from(table).select("*").limit(100);
  const orderedQuery = orderColumn ? query.order(orderColumn, { ascending: false }) : query;
  const { data, error } = await orderedQuery;
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return (data ?? []) as T[];
}

function App() {
  const [activeTable, setActiveTable] = useState<TableKey>("footpaths");
  const [data, setData] = useState<DashboardData>({
    footpaths: [],
    escalators: [],
    elevators: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = async (showSpinner = false) => {
    if (!hasSupabaseConfig) {
      setError("Supabase environment variables are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to admindash/.env, then restart Vite.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showSpinner) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const [footpathsResult, escalatorsResult, elevatorsResult] = await Promise.allSettled([
      loadTable<FootpathRow>("footpath_reports", "created_at"),
      loadTable<MobilityRow>("escalator1"),
      loadTable<MobilityRow>("elevator1"),
    ]);

    const nextData: DashboardData = {
      footpaths: footpathsResult.status === "fulfilled" ? footpathsResult.value : [],
      escalators: escalatorsResult.status === "fulfilled" ? escalatorsResult.value : [],
      elevators: elevatorsResult.status === "fulfilled" ? elevatorsResult.value : [],
    };

    const firstError = [footpathsResult, escalatorsResult, elevatorsResult].find((result) => result.status === "rejected") as
      | PromiseRejectedResult
      | undefined;

    if (firstError) {
      setError(firstError.reason instanceof Error ? firstError.reason.message : "Failed to load dashboard data.");
    }

    setData(nextData);
    setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void refresh(false);
  }, []);

  const footpaths = data.footpaths;
  const escalators = data.escalators;
  const elevators = data.elevators;

  const footpathCritical = footpaths.filter((item) => item.color === "red").length;
  const footpathWarning = footpaths.filter((item) => item.color === "yellow").length;
  const footpathClear = footpaths.filter((item) => item.color === "green").length;
  const garbageReports = footpaths.filter((item) => isTruthy(item.garbage)).length;
  const encroachmentReports = footpaths.filter((item) => isTruthy(item.encroachment)).length;
  const obstructionReports = footpaths.filter((item) => isTruthy(item.obstruction)).length;

  const operationalEscalators = escalators.filter((item) => item.status === "operational").length;
  const escalatorIssues = escalators.length - operationalEscalators;
  const operationalElevators = elevators.filter((item) => item.status === "operational").length;
  const elevatorIssues = elevators.length - operationalElevators;

  const statusPieData = [
    { name: "Clear", value: footpathClear },
    { name: "Warning", value: footpathWarning },
    { name: "Critical", value: footpathCritical },
  ].filter((entry) => entry.value > 0);

  const issueBars = [
    { name: "Garbage", count: garbageReports },
    { name: "Encroachment", count: encroachmentReports },
    { name: "Obstruction", count: obstructionReports },
  ];

  const recentActivity = useMemo(() => {
    const entries = [
      ...footpaths.map((item) => ({
        kind: "Footpath",
        label: item.location_desc || "Footpath report",
        tone: item.color === "red" ? "danger" : item.color === "yellow" ? "warning" : "success",
        timestamp: item.created_at,
      })),
      ...escalators.map((item) => ({
        kind: "Escalator",
        label: item.location_desc || "Escalator report",
        tone: item.status === "operational" ? "success" : "danger",
        timestamp: item.updated_at || item.created_at,
      })),
      ...elevators.map((item) => ({
        kind: "Elevator",
        label: item.location_desc || "Elevator report",
        tone: item.status === "operational" ? "success" : "danger",
        timestamp: item.updated_at || item.created_at,
      })),
    ];

    return entries
      .filter((entry) => Boolean(entry.timestamp))
      .sort((left, right) => {
        const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
        const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 8);
  }, [footpaths, escalators, elevators]);

  const activityTrend = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const item of footpaths) {
      const age = daysAgo(item.created_at);
      if (age === null || age > 6) continue;
      const current = buckets.get(age) ?? 0;
      buckets.set(age, current + 1);
    }

    return Array.from({ length: 7 }, (_, index) => {
      const age = 6 - index;
      return {
        name: age === 0 ? "Today" : `${age}d`,
        reports: buckets.get(age) ?? 0,
      };
    });
  }, [footpaths]);

  const rows = activeTable === "footpaths" ? footpaths : activeTable === "escalators" ? escalators : elevators;

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <div className="dashboard-shell">
        <aside className="sidebar panel">
          <div className="brand-block">
            <div className="brand-mark">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="eyebrow">Namma Bengaluru</p>
              <h1>Admin Console</h1>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-label">Connection</div>
            <div className="sidebar-card-value">{hasSupabaseConfig ? "Supabase linked" : "Env vars missing"}</div>
            <div className="sidebar-card-hint">
              {hasSupabaseConfig
                ? "Reading live reports from the shared backend."
                : "Set the Supabase URL and anon key in admindash/.env, then restart the dev server."}
            </div>
          </div>

          <div className="sidebar-stat-list">
            <div>
              <span>Footpaths</span>
              <strong>{footpaths.length}</strong>
            </div>
            <div>
              <span>Escalators</span>
              <strong>{escalators.length}</strong>
            </div>
            <div>
              <span>Elevators</span>
              <strong>{elevators.length}</strong>
            </div>
          </div>

          <div className="sidebar-shortcuts">
            <button type="button" className="ghost-button" onClick={() => void refresh(true)}>
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
              Refresh data
            </button>
            <button type="button" className="ghost-button muted">
              <Download size={16} />
              Export snapshot
            </button>
          </div>

          <div className="sidebar-footnote">
            <ShieldAlert size={16} />
            Port is isolated from the main site. Run this app on 4174.
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar panel">
            <div>
              <p className="eyebrow">Operations overview</p>
              <h2>Infrastructure health at a glance</h2>
              <p className="lede">
                Review road and accessibility reports in one place, using the same Supabase backend as the main app.
              </p>
            </div>

            <div className="topbar-actions">
              <div className="status-pill">
                <TabletSmartphone size={14} />
                <span>{lastUpdated ? `Updated ${lastUpdated}` : "Waiting for data"}</span>
              </div>
              <button type="button" className="primary-button" onClick={() => void refresh(true)}>
                {refreshing ? <LoaderCircle size={16} className="spin" /> : <ArrowUpRight size={16} />}
                Sync now
              </button>
            </div>
          </header>

          {error && (
            <section className="alert panel">
              <Bell size={18} />
              <div>
                <strong>Connection issue</strong>
                <p>{error}</p>
              </div>
            </section>
          )}

          {loading ? (
            <section className="loading-state panel">
              <LoaderCircle size={22} className="spin" />
              <div>
                <strong>Loading dashboard</strong>
                <p>Connecting to Supabase and collecting the latest records.</p>
              </div>
            </section>
          ) : (
            <>
              <section className="metric-grid">
                <MetricCard icon={Building2} label="Footpath reports" value={footpaths.length} hint="New submissions in the shared table" accent="accent-emerald" />
                <MetricCard icon={TriangleAlert} label="Critical issues" value={footpathCritical} hint="Red footpath classifications" accent="accent-rose" />
                <MetricCard icon={Gauge} label="Operational escalators" value={operationalEscalators} hint={`${escalatorIssues} need attention`} accent="accent-sky" />
                <MetricCard icon={Activity} label="Operational elevators" value={operationalElevators} hint={`${elevatorIssues} need attention`} accent="accent-violet" />
              </section>

              <section className="chart-grid">
                <article className="panel chart-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Footpath status</p>
                      <h3>Clear vs warning vs critical</h3>
                    </div>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusPieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={4}>
                          {statusPieData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="panel chart-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Issue mix</p>
                      <h3>Garbage, encroachment, obstruction</h3>
                    </div>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={issueBars} barSize={34}>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="panel chart-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Seven day trend</p>
                      <h3>Footpath submissions by day</h3>
                    </div>
                  </div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={activityTrend}>
                        <defs>
                          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="reports" stroke="#16a34a" fill="url(#activityFill)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </section>

              <section className="dual-grid">
                <article className="panel list-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Recent activity</p>
                      <h3>Latest records across all tables</h3>
                    </div>
                  </div>

                  <div className="activity-list">
                    {recentActivity.length === 0 ? (
                      <div className="empty-state">No rows found yet.</div>
                    ) : (
                      recentActivity.map((entry, index) => (
                        <div className="activity-row" key={`${entry.kind}-${entry.label}-${index}`}>
                          <div className={`activity-dot ${entry.tone}`} />
                          <div className="activity-copy">
                            <strong>{entry.label}</strong>
                            <span>{entry.kind}</span>
                          </div>
                          <time>{formatDate(entry.timestamp)}</time>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <article className="panel summary-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Live status</p>
                      <h3>Quick system readout</h3>
                    </div>
                  </div>

                  <div className="summary-stack">
                    <div className="summary-item">
                      <span>Total flagged footpaths</span>
                      <strong>{footpathCritical + footpathWarning}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Accessible reports</span>
                      <strong>{footpaths.filter((item) => !isTruthy(item.obstruction)).length}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Rows with images</span>
                      <strong>{footpaths.filter((item) => Boolean(item.image_url)).length}</strong>
                    </div>
                  </div>

                  <div className="callout">
                    <Sparkles size={16} />
                    Same Supabase server, separate admin surface, isolated dev port.
                  </div>
                </article>
              </section>

              <section className="panel records-panel">
                <div className="panel-header records-header">
                  <div>
                    <p className="eyebrow">Records</p>
                    <h3>Browse source tables</h3>
                  </div>
                  <div className="tab-bar" role="tablist" aria-label="Dashboard tables">
                    {TABLES.map((table) => (
                      <button
                        key={table.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTable === table.key}
                        className={activeTable === table.key ? "tab tab-active" : "tab"}
                        onClick={() => setActiveTable(table.key)}
                      >
                        {table.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-wrap">
                  {activeTable === "footpaths" && (
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Location</th>
                          <th>Issues</th>
                          <th>Notes</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="empty-table-cell">No footpath rows yet.</td>
                          </tr>
                        ) : (
                          rows.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Badge tone={item.color === "red" ? "danger" : item.color === "yellow" ? "warning" : "success"}>
                                  {item.color || "unknown"}
                                </Badge>
                              </td>
                              <td>{item.location_desc || "-"}</td>
                              <td className="table-tags">
                                {isTruthy(item.garbage) && <span>Garbage</span>}
                                {isTruthy(item.encroachment) && <span>Encroachment</span>}
                                {isTruthy(item.obstruction) && <span>Obstruction</span>}
                                {!isTruthy(item.garbage) && !isTruthy(item.encroachment) && !isTruthy(item.obstruction) && <span>None</span>}
                              </td>
                              <td>{item.ai_description || "-"}</td>
                              <td>{formatDate(item.created_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTable === "escalators" && (
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Location</th>
                          <th>Priority</th>
                          <th>Accessible</th>
                          <th>Issue</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-table-cell">No escalator rows yet.</td>
                          </tr>
                        ) : (
                          rows.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Badge tone={getStatusTone(item.status)}>{item.status || "unknown"}</Badge>
                              </td>
                              <td>{item.location_desc || "-"}</td>
                              <td>
                                <Badge tone={getPriorityTone(item.priority)}>{item.priority || "low"}</Badge>
                              </td>
                              <td>{isTruthy(item.accessible) ? "Yes" : "No"}</td>
                              <td>{item.issue || "-"}</td>
                              <td>{formatDate(item.updated_at || item.created_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {activeTable === "elevators" && (
                    <table>
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Location</th>
                          <th>Priority</th>
                          <th>Accessible</th>
                          <th>Issue</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-table-cell">No elevator rows yet.</td>
                          </tr>
                        ) : (
                          rows.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Badge tone={getStatusTone(item.status)}>{item.status || "unknown"}</Badge>
                              </td>
                              <td>{item.location_desc || "-"}</td>
                              <td>
                                <Badge tone={getPriorityTone(item.priority)}>{item.priority || "low"}</Badge>
                              </td>
                              <td>{isTruthy(item.accessible) ? "Yes" : "No"}</td>
                              <td>{item.issue || "-"}</td>
                              <td>{formatDate(item.updated_at || item.created_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;