'use client'

import { useState, useRef, useCallback } from 'react'
import { Type, Copy, Plus, Trash2, RefreshCw, ArrowRight, Palette, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', 'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ',
  'i': 'ᵢ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ',
  'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ',
  'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
}

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', 'a': 'ᵃ', 'b': 'ᵇ',
  'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ',
  'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
  's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
  'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
}

const ARROW_MAP: Record<string, string> = {
  '->': '→', '-->': '⟶', '<->': '↔', '<-->': '⟷', '<=>': '⇌', '=>': '⇒',
}
const ARROW_ORDER = ['-->', '<-->', '->', '<->', '<=>', '=>']

function toUnicodeSub(text: string): string { return text.split('').map(c => SUB[c] || c).join('') }
function toUnicodeSup(text: string): string { return text.split('').map(c => SUP[c] || c).join('') }

function formatChemistryText(input: string): string {
  let result = ''; let i = 0
  while (i < input.length) {
    if (input[i] === '~') {
      const end = input.indexOf('~', i + 1)
      if (end !== -1) { result += toUnicodeSub(input.slice(i + 1, end)); i = end + 1 }
      else { result += input[i]; i++ }
    } else if (input[i] === '^') {
      const end = input.indexOf('^', i + 1)
      if (end !== -1) { result += toUnicodeSup(input.slice(i + 1, end)); i = end + 1 }
      else { result += input[i]; i++ }
    } else {
      let matched = false
      for (const arrow of ARROW_ORDER) {
        if (input.slice(i, i + arrow.length) === arrow) { result += ARROW_MAP[arrow]; i += arrow.length; matched = true; break }
      }
      if (!matched) { result += input[i]; i++ }
    }
  }
  return result
}

const QUICK_INSERTS = [
  { label: 'H₂O', insert: 'H~2~O' },
  { label: 'CO₂', insert: 'CO~2~' },
  { label: 'NH₃', insert: 'NH~3~' },
  { label: 'CH₄', insert: 'CH~4~' },
  { label: 'H₂SO₄', insert: 'H~2~SO~4~' },
  { label: 'NaOH', insert: 'NaOH' },
  { label: 'HCl', insert: 'HCl' },
  { label: 'Na⁺', insert: 'Na^+^' },
  { label: 'Cl⁻', insert: 'Cl^-^' },
  { label: 'OH⁻', insert: 'OH^-^' },
  { label: 'H⁺', insert: 'H^+^' },
  { label: 'SO₄²⁻', insert: 'SO~4~^2-^' },
  { label: 'Fe³⁺', insert: 'Fe^3+^' },
  { label: 'Cu²⁺', insert: 'Cu^2+^' },
  { label: '→', insert: ' -> ' },
  { label: '⇌', insert: ' <=> ' },
  { label: '(aq)', insert: '(aq)' },
  { label: '(s)', insert: '(s)' },
  { label: '(l)', insert: '(l)' },
  { label: '(g)', insert: '(g)' },
  { label: 'e⁻', insert: 'e^-^' },
  { label: 'δ+', insert: 'δ^+^' },
  { label: 'Δ', insert: 'Δ' },
  { label: '°C', insert: '°C' },
  { label: 'kJ/mol', insert: 'kJ/mol' },
  { label: '↑', insert: ' ↑ ' },
  { label: '↓', insert: ' ↓ ' },
]

const PRESET_EQUATIONS = [
  '2H~2~ + O~2~ --> 2H~2~O',
  'N~2~ + 3H~2~ <=> 2NH~3~',
  'H^+^ + OH^-^ --> H~2~O',
  'Na^+^ + Cl^-^ --> NaCl',
  'CaCO~3~(s) --> CaO(s) + CO~2~(g)',
  '2Mg(s) + O~2~(g) --> 2MgO(s)',
  'Zn(s) + CuSO~4~(aq) --> ZnSO~4~(aq) + Cu(s)',
  '2Cl^-^ --> Cl~2~ + 2e^-^',
]

const TEXT_STYLES = [
  { id: 'title', label: 'Title', fontSize: 28, color: '#1e293b' },
  { id: 'label', label: 'Label', fontSize: 16, color: '#334155' },
  { id: 'explanation', label: 'Explanation', fontSize: 14, color: '#475569' },
  { id: 'examiner-note', label: 'Examiner Note', fontSize: 14, color: '#5b21b6' },
  { id: 'observation', label: 'Observation', fontSize: 14, color: '#1e3a5f' },
  { id: 'inference', label: 'Inference', fontSize: 14, color: '#064e3b' },
]

interface ChemistryTypeToolProps {
  excalidrawRef: React.MutableRefObject<any>
  onNotify?: (msg: string) => void
  isCanvasReady: boolean
}

