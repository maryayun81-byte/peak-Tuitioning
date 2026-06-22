'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette, Save, Download, Share2, ChevronDown,
  FlaskConical, Zap, BookOpen, Layout, Trash2,
  Layers, Settings2, FileText, Image as ImageIcon,
  Printer, X, Check, ChevronRight, BookMarked, Eye, Info, Sigma,
  Cloud, CloudOff, Loader2
} from 'lucide-react';
import ExcalidrawWrapper from '@/components/teacher/resources/ExcalidrawWrapper';
import ChemicalEquationEditor from '@/components/teacher/resources/ChemicalEquationEditor';
import { chemistryLibraryItems, chemistryTemplates } from '@/lib/chemistry-library';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// ─── Chemistry Templates ────────────────────────────────────────────────────────
  // Map template IDs to actual elements from library
  const TEMPLATES = [
    {
      id: 'electrolysis',
      name: 'Electrolysis Cell',
      category: 'Electrochemistry',
      emoji: '⚡',
      color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      description: 'Anode/cathode setup in electrolyte with battery',
      templateId: 'tmpl-electrolysis',
    },
    {
      id: 'hess-cycle',
      name: 'Hess Law Cycle',
      category: 'Energetics',
      emoji: '🔄',
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      description: 'Enthalpy cycle triangle with ΔH labels',
      templateId: 'tmpl-hess-law',
    },
    {
      id: 'energy-profile',
      name: 'Energy Profile Diagram',
      category: 'Energetics',
      emoji: '📈',
      color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
      description: 'Activation energy curve, reactants, products',
      templateId: 'tmpl-energy-profile',
    },
    {
      id: 'distillation',
      name: 'Distillation Setup',
      category: 'Practical',
      emoji: '🔬',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      description: 'Flask, condenser, water in/out, collection',
      templateId: 'tmpl-distillation',
    },
    {
      id: 'born-haber',
      name: 'Born-Haber Cycle',
      category: 'Energetics',
      emoji: '🏗️',
      color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      description: 'Lattice energy vertical ladder cycle',
      templateId: 'tmpl-born-haber',
    },
    {
      id: 'blast-furnace',
      name: 'Blast Furnace',
      category: 'Extraction',
      emoji: '🏭',
      color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      description: 'Iron extraction with zones and inlets',
      templateId: null,
    },
    {
      id: 'titration',
      name: 'Titration Setup',
      category: 'Practical',
      emoji: '💧',
      color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
      description: 'Burette, conical flask, indicator',
      templateId: null,
    },
    {
      id: 'organic-pathway',
      name: 'Organic Reaction Map',
      category: 'Organic',
      emoji: '⛓️',
      color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
      description: 'Ethane → Ethanol → Ethanoic acid pathway',
      templateId: null,
    },
  ];

// ─── Chemistry Apparatus Sidebar ──────────────────────────────────────────────
const APPARATUS_GROUPS = [
  {
    name: 'Glassware',
    items: ['Beaker', 'Conical Flask', 'Round-bottom Flask', 'Test Tube', 'Boiling Tube', 'Measuring Cylinder', 'Burette', 'Pipette', 'Gas Jar', 'Separating Funnel', 'Filter Funnel', 'Watch Glass'],
  },
  {
    name: 'Heat & Support',
    items: ['Bunsen Burner', 'Tripod Stand', 'Wire Gauze', 'Retort Stand', 'Evaporating Dish', 'Crucible'],
  },
  {
    name: 'Electrochemistry',
    items: ['Carbon Electrode', 'Copper Electrode', 'Zinc Electrode', 'Battery', 'Switch', 'Voltmeter', 'Ammeter', 'Salt Bridge', 'Electrolyte Container'],
  },
  {
    name: 'Connections',
    items: ['Delivery Tube', 'Rubber Bung', 'Stopper', 'Clamp', 'Spatula', 'Tongs'],
  },
  {
    name: 'Symbols & Arrows',
    items: ['→ Reaction Arrow', '⇌ Equilibrium Arrow', '⟶ Forward Arrow', '↑ Gas Evolved', '↓ Precipitate', 'ΔH Label', 'Ea Label', 'e⁻ Electron', 'Observation Box', 'Inference Box'],
  },
];

