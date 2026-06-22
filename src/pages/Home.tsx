import { useState } from "react";
import { useLocation } from "wouter";
import { MapComponent } from "@/components/Map";
import { ReportModal } from "@/components/ReportModal";
import { SidePanel } from "@/components/SidePanel";
import { Link } from "wouter";
import { Plus, BarChart2, Settings, Navigation, ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [showFootpaths, setShowFootpaths] = useState(true);
  const [showEscalators, setShowEscalators] = useState(true);
  const [showElevators, setShowElevators] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [footpaths, setFootpaths] = useState<any[]>([]);
  const [escalators, setEscalators] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  const handleReportSuccess = () => setRefreshKey((prev) => prev + 1);

  const handleItemClick = (item: any) => {
    const lat = item.lat ?? item.latitude;
    const lng = item.lng ?? item.longitude ?? item.lon;
    if (lat && lng) setMapCenter([parseFloat(lat), parseFloat(lng)]);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Nav ── */}
      <div className="absolute top-0 left-0 right-0 z-[1001] h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shadow-sm">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block">Namma Bengaluru Infra</span>
          </div>
        </Link>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        {/* Layer toggles — centred */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {[
            { label: 'Footpaths', state: showFootpaths, set: setShowFootpaths, activeColor: 'bg-emerald-600 text-white border-emerald-600', dotColor: 'bg-emerald-500' },
            { label: 'Escalators', state: showEscalators, set: setShowEscalators, activeColor: 'bg-blue-600 text-white border-blue-600', dotColor: 'bg-blue-500' },
            { label: 'Elevators', state: showElevators, set: setShowElevators, activeColor: 'bg-purple-600 text-white border-purple-600', dotColor: 'bg-purple-500' },
          ].map((layer) => (
            <button
              key={layer.label}
              onClick={() => layer.set(!layer.state)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                layer.state
                  ? layer.activeColor
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${layer.state ? 'bg-white' : layer.dotColor}`} />
              {layer.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setLocation('/stats')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            title="City Stats"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden md:block">Stats</span>
          </button>
          <button
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
            title="Admin"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:block">Admin</span>
          </button>
        </div>
      </div>

      {/* ── Body (below nav) ── */}
      <div className="absolute top-14 left-0 right-0 bottom-0 flex">

        {/* Side panel */}
        <div className={`flex-shrink-0 h-full transition-all duration-300 ease-in-out relative z-[1000] ${sidePanelOpen ? 'w-72' : 'w-0'}`}>
          <div className={`h-full overflow-hidden transition-all duration-300 ${sidePanelOpen ? 'w-72' : 'w-0'}`}>
            <SidePanel
              footpaths={footpaths}
              escalators={escalators}
              elevators={elevators}
              onItemClick={handleItemClick}
            />
          </div>

          {/* Panel toggle tab */}
          <button
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className="absolute top-1/2 -translate-y-1/2 -right-5 z-10 w-5 h-12 bg-white border border-slate-200 rounded-r-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-all cursor-pointer"
          >
            {sidePanelOpen
              ? <ChevronLeft className="w-3 h-3 text-slate-500" />
              : <ChevronRight className="w-3 h-3 text-slate-500" />
            }
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 h-full relative">
          <MapComponent
            showFootpaths={showFootpaths}
            showEscalators={showEscalators}
            showElevators={showElevators}
            refreshKey={refreshKey}
            onDataLoaded={(fp, esc, elv) => {
              setFootpaths(fp);
              setEscalators(esc);
              setElevators(elv);
            }}
            flyTo={mapCenter}
          />

          {/* FAB */}
          <div className="absolute bottom-8 right-6 z-[500]">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Report footpath issue"
            >
              <Plus className="w-7 h-7" />
            </button>
            <div className="text-center mt-1.5">
              <span className="text-[10px] font-semibold text-white bg-slate-700/70 backdrop-blur-sm px-2 py-0.5 rounded-full">Report</span>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
}