export default function ChemistryTypeTool({ excalidrawRef, onNotify, isCanvasReady }: ChemistryTypeToolProps) {
  const [input, setInput] = useState('')
  const [activeStyle, setActiveStyle] = useState('label')
  const [customColor, setCustomColor] = useState('#334155')
  const [customSize, setCustomSize] = useState(16)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const formattedText = formatChemistryText(input)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formattedText).then(() => {
      onNotify?.('Text copied!')
    })
  }, [formattedText, onNotify])

  const handleInsertAsText = useCallback(() => {
    if (!formattedText) return
    const attempt = (retries: number) => {
      const api = excalidrawRef.current
      if (api?.setActiveTool) {
        navigator.clipboard.writeText(formattedText).then(() => {
          try {
            api.setActiveTool({ type: 'text' })
            api.setAppState?.({ currentItemStrokeColor: customColor })
            onNotify?.('Text tool activated! Click on canvas and paste (Ctrl+V).')
          } catch {
            onNotify?.('Text copied! Use the Text tool to paste onto canvas.')
          }
        })
      } else if (retries > 0) {
        setTimeout(() => attempt(retries - 1), 150)
      }
    }
    attempt(10)
  }, [formattedText, excalidrawRef, onNotify, customColor])

  const handleInsertAsStyled = useCallback(() => {
    const api = excalidrawRef.current
    if (!formattedText) return
    if (!api || !isCanvasReady) { onNotify?.('Canvas not ready yet'); return }
    try {
      const style = TEXT_STYLES.find(s => s.id === activeStyle)
      const fontSize = style?.fontSize || customSize
      const color = style?.color || customColor
      const sceneElements = api.getSceneElements() || []
      const state = api.getAppState()
      const cx = (state?.offsetLeft || 0) + (state?.width || 1200) / 2 - 100
      const cy = (state?.offsetTop || 0) + (state?.height || 800) / 2 - 20

      const newText = {
        id: `txt-${Date.now()}`,
        type: 'text',
        x: cx, y: cy,
        width: 200, height: fontSize + 8,
        strokeColor: color,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        roundness: null,
        seed: Math.floor(Math.random() * 1_000_000) + 1,
        version: 1,
        versionNonce: Math.floor(Math.random() * 1_000_000) + 1,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: formattedText,
        fontSize,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        baseline: fontSize - 2,
      }

      api.updateScene({
        elements: [...sceneElements, newText],
        appState: api.getAppState(),
      })
      onNotify?.('Text placed on canvas!')
    } catch (e) {
      onNotify?.('Failed to insert text. Try Copy + Paste instead.')
    }
  }, [formattedText, activeStyle, customSize, customColor, excalidrawRef, onNotify, isCanvasReady])

  const insertAtCursor = (text: string) => {
    const textarea = inputRef.current
    if (!textarea) { setInput(prev => prev + text); return }
    const start = textarea.selectionStart; const end = textarea.selectionEnd
    setInput(input.slice(0, start) + text + input.slice(end))
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length
      textarea.focus()
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Style selector */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Text Style</p>
        <div className="grid grid-cols-3 gap-1">
          {TEXT_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => { setActiveStyle(style.id); setCustomSize(style.fontSize); setCustomColor(style.color) }}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                activeStyle === style.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={customColor}
            onChange={e => { setCustomColor(e.target.value); setActiveStyle('') }}
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          />
          <select
            value={customSize}
            onChange={e => { setCustomSize(Number(e.target.value)); setActiveStyle('') }}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400"
          >
            {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48].map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick inserts */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap gap-1">
          {QUICK_INSERTS.map(qi => (
            <button
              key={qi.label}
              onClick={() => insertAtCursor(qi.insert)}
              className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 text-slate-600 dark:text-slate-400 hover:text-indigo-700 transition-all"
              title={qi.insert}
            >
              {qi.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pt-2 pb-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type chemistry text... Use ~sub~ and ^sup^"
            className="w-full h-20 px-3 py-2 text-sm font-mono rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-1 px-3 pb-1">
          <button onClick={() => { setInput(''); inputRef.current?.focus() }} disabled={!input}
            className="px-2 py-1 text-[10px] font-bold rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center gap-1"
          ><Trash2 size={10} /> Clear</button>
          <div className="flex-1" />
          <button onClick={handleCopy}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1"
          ><Copy size={10} /> Copy</button>
          <button onClick={handleInsertAsText}
            disabled={!formattedText}
            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 disabled:opacity-30 transition-all flex items-center gap-1"
          ><Type size={10} /> Text</button>
          <button onClick={handleInsertAsStyled}
            disabled={!formattedText}
            className="px-3 py-1 text-[10px] font-black rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-all flex items-center gap-1 shadow-sm"
          ><Plus size={10} /> Insert</button>
        </div>

        {/* Preview */}
        <div className="flex-1 px-3 pb-2 min-h-0">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Preview</label>
          <div
            className="w-full h-full min-h-[40px] px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-sm font-mono text-slate-800 dark:text-slate-200 overflow-auto whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: input || '<span class="text-slate-400">Formatted chemistry text will appear here...</span>' }}
          />
        </div>
      </div>

      {/* Presets */}
      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 mb-2">
            <RefreshCw size={10} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preset Equations</span>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {PRESET_EQUATIONS.map(eq => (
              <button
                key={eq}
                onClick={() => { setInput(eq); inputRef.current?.focus() }}
                className="block w-full text-left px-2 py-1 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 transition-all border border-transparent hover:border-indigo-200"
              >
                <ArrowRight size={10} className="inline mr-1 text-slate-400" />
                {formatChemistryText(eq)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