// ─── Chemical Symbol Quick-Insert ─────────────────────────────────────────────
const CHEM_SYMBOLS = [
  { label: 'H₂O', value: 'H₂O' },
  { label: 'CO₂', value: 'CO₂' },
  { label: 'O₂', value: 'O₂' },
  { label: 'Na⁺', value: 'Na⁺' },
  { label: 'Cl⁻', value: 'Cl⁻' },
  { label: 'Al³⁺', value: 'Al³⁺' },
  { label: 'SO₄²⁻', value: 'SO₄²⁻' },
  { label: 'OH⁻', value: 'OH⁻' },
  { label: 'H⁺', value: 'H⁺' },
  { label: 'NH₃', value: 'NH₃' },
  { label: 'CH₄', value: 'CH₄' },
  { label: '→', value: '→' },
  { label: '⇌', value: '⇌' },
  { label: 'ΔH', value: 'ΔH' },
  { label: 'Ea', value: 'Ea' },
  { label: '⊕', value: '⊕' },
  { label: '⊖', value: '⊖' },
  { label: 'δ+', value: 'δ+' },
  { label: 'δ−', value: 'δ−' },
  { label: 'e⁻', value: 'e⁻' },
];

// ─── Sidebar Panel ─────────────────────────────────────────────────────────────
type SidebarPanel = 'apparatus' | 'templates' | 'saves' | 'symbols' | 'equation' | null;

