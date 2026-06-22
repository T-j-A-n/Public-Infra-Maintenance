import { useState } from "react";
import { Search, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Activity } from "lucide-react";

interface SidePanelProps {
  footpaths: any[];
  escalators: any[];
  elevators: any[];
  onItemClick: (item: any, type?: string) => void;
}

export function SidePanel({ footpaths, escalators, elevators, onItemClick }: SidePanelProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'footpaths' | 'escalators' | 'elevators'>('footpaths');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issues' | 'clear'>('all');

  const parseBoolean = (v: any) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    return false;
  };

  const getColor = (fp: any): 'green' | 'yellow' | 'red' => {
    if (fp.color === 'red') return 'red';
    if (fp.color === 'yellow') return 'yellow';
    if (fp.color === 'green') return 'green';
    const count = [parseBoolean(fp.garbage), parseBoolean(fp.encroachment), parseBoolean(fp.obstruction)].filter(Boolean).length;
    return count >= 2 ? 'red' : count === 1 ? 'yellow' : 'green';
  };

  const filteredFps = footpaths.filter(fp => {
    const desc = (fp.location_desc || '').toLowerCase();
    const matchSearch = desc.includes(search.toLowerCase());
    const color = getColor(fp);
    if (statusFilter === 'issues') return matchSearch && (color === 'red' || color === 'yellow');
    if (statusFilter === 'clear') return matchSearch && color === 'green';
    return matchSearch;
  });

  const filteredEscs = escalators.filter(esc => {
    const desc = (esc.location_desc || '').toLowerCase();
    const matchSearch = desc.includes(search.toLowerCase());
    if (statusFilter === 'issues') return matchSearch && esc.status !== 'operational';
    if (statusFilter === 'clear') return matchSearch && esc.status === 'operational';
    return matchSearch;
  });

  const filteredElvs = elevators.filter(elv => {
    const desc = (elv.location_desc || '').toLowerCase();
    const matchSearch = desc.includes(search.toLowerCase());
    if (statusFilter === 'issues') return matchSearch && elv.status !== 'operational';
    if (statusFilter === 'clear') return matchSearch && elv.status === 'operational';
    return matchSearch;
  });

  const colorDot: Record<string, string> = {
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
  };

  const colorLabel: Record<string, string> = {
    green: 'Clear',
    yellow: 'Warning',
    red: 'Critical',
  };

  const tabCounts = {
    footpaths: filteredFps.length,
    escalators: filteredEscs.length,
    elevators: filteredElvs.length,
  };

  return (
    <div className="h-full w-72 bg-white border-r border-slate-200 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <h2 className="font-semibold text-sm text-slate-900">Infrastructure</h2>
        <p className="text-xs text-slate-400 mt-0.5">Click an item to locate on map</p>
      </div>

      {/* Search + filters */}
      <div className="px-4 py-3 space-y-2.5 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-1">
          {([['all', 'All'], ['issues', 'Issues'], ['clear', 'Clear']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                statusFilter === val
                  ? val === 'issues' ? 'bg-red-500 text-white'
                    : val === 'clear' ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {(['footpaths', 'escalators', 'elevators'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all cursor-pointer border-b-2 ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'footpaths' ? 'Paths' : tab === 'escalators' ? 'Escs' : 'Lifts'}
            <span className={`ml-1 ${activeTab === tab ? 'text-emerald-500' : 'text-slate-300'}`}>
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'footpaths' && (
          <div>
            {filteredFps.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">No footpaths match your filters</div>
            )}
            {filteredFps.map(fp => {
              const color = getColor(fp);
              return (
                <button
                  key={fp.id}
                  onClick={() => onItemClick(fp, 'footpath')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 group"
                >
                  {fp.image_url ? (
                    <img src={fp.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {fp.location_desc || 'Footpath Report'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colorDot[color]}`} />
                      <span className="text-xs text-slate-400">{colorLabel[color]}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'escalators' && (
          <div>
            {filteredEscs.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">No escalators match your filters</div>
            )}
            {filteredEscs.map(esc => (
              <button
                key={esc.id}
                onClick={() => onItemClick(esc, 'escalator')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{esc.location_desc || 'Escalator'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {esc.status === 'operational'
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      : <AlertTriangle className="w-3 h-3 text-red-400" />
                    }
                    <span className="text-xs text-slate-400 capitalize">{esc.status || 'Unknown'}</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'elevators' && (
          <div>
            {filteredElvs.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">No elevators match your filters</div>
            )}
            {filteredElvs.map(elv => (
              <button
                key={elv.id}
                onClick={() => onItemClick(elv, 'elevator')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{elv.location_desc || 'Elevator'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {elv.status === 'operational'
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      : <AlertTriangle className="w-3 h-3 text-red-400" />
                    }
                    <span className="text-xs text-slate-400 capitalize">{elv.status || 'Unknown'}</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-400 text-center">
          {footpaths.length} paths · {escalators.length} escalators · {elevators.length} lifts
        </p>
      </div>
    </div>
  );
}
