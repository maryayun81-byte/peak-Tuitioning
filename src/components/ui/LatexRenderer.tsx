'use client'

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

// Import mhchem for chemistry support (requires the browser environment)
if (typeof window !== 'undefined') {
  try {
    require('katex/dist/contrib/mhchem.min.js')
  } catch (e) {
    console.warn('LaTeX: Failed to load mhchem extension', e)
  }
}

interface LatexRendererProps {
  content: string
  className?: string
  style?: React.CSSProperties
  block?: boolean
}

/**
 * LatexRenderer
 * Automatically parses text for $$...$$ and renders them as LaTeX.
 * Supports chemical equations via mhchem (\ce{...}).
 */
export function LatexRenderer({ content, className, style, block = false }: LatexRendererProps) {
  if (!content) return null

  // Split by $$...$$
  const parts = content.split(/(\$\$[\s\S]*?\$\$)/g)

  return (
    <div className={className} style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim()
          if (!formula) return null
          
          return block ? (
            <BlockMath key={index} math={formula} />
          ) : (
            <InlineMath key={index} math={formula} />
          )
        }
        
        // Return plain text segments
        return <span key={index}>{part}</span>
      })}
    </div>
  )
}
