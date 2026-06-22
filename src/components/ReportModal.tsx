import { useState, useRef } from "react";
import {
  Camera, MapPin, Loader2, UploadCloud, Sparkles,
  CheckCircle2, XCircle, Edit3, RotateCcw, X, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeFootpathImage } from "@/lib/gemini";
import { computeFootpathColor } from "@/lib/colorLogic";
import { supabase } from "@/lib/supabase";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'capture' | 'review' | 'submitting';

export function ReportModal({ open, onOpenChange, onSuccess }: ReportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('capture');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDesc, setLocationDesc] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [garbage, setGarbage] = useState(false);
  const [encroachment, setEncroachment] = useState(false);
  const [obstruction, setObstruction] = useState(false);
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setStep('capture');
    setFile(null);
    setPreviewUrl(null);
    setLocation(null);
    setLocationDesc('');
    setAiError(null);
    setIsAnalyzing(false);
    setGarbage(false);
    setEncroachment(false);
    setObstruction(false);
    setDescription('');
    setIsEditing(false);
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      if (!location) getLocation();
    }
  };

  const formatLocationError = (error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access was denied in the browser or macOS permissions.';
      case error.POSITION_UNAVAILABLE:
        return 'Location is currently unavailable. Try moving to a place with better signal and retry.';
      case error.TIMEOUT:
        return 'Getting location timed out. Try again in a moment.';
      default:
        return error.message || 'Could not determine your location.';
    }
  };

  const getLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsGettingLocation(false);
      },
      error => {
        setIsGettingLocation(false);
        toast({
          title: 'Could not get GPS location',
          description: formatLocationError(error),
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  };

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
    });

  /** Run local model inference — always transition to review even on failure */
  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const base64 = await fileToBase64(file);
      const result = await analyzeFootpathImage(base64);
      setGarbage(result.garbage);
      setEncroachment(result.encroachment);
      setObstruction(result.obstruction);
      setDescription(result.description);
    } catch (err: any) {
      // On failure: go to review with empty state + show inline notice
      setAiError(err.message || 'AI analysis unavailable — make sure the local model API is running. You can still classify manually below.');
    } finally {
      setIsAnalyzing(false);
      setStep('review'); // always proceed to review
    }
  };

  const handleSubmit = async () => {
    if (!file || !location) return;
    setIsSubmitting(true);
    try {
      const color = computeFootpathColor(garbage, encroachment, obstruction);
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('footpath_images')
        .upload(fileName, file);

      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('footpath_images')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('footpath_reports')
        .insert({
          lat: location.lat,
          lng: location.lng,
          image_url: publicUrl,
          garbage,
          encroachment,
          obstruction,
          color,
          location_desc: locationDesc,
          ai_description: description,
        });

      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      toast({ title: "Report submitted!", description: "Pinned on the city map." });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const color = computeFootpathColor(garbage, encroachment, obstruction);
  const colorConfig = {
    green: { bg: 'bg-emerald-50', border: 'border-emerald-300', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', dot: '#22c55e', label: 'Clear', sublabel: 'No issues detected' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', dot: '#eab308', label: 'Warning', sublabel: '1 issue detected' },
    red: { bg: 'bg-red-50', border: 'border-red-300', badgeBg: 'bg-red-100', badgeText: 'text-red-700', dot: '#ef4444', label: 'Critical', sublabel: '2+ issues detected' },
  }[color];

  const issues = [
    { label: 'Garbage / Litter', state: garbage, set: setGarbage },
    { label: 'Encroachment', state: encroachment, set: setEncroachment },
    { label: 'Obstruction / Damage', state: obstruction, set: setObstruction },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSubmitting && (reset(), onOpenChange(false))}
      />

      {/* ── Modal card ── */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Report Footpath Issue</h2>
            {/* Step pills */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {[
                { n: 1, label: 'Capture' },
                { n: 2, label: 'Review & Submit' },
              ].map(({ n, label }, i) => {
                const active = (step === 'capture' && n === 1) || (step !== 'capture' && n === 2);
                const done = step !== 'capture' && n === 1;
                return (
                  <div key={n} className="flex items-center gap-1">
                    {i > 0 && <div className="w-5 h-px bg-slate-200" />}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      done ? 'bg-emerald-100 text-emerald-700'
                      : active ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400'
                    }`}>
                      {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : n}
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {!isSubmitting && (
            <button
              onClick={() => { reset(); onOpenChange(false); }}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1">

          {/* ──────────── STEP 1: CAPTURE ──────────── */}
          {step === 'capture' && (
            <div className="p-5 space-y-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {/* Photo picker */}
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200" style={{ aspectRatio: '4/3' }}>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-white/95 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg shadow border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RotateCcw className="w-3 h-3" /> Retake
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer py-10"
                >
                  <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-700 text-sm">Tap to take a photo</p>
                    <p className="text-xs text-emerald-500 mt-0.5">or choose from gallery</p>
                  </div>
                </button>
              )}

              {/* GPS row */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${location ? 'text-emerald-500' : 'text-slate-300'}`} />
                  {location
                    ? <span className="text-slate-700 font-medium tabular-nums">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                    : <span className="text-slate-400">GPS location required</span>
                  }
                </div>
                <button
                  onClick={getLocation}
                  disabled={isGettingLocation}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGettingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                  {isGettingLocation ? 'Getting...' : 'Get GPS'}
                </button>
              </div>

              {/* Location label (optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Location Label <span className="font-normal normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Indiranagar Metro Station"
                  value={locationDesc}
                  onChange={e => setLocationDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all"
                />
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!file || !location || isAnalyzing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {isAnalyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with local models…</>
                  : <><Sparkles className="w-4 h-4" /> Analyze with AI</>
                }
              </button>

              {!file && (
                <p className="text-center text-xs text-slate-400">Add a photo first</p>
              )}
              {file && !location && (
                <p className="text-center text-xs text-amber-500">📍 Tap "Get GPS" to capture your location</p>
              )}
            </div>
          )}

          {/* ──────────── STEP 2: REVIEW & SUBMIT ──────────── */}
          {step === 'review' && (
            <div className="p-5 space-y-4">

              {/* AI error banner (if API key missing / failed) */}
              {aiError && (
                <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">{aiError}</p>
                </div>
              )}

              {/* Photo + classification badge */}
              <div className="flex gap-3 items-stretch">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Footpath"
                    className="w-28 rounded-xl border border-slate-200 object-cover flex-shrink-0"
                    style={{ height: '96px' }}
                  />
                )}
                <div className={`flex-1 rounded-xl border-2 ${colorConfig.border} ${colorConfig.bg} flex flex-col items-center justify-center p-3 text-center`}>
                  <span className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: colorConfig.dot, display: 'inline-block' }} />
                  <p className={`text-base font-extrabold ${colorConfig.badgeText}`}>{colorConfig.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{colorConfig.sublabel}</p>
                </div>
              </div>

              {/* ── Issue Checkboxes ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Issues Detected</p>
                  <span className="text-xs text-slate-400">Tap to toggle</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {issues.map(item => (
                    <button
                      key={item.label}
                      onClick={() => item.set(!item.state)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all cursor-pointer text-left ${
                        item.state ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* Visual checkbox */}
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        item.state ? 'bg-red-500 border-red-500' : 'border-slate-300 bg-white'
                      }`}>
                        {item.state && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${item.state ? 'text-red-700' : 'text-slate-600'}`}>
                        {item.label}
                      </span>
                      {item.state
                        ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0" />
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* ── AI Description ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">AI Description</p>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                </div>
                <div className="p-4 bg-white">
                  {isEditing ? (
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the issue..."
                      className="w-full text-sm text-slate-700 border border-slate-200 bg-slate-50 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {description
                        ? <><span className="text-slate-400 mr-1">"</span>{description}<span className="text-slate-400">"</span></>
                        : <span className="text-slate-400 italic">No description yet — tap Edit to add one.</span>
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* GPS info */}
              {location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span className="tabular-nums">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                  {locationDesc && <><span>·</span><span className="text-slate-600 font-medium">{locationDesc}</span></>}
                </div>
              )}

              {/* ── Action buttons ── */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => setStep('capture')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all cursor-pointer text-sm disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>

                {/* ── PRIMARY: Submit ── */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !location}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-sm shadow-sm shadow-emerald-600/20 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    : <><UploadCloud className="w-4 h-4" /> Submit Report</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
