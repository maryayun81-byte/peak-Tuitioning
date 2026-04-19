'use client';

import React, { useEffect, useState, useId } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

// Lazy singleton — prevents version text being injected into the DOM at module load.
// The old pattern of calling mermaid.initialize() at module scope caused Mermaid to
// write its version string directly to the page before any diagram was requested.
let mermaidInitialized = false;
function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    logLevel: 5,
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      primaryColor: '#4F8CFF',
      primaryTextColor: '#fff',
      primaryBorderColor: '#4F8CFF',
      lineColor: '#4F8CFF',
      secondaryColor: '#2D3748',
      tertiaryColor: '#1A202C',
    }
  });
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId().replace(/:/g, '');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) return;

      try {
        // Initialize lazily — only runs once, safely inside the browser
        ensureMermaidInitialized();
        setError(null);

        // Step 1: Strip Markdown code fence artifacts
        let cleanChart = chart
          .replace(/```mermaid/g, '')
          .replace(/```/g, '')
          .trim();

        // Step 2: Force 'flowchart' instead of legacy 'graph'
        if (cleanChart.startsWith('graph')) {
          cleanChart = 'flowchart' + cleanChart.substring(5);
        }

        // Step 3: Clear trailing semicolons from the first line (e.g. 'flowchart TD;')
        const headerLines = cleanChart.split('\n');
        if (headerLines.length > 0) {
          headerLines[0] = headerLines[0].replace(/;$/, '').trim();
          cleanChart = headerLines.join('\n');
        }

        // Step 4: Scrub trailing semicolons from every line (Mermaid 11+ killer)
        cleanChart = cleanChart.split('\n')
          .map(line => line.trim().endsWith(';') ? line.trim().slice(0, -1) : line)
          .join('\n');

        // Step 5: The Syntax Doctor — auto-quote unquoted node labels
        // Fixes patterns like A[Label] -> A["Label"] and A(Label) -> A("Label")
        const chartLines = cleanChart.split('\n');
        const sanitizedLines = chartLines.map(line => {
          let l = line.trim();
          if (!l || l.startsWith('flowchart') || l.startsWith('graph') || l.startsWith('subgraph') || l === 'end') {
            return l;
          }
          // Auto-quote rectangular nodes: A[Label] -> A["Label"]
          l = l.replace(/^([a-zA-Z0-9_-]+)\s*\[\s*([^"\]]+?)\s*\]/g, '$1["$2"]');
          // Auto-quote round nodes: A(Label) -> A("Label")
          l = l.replace(/^([a-zA-Z0-9_-]+)\s*\(\s*([^")]+?)\s*\)/g, '$1("$2")');
          // Fix bare double-dash arrows: A -- B -> A --> B
          l = l.replace(/\s+--\s+/g, ' --> ');
          return l;
        });
        cleanChart = sanitizedLines.join('\n');

        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id || uniqueId}`, cleanChart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError('Failed to render diagram. Please check syntax.');
      }
    };

    renderDiagram();
  }, [chart, id, uniqueId]);

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-xs font-mono">
        ⚠️ {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="p-8 bg-white/5 animate-pulse rounded-xl flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper overflow-x-auto overflow-y-hidden p-4 bg-white/5 border border-white/10 rounded-2xl my-4 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

// Global style to suppress any accidental versions injected by Mermaid 11+
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    #mermaid-version, 
    .mermaid-version,
    [id*="mermaid-version"] { 
      display: none !important; 
    }
  `;
  document.head.appendChild(style);
}

export default MermaidDiagram;
