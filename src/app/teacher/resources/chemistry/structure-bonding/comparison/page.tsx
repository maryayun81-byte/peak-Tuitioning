'use client';

import { useState } from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { Trash2, PlusCircle } from 'lucide-react';

interface TableRow {
  id: number;
  structureType: string;
  exampleSubstance: string;
  bonding: string;
  forcesPresent: string;
  meltingPoint: string;
  conductivity: string;
  solubility: string;
  specialNotes: string;
}

const initialRows: TableRow[] = [
  {
    id: 1,
    structureType: 'Giant Ionic',
    exampleSubstance: 'NaCl / MgO',
    bonding: 'Ionic',
    forcesPresent: 'Strong Electrostatic',
    meltingPoint: 'High',
    conductivity: 'Molten/Aqueous only',
    solubility: 'Soluble in water',
    specialNotes: 'MgO higher MP than NaCl due to 2+ charge',
  },
  {
    id: 2,
    structureType: 'Simple Molecular',
    exampleSubstance: 'CO₂ / H₂O / I₂',
    bonding: 'Covalent (small molecules)',
    forcesPresent: 'Weak Intermolecular',
    meltingPoint: 'Low',
    conductivity: 'Does not conduct',
    solubility: 'Variable',
    specialNotes: 'Covalent bonds inside are STRONG',
  },
  {
    id: 3,
    structureType: 'Giant Covalent (Diamond)',
    exampleSubstance: 'Diamond',
    bonding: 'Covalent (4 bonds per C)',
    forcesPresent: 'Strong Covalent (network)',
    meltingPoint: 'Very High',
    conductivity: 'Does not conduct',
    solubility: 'Insoluble',
    specialNotes: 'Hardest natural substance',
  },
  {
    id: 4,
    structureType: 'Giant Covalent (Graphite)',
    exampleSubstance: 'Graphite',
    bonding: 'Covalent (3 bonds per C)',
    forcesPresent: 'Strong Covalent + Weak Van der Waals',
    meltingPoint: 'High',
    conductivity: 'Conducts (delocalized e⁻)',
    solubility: 'Insoluble',
    specialNotes: 'Layers slide easily',
  },
  {
    id: 5,
    structureType: 'Metallic',
    exampleSubstance: 'Cu / Fe / Al',
    bonding: 'Metallic',
    forcesPresent: 'Strong Electrostatic (ions + electrons)',
    meltingPoint: 'High',
    conductivity: 'Conducts (solid & liquid)',
    solubility: 'Insoluble',
    specialNotes: 'More valence electrons = stronger bond',
  },
];

const COLUMNS: { key: keyof TableRow; label: string }[] = [
  { key: 'structureType', label: 'Structure Type' },
  { key: 'exampleSubstance', label: 'Example Substance' },
  { key: 'bonding', label: 'Bonding' },
  { key: 'forcesPresent', label: 'Forces Present' },
  { key: 'meltingPoint', label: 'Melting Point' },
  { key: 'conductivity', label: 'Conductivity' },
  { key: 'solubility', label: 'Solubility' },
  { key: 'specialNotes', label: 'Special Notes' },
];

export default function ComparisonPage() {
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  let nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;

  const handleCellChange = (id: number, key: keyof TableRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: nextId++,
      structureType: '',
      exampleSubstance: '',
      bonding: '',
      forcesPresent: '',
      meltingPoint: '',
      conductivity: '',
      solubility: '',
      specialNotes: '',
    };
    setRows((prev) => [...prev, newRow]);
  };

  const deleteRow = (id: number) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
  };

  return (
    <BuilderLayout
      title="Structure Comparison"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
      isSaving={isSaving}
      onSave={handleSave}
      exportData={{ type: 'STRUCTURE_COMPARISON', rows }}
    >
      <div className="space-y-4">
        {/* Add Row Button */}
        <div className="flex justify-end">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shadow"
          >
            <PlusCircle className="w-4 h-4" />
            Add Row
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-purple-200 dark:border-purple-800 shadow-lg">
          <table className="min-w-full text-sm">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-purple-700 dark:bg-purple-900 text-white">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-left font-semibold whitespace-nowrap border-r border-purple-500 dark:border-purple-700 last:border-r-0"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap w-12">
                  Del
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`transition-colors border-b border-purple-100 dark:border-purple-900 ${
                    idx % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-purple-50 dark:bg-purple-950/30'
                  } hover:bg-purple-100 dark:hover:bg-purple-900/40`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="px-2 py-1 border-r border-purple-100 dark:border-purple-900 last:border-r-0 min-w-[130px]"
                    >
                      <input
                        type="text"
                        value={row[col.key]}
                        onChange={(e) =>
                          handleCellChange(row.id, col.key, e.target.value)
                        }
                        className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-400 rounded px-1 py-0.5 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className={`p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all ${
                        hoveredRow === row.id ? 'opacity-100' : 'opacity-0'
                      }`}
                      aria-label="Delete row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
          {rows.length} structure{rows.length !== 1 ? 's' : ''} • Click any cell to edit
        </p>
      </div>
    </BuilderLayout>
  );
}
