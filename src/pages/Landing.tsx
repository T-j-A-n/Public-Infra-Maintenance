import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, Map, ShieldAlert, Users, Navigation, AlertTriangle,
  TrendingUp, Eye, Footprints, Star, ChevronRight, Activity, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count}</>;
}

export default function Landing() {
  const [stats, setStats] = useState({ footpaths: 0, critical: 0, escalators: 0, elevators: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const [fpRes, escRes, elvRes] = await Promise.all([
        supabase.from('footpath_reports').select('color'),
        supabase.from('escalator1').select('id'),
        supabase.from('elevator1').select('id'),
      ]);
      const fps = fpRes.data || [];
      setStats({
        footpaths: fps.length,
        critical: fps.filter((f: any) => f.color === 'red').length,
        escalators: (escRes.data || []).length,
        elevators: (elvRes.data || []).length,
      });
      setStatsLoaded(true);
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar (h-16 = 64px) ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200">
        <nav className="flex items-center justify-between px-8 max-w-7xl mx-auto h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">
              Namma Bengaluru <span className="text-emerald-600">Infra</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/stats">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                City Stats
              </button>
            </Link>
            <Link href="/admin">
              <button className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all cursor-pointer">
                Admin
              </button>
            </Link>
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <Link href="/map">
              <button className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg transition-all cursor-pointer">
                Launch Map →
              </button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Spacer exactly navbar height */}
      <div style={{ height: '64px' }} />

      {/* ── Hero ── */}
      <section className="relative py-24 overflow-hidden bg-white border-b border-slate-200">
        {/* Soft background blobs — kept behind with explicit z */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-10 left-1/3 w-[600px] h-[600px] bg-emerald-400/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-400/6 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-8 text-center" style={{ zIndex: 1 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
            <Zap className="w-3 h-3" />
            AI-Powered · Community Driven · Real-Time
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.08] tracking-tight text-center">
            Bengaluru's Footpaths
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Deserve Better
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-xl mx-auto text-center">
            One photo. AI classifies. City gets mapped. Together we fix every broken footpath in Bengaluru.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/map">
              <button className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-7 py-3 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-px text-sm cursor-pointer">
                Start Monitoring
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/stats">
              <button className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-7 py-3 rounded-xl border border-slate-200 transition-all text-sm cursor-pointer">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                City Stats
              </button>
            </Link>
          </div>

          {/* Live Stats */}
          {statsLoaded && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { label: 'Footpaths Mapped', value: stats.footpaths, icon: Footprints, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                { label: 'Critical Issues', value: stats.critical, icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
                { label: 'Escalators', value: stats.escalators, icon: TrendingUp, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
                { label: 'Elevators', value: stats.elevators, icon: Activity, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4 text-left shadow-sm">
                  <div className={`w-8 h-8 ${s.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                    <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    <AnimatedCounter target={s.value} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="py-20 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7">
              <ShieldAlert className="w-3.5 h-3.5" />
              The Problem
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight text-center text-white">
              Bengaluru's footpaths are&nbsp;
              <span className="text-red-400">broken</span>
              <br />and no one is watching.
            </h2>
            <p className="mt-5 text-slate-400 leading-relaxed text-center">
              Over <strong className="text-white font-semibold">198 wards</strong>, millions of pedestrians navigate footpaths blocked by vendors, damaged by potholes, and buried under garbage. Most issues go unreported for months.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: AlertTriangle, title: 'Unreported Issues', desc: 'Most footpath problems are never formally reported to BBMP, leaving them unresolved for months or years.' },
              { icon: Eye, title: 'No Real-Time Visibility', desc: 'City officials lack a unified view of where footpaths are critical, making resource allocation inefficient.' },
              { icon: Users, title: 'Accessibility Gap', desc: 'Citizens with mobility impairments, the elderly, and parents with strollers face daily barriers on broken footpaths.' },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-7 text-center hover:bg-white/8 transition-all">
                <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center mb-5 mx-auto">
                  <item.icon className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7">
              <Star className="w-3.5 h-3.5" />
              The Solution
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight text-center">
              AI-powered, community-driven monitoring
            </h2>
            <p className="mt-5 text-slate-500 leading-relaxed text-center">
              One photo is all it takes. Local models classify the issue, you confirm or edit, and it's instantly pinned on the city map.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-5 mb-14">
            {[
              { step: '01', icon: Map, title: 'Snap & Report', desc: 'Open the map, tap +, take a photo of the footpath issue and capture your GPS location automatically.', color: 'from-blue-500 to-blue-600' },
              { step: '02', icon: ShieldAlert, title: 'AI Classifies', desc: 'Local models analyze the photo and identify garbage, encroachment, or obstruction with a plain-English description.', color: 'from-emerald-500 to-teal-600' },
              { step: '03', icon: Navigation, title: 'Pinned on Map', desc: 'After you review and confirm the AI result, the report is color-coded and pinned on the live city map.', color: 'from-purple-500 to-purple-600' },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:flex absolute top-9 right-0 translate-x-1/2 z-10 w-6 h-6 items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
                <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all h-full text-center">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className={`w-11 h-11 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-4xl font-black text-slate-100">{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Classification legend */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
            <h3 className="text-xs font-semibold text-slate-500 mb-5 uppercase tracking-wider text-center">Footpath Classification System</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { color: '#22c55e', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Green — Clear', desc: 'No issues detected. Footpath is safe and accessible.' },
                { color: '#eab308', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Yellow — Warning', desc: 'One issue detected. Minor obstruction or single concern.' },
                { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-200', label: 'Red — Critical', desc: 'Two or more issues. Requires urgent attention from BBMP.' },
              ].map((c) => (
                <div key={c.label} className={`flex gap-3 items-start ${c.bg} rounded-xl p-5 border ${c.border}`}>
                  <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: c.color }} />
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{c.label}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-teal-700 border-b border-emerald-700">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight text-white text-center">
            Ready to make Bengaluru walkable?
          </h2>
          <p className="text-emerald-100/80 text-base mb-10 max-w-md mx-auto leading-relaxed text-center">
            Join the community effort to document and fix every broken footpath in the city.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/map">
              <button className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-px text-sm cursor-pointer">
                Open the Map <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/admin">
              <button className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all text-sm cursor-pointer">
                Admin Dashboard
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 py-6 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-300 font-medium">Namma Bengaluru Infra Monitor</span>
          </div>
          <span className="text-center">Powered by Local AI Models · Supabase · OpenStreetMap</span>
        </div>
      </footer>
    </div>
  );
}
