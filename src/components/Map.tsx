import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { format, isValid, parseISO } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl });

const createCirclePin = (color: string, size = 20) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const icons = {
  green: createCirclePin('#22c55e'),
  yellow: createCirclePin('#eab308'),
  red: createCirclePin('#ef4444'),
  escalator: createCirclePin('#3b82f6'),
  elevator: createCirclePin('#a855f7'),
};

const BBMP_WARDS_URL = '/bbmpwards.geojson';

const boundaryStyle = {
  fillColor: '#10b981',
  fillOpacity: 0.04,
  color: '#059669',
  weight: 2,
  opacity: 0.6,
  dashArray: '6, 5',
};

// Component to fly map to a position
function FlyToController({ flyTo }: { flyTo: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 16, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
}

interface MapProps {
  showFootpaths: boolean;
  showEscalators: boolean;
  showElevators: boolean;
  refreshKey: number;
  onDataLoaded?: (footpaths: any[], escalators: any[], elevators: any[]) => void;
  flyTo?: [number, number] | null;
}

export function MapComponent({ showFootpaths, showEscalators, showElevators, refreshKey, onDataLoaded, flyTo }: MapProps) {
  const [footpaths, setFootpaths] = useState<any[]>([]);
  const [escalators, setEscalators] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const { toast } = useToast();

  const normalizeCoords = (item: any) => {
    const rawLat = item.lat ?? item.latitude ?? item.location?.lat;
    const rawLng = item.lng ?? item.longitude ?? item.lon ?? item.long ?? item.location?.lng;
    const lat = typeof rawLat === 'string' ? Number(rawLat) : rawLat;
    const lng = typeof rawLng === 'string' ? Number(rawLng) : rawLng;
    return {
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    };
  };

  const hasValidCoords = (item: any) => {
    const { lat, lng } = normalizeCoords(item);
    return lat !== undefined && lng !== undefined;
  };

  const parseBoolean = (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    return false;
  };

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return 'Unknown';
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    return isValid(date) ? format(date, 'PPpp') : 'Unknown';
  };

  const getFootpathColor = (fp: any): 'green' | 'yellow' | 'red' => {
    if (fp.color === 'red') return 'red';
    if (fp.color === 'yellow') return 'yellow';
    if (fp.color === 'green') return 'green';
    // Fallback: compute from booleans
    const count = [parseBoolean(fp.garbage), parseBoolean(fp.encroachment), parseBoolean(fp.obstruction)].filter(Boolean).length;
    if (count >= 2) return 'red';
    if (count === 1) return 'yellow';
    return 'green';
  };

  useEffect(() => {
    fetch(BBMP_WARDS_URL)
      .then(res => res.json())
      .then(data => setBoundaryGeoJSON(data))
      .catch(err => console.error('Failed to load BBMP boundary:', err));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [fpRes, escRes, elvRes] = await Promise.all([
        supabase.from('footpath_reports').select('*'),
        supabase.from('escalator1').select('*'),
        supabase.from('elevator1').select('*'),
      ]);

      const fps = fpRes.data || [];
      const escs = escRes.data || [];
      const elvs = elvRes.data || [];

      setFootpaths(fps);
      setEscalators(escs);
      setElevators(elvs);

      if (onDataLoaded) onDataLoaded(fps, escs, elvs);
    };

    fetchData();
  }, [refreshKey]);

  const colorLabel = (color: string) => {
    if (color === 'red') return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    if (color === 'yellow') return { label: 'Warning', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    return { label: 'Clear', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  };

  return (
    <MapContainer center={[12.9716, 77.5946]} zoom={12} className="w-full h-full z-0">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />

      {flyTo && <FlyToController flyTo={flyTo} />}

      {boundaryGeoJSON && (
        <GeoJSON key="bbmp-boundary" data={boundaryGeoJSON} style={() => boundaryStyle} />
      )}

      {showFootpaths && footpaths.filter(hasValidCoords).map(fp => {
        const color = getFootpathColor(fp);
        const cl = colorLabel(color);
        return (
          <Marker key={`fp-${fp.id}`} position={[fp.lat, fp.lng]} icon={icons[color]}>
            <Popup>
              <div className="p-3 min-w-[220px] font-['Inter',sans-serif]">
                {fp.image_url && (
                  <img
                    src={fp.image_url}
                    alt="Footpath"
                    className="w-full h-28 object-cover rounded-xl mb-3 border border-slate-100"
                    onClick={() => window.open(fp.image_url, '_blank')}
                    style={{ cursor: 'zoom-in' }}
                  />
                )}
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900 text-sm">{fp.location_desc || 'Footpath Report'}</p>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cl.bg} ${cl.text} px-2 py-0.5 rounded-full`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cl.dot}`} />
                    {cl.label}
                  </span>
                </div>

                {fp.ai_description && (
                  <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2 mb-3">"{fp.ai_description}"</p>
                )}

                <p className="text-[10px] text-slate-400 mb-3">{formatTimestamp(fp.created_at)}</p>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  {[
                    { label: 'Garbage', val: parseBoolean(fp.garbage) },
                    { label: 'Encroachment', val: parseBoolean(fp.encroachment) },
                    { label: 'Obstruction', val: parseBoolean(fp.obstruction) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-xs text-slate-600">
                      <span>{item.label}</span>
                      {item.val
                        ? <XCircle className="w-4 h-4 text-red-500" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      }
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showEscalators && escalators.filter(hasValidCoords).map(esc => {
        const { lat, lng } = normalizeCoords(esc);
        return (
          <Marker key={`esc-${esc.id}`} position={[lat!, lng!]} icon={icons.escalator}>
            <Popup>
              <div className="p-3 min-w-[200px] font-['Inter',sans-serif]">
                <p className="font-semibold text-slate-900 text-sm mb-1">{esc.location_desc || 'Escalator'}</p>
                <p className="text-[10px] text-slate-400 mb-3">Updated: {formatTimestamp(esc.updated_at || esc.created_at)}</p>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${esc.status === 'operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {esc.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${esc.priority === 'high' ? 'bg-red-100 text-red-700' : esc.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                      {esc.priority || 'low'}
                    </span>
                  </div>
                  {esc.issue && <div className="text-slate-500 italic text-[10px] pt-1 border-t border-slate-100">"{esc.issue}"</div>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showElevators && elevators.filter(hasValidCoords).map(elv => {
        const { lat, lng } = normalizeCoords(elv);
        return (
          <Marker key={`elv-${elv.id}`} position={[lat!, lng!]} icon={icons.elevator}>
            <Popup>
              <div className="p-3 min-w-[200px] font-['Inter',sans-serif]">
                <p className="font-semibold text-slate-900 text-sm mb-1">{elv.location_desc || 'Elevator'}</p>
                <p className="text-[10px] text-slate-400 mb-3">Updated: {formatTimestamp(elv.updated_at || elv.created_at)}</p>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${elv.status === 'operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {elv.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${elv.priority === 'high' ? 'bg-red-100 text-red-700' : elv.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                      {elv.priority || 'low'}
                    </span>
                  </div>
                  {elv.issue && <div className="text-slate-500 italic text-[10px] pt-1 border-t border-slate-100">"{elv.issue}"</div>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