export default function ChemistryDrawStudio() {
  const supabase = getSupabaseBrowserClient();
  const { profile } = useAuthStore();

  const [elements, setElements] = useState<any[]>([]);
  const [appState, setAppState] = useState<any>({});
  const [canvasInitialData, setCanvasInitialData] = useState<{ elements: any[]; appState: any } | undefined>(undefined);
  const [canvasKey, setCanvasKey] = useState(0);
  const [activePanel, setActivePanel] = useState<SidebarPanel>('apparatus');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveNameModal, setShowSaveNameModal] = useState(false);
  const [saveName, setSaveName] = useState('Untitled Chemistry Diagram');
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Glassware']);
  const [notification, setNotification] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const excalidrawRef = useRef<any>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedElements = useRef<string>('');

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Load drawings from Supabase on mount ──────────────────────────────────
  const loadDrawings = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('id, title, description, content, updated_at')
        .eq('resource_type', 'studio-drawing')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedDrawings(data || []);
      setLoadError(null);
    } catch (e: any) {
      console.error('Failed to load drawings:', e);
      setLoadError(e.message || 'Failed to load drawings');
    }
  }, [supabase, profile?.id]);

  useEffect(() => {
    loadDrawings();
  }, [loadDrawings]);

  // ── Save drawing to Supabase ──────────────────────────────────────────────
  const persistDrawing = useCallback(async (name: string, drawingId: string | null, els: any[], state: any) => {
    if (!profile?.id) return null;
    setIsSaving(true);

    try {
      const payload = {
        teacher_id: profile.id,
        subject: 'Chemistry',
        topic: 'Studio Drawing',
        resource_type: 'studio-drawing',
        title: name,
        content: { elements: els, appState: state },
        updated_at: new Date().toISOString(),
      };

      if (drawingId) {
        const { data, error } = await supabase
          .from('educational_resources')
          .update(payload)
          .eq('id', drawingId)
          .select('id, title, updated_at')
          .single();

        if (error) throw error;
        lastSavedElements.current = JSON.stringify(els);
        await loadDrawings();
        return data;
      } else {
        const { data, error } = await supabase
          .from('educational_resources')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('id, title, updated_at')
          .single();

        if (error) throw error;
        lastSavedElements.current = JSON.stringify(els);
        setCurrentDrawingId(data.id);
        await loadDrawings();
        return data;
      }
    } catch (e: any) {
      console.error('Failed to save drawing:', e);
      showNotification(`Save failed: ${e.message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [supabase, profile?.id, loadDrawings]);

  // ── Manual save triggered by Save button ──────────────────────────────────
  const handleSave = () => {
    setShowSaveNameModal(true);
  };

  const confirmSave = async () => {
    setShowSaveNameModal(false);
    const result = await persistDrawing(saveName, currentDrawingId, elements, appState);
    if (result) {
      setSaveSuccess(true);
      showNotification(`"${saveName}" saved!`);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  // ── Auto-save with debounce ───────────────────────────────────────────────
  const handleChange = useCallback((els: any[], state: any) => {
    setElements(els);
    setAppState(state);

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const current = JSON.stringify({ els, state });
      if (current !== lastSavedElements.current && els.length > 0) {
        persistDrawing(saveName, currentDrawingId, els, state);
      }
    }, 30000);
  }, [saveName, currentDrawingId, persistDrawing]);

  // ── Load a saved drawing onto the canvas ──────────────────────────────────
  const handleLoadDrawing = async (drawing: any) => {
    try {
      const { data, error } = await supabase
        .from('educational_resources')
        .select('*')
        .eq('id', drawing.id)
        .single();

      if (error) throw error;
      if (data?.content?.elements) {
        setCanvasInitialData({ elements: data.content.elements, appState: data.content.appState || {} });
        setCanvasKey(k => k + 1);
        setSaveName(data.title);
        setCurrentDrawingId(data.id);
        lastSavedElements.current = JSON.stringify(data.content.elements);
        setActivePanel(null);
        showNotification(`"${data.title}" loaded!`);
      }
    } catch (e: any) {
      console.error('Failed to load drawing:', e);
      showNotification('Failed to load drawing');
    }
  };

  // ── Delete a drawing ──────────────────────────────────────────────────────
  const handleDeleteSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('educational_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSavedDrawings(prev => prev.filter(d => d.id !== id));
      showNotification('Drawing deleted.');
    } catch (e: any) {
      console.error('Failed to delete drawing:', e);
      showNotification('Failed to delete drawing');
    }
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );
  };

  const handleApparatusClick = (item: string) => {
    showNotification(`Drag-and-drop library items via the Excalidraw library panel (☰ icon). "${item}" tip noted!`);
  };

  const handleSymbolClick = (symbol: string) => {
    navigator.clipboard.writeText(symbol).then(() => {
      showNotification(`"${symbol}" copied! Paste it into the canvas text tool.`);
    });
  };

  const handleTemplateLoad = (template: typeof TEMPLATES[0]) => {
    const tmpl = chemistryTemplates.find(t => t.id === (template as any).templateId);
    if (tmpl) {
      setCanvasInitialData({ elements: tmpl.elements, appState: {} });
      setCanvasKey(k => k + 1);
      showNotification(`"${template.name}" loaded onto canvas!`);
    } else {
      showNotification(`"${template.name}" template coming soon! Draw it from scratch using the apparatus panel.`);
    }
    setActivePanel(null);
  };

  const panelButtons = [
    { id: 'apparatus' as SidebarPanel, icon: FlaskConical, label: 'Apparatus', tooltip: 'Chemistry Apparatus' },
    { id: 'templates' as SidebarPanel, icon: Layout, label: 'Templates', tooltip: 'Diagram Templates' },
    { id: 'equation' as SidebarPanel, icon: Sigma, label: 'Equation', tooltip: 'Chemical Equation Editor' },
    { id: 'symbols' as SidebarPanel, icon: Zap, label: 'Symbols', tooltip: 'Chemical Symbols' },
    { id: 'saves' as SidebarPanel, icon: BookMarked, label: 'Saved', tooltip: 'Saved Drawings' },
  ];

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 font-sans overflow-hidden">

      {/* ─── Top Header (floating glassmorphism bar) ──────────────────── */}
      <header className="absolute top-0 left-14 right-0 h-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/resources/chemistry"
            className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            ← Chemistry Lab
          </Link>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Palette size={14} className="text-white" />
            </div>
            <span className="font-black tracking-widest uppercase text-xs text-slate-800 dark:text-white">
              Chemistry Draw Studio™
            </span>
          </div>
          <div className="hidden md:flex items-center gap-1 ml-2">
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">Beta</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-save status */}
          <div className="hidden md:flex items-center gap-1.5 px-2 text-xs font-bold">
            {isSaving ? (
              <span className="flex items-center gap-1 text-amber-500">
                <Loader2 size={12} className="animate-spin" /> Saving...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <Cloud size={12} /> Saved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <CloudOff size={12} /> Auto-save idle
              </span>
            )}
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-all"
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-all"
          >
            <Download size={14} />
            Export
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-black transition-all shadow-lg ${
              saveSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : isSaving
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
          >
            {saveSuccess ? (
              <><Check size={14} /> Saved!</>
            ) : isSaving ? (
              <><Loader2 size={14} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={14} /> Save</>
            )}
          </button>
        </div>
      </header>
      {/* ─── Main Body: Canvas fills 100% of screen, all UI floats on top ── */}
      <div className="absolute inset-0">

        {/* ─── Canvas Area (always full size) ─────────────────────────── */}
        <main className="absolute inset-0 bg-white dark:bg-slate-950">
          <ExcalidrawWrapper
            key={canvasKey}
            onChange={handleChange}
            initialData={canvasInitialData}
            libraryItems={chemistryLibraryItems as any}
            excalidrawApiRef={excalidrawRef}
          />
        </main>

        {/* ─── Left Icon Rail (floating over canvas) ───────────────────── */}
        <nav className="absolute left-0 top-0 bottom-0 w-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200 dark:border-slate-800 flex flex-col items-center pt-14 pb-3 gap-1 z-30 shadow-lg">
          {panelButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setActivePanel(activePanel === btn.id ? null : btn.id)}
              title={btn.tooltip}
              className={`group relative w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs font-bold ${
                activePanel === btn.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <btn.icon size={18} />
              <span className="text-[8px] leading-none">{btn.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          <div className="w-8 border-t border-slate-200 dark:border-slate-700 my-1" />
          <button
            title="Info"
            className="w-10 h-10 rounded-xl text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 flex items-center justify-center transition-all"
          >
            <Info size={16} />
          </button>
        </nav>

        {/* ─── Slide-out Panel (floating overlay, does NOT shrink canvas) ── */}
        {activePanel && (
          <aside className="absolute left-14 top-0 bottom-0 w-72 bg-white/97 dark:bg-slate-900/97 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-20 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-widest">
                {activePanel === 'apparatus' ? '🧪 Apparatus' :
                 activePanel === 'templates' ? '📐 Templates' :
                 activePanel === 'symbols' ? '⚗️ Symbols' :
                 activePanel === 'equation' ? 'Σ Equation Editor' : '💾 Saved'}
              </h2>
              <button
                onClick={() => setActivePanel(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ── Apparatus Panel ── */}
              {activePanel === 'apparatus' && (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-500 px-1 mb-3">
                    Click to copy name, or use the Library Panel (📚) in the canvas toolbar to drag items directly.
                  </p>
                  {APPARATUS_GROUPS.map(group => (
                    <div key={group.name} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{group.name}</span>
                        <ChevronRight
                          size={14}
                          className={`text-slate-400 transition-transform ${expandedGroups.includes(group.name) ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {expandedGroups.includes(group.name) && (
                        <div className="grid grid-cols-2 gap-1 p-2 bg-white dark:bg-slate-900">
                          {group.items.map(item => (
                            <button
                              key={item}
                              onClick={() => handleApparatusClick(item)}
                              className="text-left px-2.5 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Templates Panel ── */}
              {activePanel === 'templates' && (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-500 px-1 mb-3">
                    Load a pre-built chemistry diagram as your starting canvas.
                  </p>
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateLoad(t)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all hover:shadow-md group ${t.color}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{t.emoji}</span>
                        <span className="font-black text-sm text-slate-800 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">{t.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-800/60 text-xs text-slate-500 font-bold">{t.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Symbols Panel ── */}
              {activePanel === 'symbols' && (
                <div className="p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-500 px-1 mb-3">
                    Click a symbol to copy it. Then paste it into the canvas text tool.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CHEM_SYMBOLS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => handleSymbolClick(s.value)}
                        className="p-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-slate-700 dark:text-slate-300"
                        title={`Copy ${s.value}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">Quick Equation Insert:</p>
                    {[
                      '2H₂ + O₂ → 2H₂O',
                      'N₂ + 3H₂ ⇌ 2NH₃',
                      'H⁺ + OH⁻ → H₂O',
                    ].map(eq => (
                      <button
                        key={eq}
                        onClick={() => handleSymbolClick(eq)}
                        className="block w-full text-left text-xs text-amber-700 dark:text-amber-400 hover:text-indigo-600 dark:hover:text-indigo-300 py-0.5 font-mono transition-colors"
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Equation Editor Panel ── */}
              {activePanel === 'equation' && (
                <ChemicalEquationEditor
                  excalidrawApi={excalidrawRef.current}
                  onNotify={showNotification}
                />
              )}

              {/* ── Saved Drawings Panel ── */}
              {activePanel === 'saves' && (
                <div className="p-3 space-y-2">
                  {loadError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">{loadError}</p>
                    </div>
                  )}
                  {savedDrawings.length === 0 && !loadError ? (
                    <div className="text-center py-12">
                      <BookMarked size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-bold text-slate-400">No saved drawings yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Hit Save to store your current canvas.</p>
                    </div>
                  ) : (
                    savedDrawings.map((d: any) => {
                      const elementCount = d.content?.elements?.length || 0;
                      return (
                        <div key={d.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{d.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(d.updated_at).toLocaleDateString()} · {elementCount} {elementCount === 1 ? 'element' : 'elements'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSave(d.id)}
                              className="shrink-0 w-6 h-6 rounded-lg text-slate-300 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleLoadDrawing(d)}
                            className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                          >
                            Load into Canvas
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Floating tip badge */}
        <div className="absolute top-3 right-4 z-10 pointer-events-none">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-slate-400 shadow-lg">
            ✏️ Draw freely · Stylus & touch supported
          </div>
        </div>
      </div>

      {/* ─── Notification Toast ───────────────────────────────────────────────── */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-in fade-in slide-in-from-bottom-4 duration-300">
          ✅ {notification}
        </div>
      )}

      {/* ─── Save Name Modal ─────────────────────────────────────────────────── */}
      {showSaveNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Save Drawing</h2>
            <p className="text-slate-500 text-sm mb-6">Give this drawing a name so you can find it later.</p>
            <input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Electrolysis Cell Diagram"
              onKeyDown={e => e.key === 'Enter' && confirmSave()}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveNameModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Save Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Export Modal ─────────────────────────────────────────────────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Export Drawing</h2>
              <button onClick={() => setShowExportModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'PNG Image', icon: ImageIcon, desc: 'High-res transparent image', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400' },
                { label: 'SVG Vector', icon: Settings2, desc: 'Scalable, editable vector', color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 hover:border-violet-400' },
                { label: 'PDF Handout', icon: FileText, desc: 'A4 printable with branding', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400' },
                { label: 'Poster (A3)', icon: Printer, desc: 'Large format classroom print', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400' },
                { label: 'Flashcard Deck', icon: BookOpen, desc: 'Split into flashcard format', color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:border-rose-400' },
                { label: 'Student Version', icon: Eye, desc: 'Labels hidden for practice', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-400' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { showNotification(`Exporting as ${opt.label}...`); setShowExportModal(false); }}
                  className={`text-left p-4 rounded-2xl border-2 transition-all group ${opt.color}`}
                >
                  <opt.icon size={20} className="mb-2 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  <p className="font-black text-sm text-slate-800 dark:text-white">{opt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Share Modal ──────────────────────────────────────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Share Drawing</h2>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Share with Whole Class', icon: '👩‍🏫', desc: 'Students receive notification in portal' },
                { label: 'Share via WhatsApp', icon: '📱', desc: 'Send as image link to class group' },
                { label: 'Copy Share Link', icon: '🔗', desc: 'View-only link with optional password' },
                { label: 'Add to Marketplace', icon: '🏪', desc: 'Sell or share in teacher marketplace' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { showNotification(`"${opt.label}" — feature available in full release.`); setShowShareModal(false); }}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="font-black text-sm text-slate-800 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{opt.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
