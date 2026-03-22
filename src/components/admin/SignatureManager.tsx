'use client'

import React, { useRef, useEffect, useState } from 'react'
import SignaturePad from 'signature_pad'
import { Eraser, Type, MousePointer2, Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface SignatureManagerProps {
  value?: string // SVG or DataURL
  type?: 'draw' | 'type'
  font?: string
  onChange: (data: { data: string; type: 'draw' | 'type'; font?: string }) => void
}

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Alex Brush', family: "'Alex Brush', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
]

export function SignatureManager({ value, type = 'draw', font, onChange }: SignatureManagerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>(type)
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState(font || SIGNATURE_FONTS[0].family)

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  // Initialize Signature Pad
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      
      // Handle HiDPI displays
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)

      const pad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 0)',
      })

      signaturePadRef.current = pad

      // If existing value is a data URL and we're in draw mode, try to load it
      if (value && value.startsWith('data:image')) {
        pad.fromDataURL(value)
      }

      pad.addEventListener('endStroke', () => {
        const data = pad.toDataURL('image/png')
        onChange({ data, type: 'draw' })
      })

      return () => {
        pad.off()
      }
    }
  }, [activeTab])

  const clearPad = () => {
    signaturePadRef.current?.clear()
    onChange({ data: '', type: 'draw' })
  }

  const handleTypeChange = (name: string) => {
    setTypedName(name)
    // For "Type", we'll send the name and the font so it can be rendered as SVG or text in PDF
    onChange({ data: name, type: 'type', font: selectedFont })
  }

  const handleFontSelect = (f: string) => {
    setSelectedFont(f)
    onChange({ data: typedName, type: 'type', font: f })
  }

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex p-1 rounded-xl bg-muted/50 w-fit">
        <button
          onClick={() => setActiveTab('draw')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'draw' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'
          }`}
        >
          <MousePointer2 size={16} /> Draw
        </button>
        <button
          onClick={() => setActiveTab('type')}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'type' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'
          }`}
        >
          <Type size={16} /> Type
        </button>
      </div>

      <Card className="relative overflow-hidden border-2 border-[var(--card-border)] bg-gray-50/50">
        {activeTab === 'draw' ? (
          <div className="p-4">
            <div className="relative bg-white rounded-xl border border-black/5 shadow-inner" style={{ height: '200px' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button size="icon" variant="secondary" onClick={clearPad} title="Clear">
                  <RotateCcw size={14} />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center mt-2 opacity-50 uppercase tracking-widest font-bold">Use Mouse or Touch to Sign</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <Input
              placeholder="Type your full name..."
              value={typedName}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="text-lg text-center font-medium bg-white"
            />
            
            <div className="grid grid-cols-2 gap-3">
              {SIGNATURE_FONTS.map((f) => (
                <button
                  key={f.family}
                  onClick={() => handleFontSelect(f.family)}
                  className={`p-4 rounded-xl border-2 transition-all text-center relative ${
                    selectedFont === f.family ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-[var(--card-border)] bg-white hover:border-primary/30'
                  }`}
                >
                  <div 
                    style={{ fontFamily: f.family, fontSize: '24px' }}
                    className="truncate"
                  >
                    {typedName || 'Signature'}
                  </div>
                  <div className="text-[9px] mt-2 opacity-40 uppercase font-black">{f.name}</div>
                  {selectedFont === f.family && (
                    <div className="absolute top-1 right-1 bg-primary text-white p-0.5 rounded-full">
                      <Check size={8} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {/* Preview Section */}
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
        <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Live Result Preview</div>
        <div className="bg-white h-20 rounded-xl border border-black/5 flex items-center justify-center overflow-hidden">
          {activeTab === 'draw' ? (
             value ? <img src={value} alt="Drawn Signature" className="max-h-full max-w-full object-contain" /> : <span className="text-xs opacity-20 italic">No signature drawn</span>
          ) : (
             <div style={{ fontFamily: selectedFont, fontSize: '32px' }} className="text-black">
               {typedName || <span className="opacity-10 italic">Your Name</span>}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
