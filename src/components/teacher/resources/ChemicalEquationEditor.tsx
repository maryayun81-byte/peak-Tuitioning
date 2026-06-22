'use client';

import { useState, useCallback, useRef } from 'react';
import { Copy, Plus, ArrowRight, RefreshCw, Trash2 } from 'lucide-react';

// ─── Unicode conversion maps ──────────────────────────────────────────────────

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'k': 'ₖ',
  'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ',
  'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
};

function toUnicodeSub(text: string): string {
  return text.split('').map(c => SUB[c] || c).join('');
}

function toUnicodeSup(text: string): string {
  return text.split('').map(c => SUP[c] || c).join('');
}

// ─── Arrow conversions ────────────────────────────────────────────────────────

const ARROW_MAP: Record<string, string> = {
  '->': '→',
  '-->': '⟶',
  '<->': '↔',
  '<-->': '⟷',
  '<=>': '⇌',
  '=>': '⇒',
  '>': '→',
};

const ARROW_ORDER = ['-->', '<-->', '->', '<->', '<=>', '=>'];

// ─── Format for canvas (Unicode) ──────────────────────────────────────────────

function formatForCanvas(input: string): string {
  let result = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '~') {
      const end = input.indexOf('~', i + 1);
      if (end !== -1) {
        result += toUnicodeSub(input.slice(i + 1, end));
        i = end + 1;
      } else {
        result += input[i];
        i++;
      }
    } else if (input[i] === '^') {
      const end = input.indexOf('^', i + 1);
      if (end !== -1) {
        result += toUnicodeSup(input.slice(i + 1, end));
        i = end + 1;
      } else {
        result += input[i];
        i++;
      }
    } else {
      let matched = false;
      for (const arrow of ARROW_ORDER) {
        if (input.slice(i, i + arrow.length) === arrow) {
          result += ARROW_MAP[arrow];
          i += arrow.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += input[i];
        i++;
      }
    }
  }
  return result;
}

// ─── Format for preview (HTML) ────────────────────────────────────────────────

function formatForPreview(input: string): string {
  let result = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '~') {
      const end = input.indexOf('~', i + 1);
      if (end !== -1) {
        result += `<sub>${escapeHtml(input.slice(i + 1, end))}</sub>`;
        i = end + 1;
      } else {
        result += input[i];
        i++;
      }
    } else if (input[i] === '^') {
      const end = input.indexOf('^', i + 1);
      if (end !== -1) {
        result += `<sup>${escapeHtml(input.slice(i + 1, end))}</sup>`;
        i = end + 1;
      } else {
        result += input[i];
        i++;
      }
    } else {
      let matched = false;
      for (const arrow of ARROW_ORDER) {
        if (input.slice(i, i + arrow.length) === arrow) {
          result += ARROW_MAP[arrow];
          i += arrow.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += escapeChar(input[i]);
        i++;
      }
    }
  }
  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeChar(c: string): string {
  if (c === '&') return '&amp;';
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  return c;
}

// ─── Quick-insert buttons ─────────────────────────────────────────────────────

const QUICK_INSERTS = [
  { label: 'H₂O', insert: 'H~2~O' },
  { label: 'CO₂', insert: 'CO~2~' },
  { label: 'O₂', insert: 'O~2~' },
  { label: 'NH₃', insert: 'NH~3~' },
  { label: 'CH₄', insert: 'CH~4~' },
  { label: 'H₂SO₄', insert: 'H~2~SO~4~' },
  { label: 'NaOH', insert: 'NaOH' },
  { label: 'HCl', insert: 'HCl' },
  { label: 'Na⁺', insert: 'Na^+^' },
  { label: 'Cl⁻', insert: 'Cl^-^' },
  { label: 'OH⁻', insert: 'OH^-^' },
  { label: 'H⁺', insert: 'H^+^' },
  { label: 'Al³⁺', insert: 'Al^3+^' },
  { label: 'SO₄²⁻', insert: 'SO~4~^2-^' },
  { label: 'Fe³⁺', insert: 'Fe^3+^' },
  { label: 'Cu²⁺', insert: 'Cu^2+^' },
  { label: '→', insert: ' -> ' },
  { label: '⇌', insert: ' <=> ' },
  { label: '⟶', insert: ' --> ' },
  { label: 'ΔH', insert: 'ΔH' },
  { label: 'Ea', insert: 'Ea' },
  { label: '(aq)', insert: '(aq)' },
  { label: '(s)', insert: '(s)' },
  { label: '(l)', insert: '(l)' },
  { label: '(g)', insert: '(g)' },
  { label: 'e⁻', insert: 'e^-^' },
  { label: 'δ+', insert: 'δ^+^' },
  { label: 'δ−', insert: 'δ^-^' },
  { label: 'Δ', insert: 'Δ' },
  { label: '°C', insert: '°C' },
  { label: 'kJ/mol', insert: 'kJ/mol' },
  { label: '↑', insert: ' ↑ ' },
  { label: '↓', insert: ' ↓ ' },
];

