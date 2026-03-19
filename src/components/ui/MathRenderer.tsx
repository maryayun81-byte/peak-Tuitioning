'use client'

import { useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathProps {
  formula: string
  block?: boolean
}

export default function MathRenderer({ formula, block = false }: MathProps) {
  useEffect(() => {
    // Basic dynamic import/check just in case, but here we use it directly
  }, [])

  try {
    const html = katex.renderToString(formula, {
      throwOnError: false,
      displayMode: block,
    })

    return <span dangerouslySetInnerHTML={{ __html: html }} />
  } catch (e) {
    return <span>{formula}</span>
  }
}
