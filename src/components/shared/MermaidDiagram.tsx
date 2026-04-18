'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

// Global initialization
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
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
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId().replace(/:/g, ''); // Mermaid doesn't like colons in IDs

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) return;
      
      try {
        setError(null);
        // Step 1: Strip Markdown artifacts
        let cleanChart = chart
          .replace(/```mermaid/g, '')
          .replace(/```/g, '')
          .trim();

        // Step 2: Advanced Syntax Normalization
        // 1. Force 'flowchart' instead of 'graph' (more support for modern features)
        if (cleanChart.startsWith('graph')) {
          cleanChart = 'flowchart' + cleanChart.substring(5);
        }
        
        // 2. Clear out common header artifacts like 'flowchart TD;' 
        const lines = cleanChart.split('\n');
        if (lines.length > 0) {
          lines[0] = lines[0].replace(/;$/, '').trim();
          cleanChart = lines.join('\n');
        }

        // 3. Scrub trailing semicolons from every line (Mermaid 11+ killer)
        cleanChart = cleanChart.split('\n')
          .map(line => line.trim().endsWith(';') ? line.trim().slice(0, -1) : line)
          .join('\n');

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

export default MermaidDiagram;