const PRESET_EQUATIONS = [
  '2H~2~ + O~2~ --> 2H~2~O',
  'N~2~ + 3H~2~ <=> 2NH~3~',
  'H^+^ + OH^-^ --> H~2~O',
  'Na^+^ + Cl^-^ --> NaCl',
  'CaCO~3~(s) --> CaO(s) + CO~2~(g)',
  '2Mg(s) + O~2~(g) --> 2MgO(s)',
  'Zn(s) + CuSO~4~(aq) --> ZnSO~4~(aq) + Cu(s)',
  'C(s) + O~2~(g) --> CO~2~(g)  ΔH = -393 kJ/mol',
];

interface ChemicalEquationEditorProps {
  excalidrawApi?: any;
  onInsert?: (text: string) => void;
  onNotify?: (msg: string) => void;
}

export default function ChemicalEquationEditor({ excalidrawApi, onInsert, onNotify }: ChemicalEquationEditorProps) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canvasText = formatForCanvas(input);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(canvasText).then(() => {
      setCopied(true);
      onNotify?.('Equation copied! You can paste it using Ctrl+V.');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [canvasText, onNotify]);

  const handleInsert = useCallback(() => {
    if (!canvasText) return;
    navigator.clipboard.writeText(canvasText).then(() => {
      if (excalidrawApi?.setActiveTool) {
        try {
          excalidrawApi.setActiveTool({ type: 'text' });
          onNotify?.('Text tool activated! Click on the canvas and paste (Ctrl+V) to place your equation.');
        } catch {
          onNotify?.('Equation copied! Use the text tool (T) to paste it onto the canvas.');
        }
      } else {
        onNotify?.('Equation copied! Use the text tool (T) to paste it onto the canvas.');
      }
    });
  }, [canvasText, excalidrawApi, onNotify]);

  const insertAtCursor = (text: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      setInput(prev => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = input.slice(0, start) + text + input.slice(end);
    setInput(newValue);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    });
  };

  const loadPreset = (eq: string) => {
    setInput(eq);
    inputRef.current?.focus();
  };

  const clearInput = () => {
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-500">
          Use <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-indigo-600 text-[10px] font-mono">~text~</code> for subscripts and{' '}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-indigo-600 text-[10px] font-mono">^text^</code> for superscripts.
        </p>
      </div>

      {/* Quick-insert buttons */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap gap-1">
          {QUICK_INSERTS.map(qi => (
            <button
              key={qi.label}
              onClick={() => insertAtCursor(qi.insert)}
              className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-400 transition-all"
              title={qi.insert}
            >
              {qi.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Input */}
        <div className="px-3 pt-2 pb-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your equation... e.g. 2H~2~ + O~2~ --> 2H~2~O"
            className="w-full h-24 px-3 py-2 text-sm font-mono rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none transition-colors"
            spellCheck={false}
          />
        </div>

        {/* Inline action buttons */}
        <div className="flex items-center gap-1 px-3 pb-1">
          <button
            onClick={clearInput}
            disabled={!input}
            className="px-2 py-1 text-[10px] font-bold rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center gap-1"
          >
            <Trash2 size={10} /> Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1"
          >
            <Copy size={10} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleInsert}
            disabled={!canvasText}
            className="px-3 py-1 text-[10px] font-black rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-all flex items-center gap-1 shadow-sm"
          >
            <Plus size={10} />
            Insert
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 px-3 pb-2 min-h-0">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Preview</label>
          <div
            className="w-full h-full min-h-[48px] px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-sm font-mono text-slate-800 dark:text-slate-200 overflow-auto whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: input ? formatForPreview(input) : '<span class="text-slate-400">Formatted equation will appear here...</span>' }}
          />
        </div>
      </div>

      {/* Preset equations */}
      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-2">
            <RefreshCw size={10} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Presets</span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {PRESET_EQUATIONS.map(eq => (
              <button
                key={eq}
                onClick={() => loadPreset(eq)}
                className="block w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <ArrowRight size={10} className="inline mr-1 text-slate-400" />
                <span dangerouslySetInnerHTML={{ __html: formatForPreview(eq) }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
