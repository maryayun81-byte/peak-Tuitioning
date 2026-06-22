'use client';

import { useState } from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { BookOpen, Star, FlaskConical, HelpCircle, CheckSquare, Square } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  icon: React.ReactNode;
}

const CHECKLIST_ITEMS = [
  'I can explain why ionic substances have high melting points',
  'I can explain the difference between covalent bond strength and intermolecular force strength',
  'I can explain why diamond is hard',
  'I can explain why graphite conducts electricity',
  'I can compare conductivity across all 4 structure types',
  'I can predict properties from a given structure type',
];

export default function RecoveryPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));

  const [sections, setSections] = useState<Section[]>([
    {
      id: 'definitions',
      title: 'Key Definitions',
      content:
        'Ionic Bond: Electrostatic attraction between oppositely charged ions.\nCovalent Bond: Shared pair of electrons between non-metal atoms.\nDative Bond: Covalent bond where one atom provides both electrons.\nMetallic Bond: Electrostatic attraction between metal ions and delocalized electrons.',
      colorClass: 'text-cyan-700 dark:text-cyan-300',
      borderClass: 'border-cyan-300 dark:border-cyan-700',
      bgClass: 'bg-cyan-50 dark:bg-cyan-950/40',
      textClass: 'text-cyan-900 dark:text-cyan-100',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'rules',
      title: 'Golden Rules',
      content:
        'Rule 1: Ionic = Metal + Non-metal → Electron Transfer\nRule 2: Covalent = Non-metal + Non-metal → Electron Sharing\nRule 3: Giant structures have HIGH melting points\nRule 4: Simple molecular → LOW melting/boiling points\nRule 5: Only MOBILE ions/electrons allow conductivity',
      colorClass: 'text-purple-700 dark:text-purple-300',
      borderClass: 'border-purple-300 dark:border-purple-700',
      bgClass: 'bg-purple-50 dark:bg-purple-950/40',
      textClass: 'text-purple-900 dark:text-purple-100',
      icon: <Star className="w-5 h-5" />,
    },
    {
      id: 'examples',
      title: 'Common Examples',
      content:
        'Giant Ionic: NaCl, MgO, CaCl₂, KBr\nSimple Molecular: H₂O, CO₂, CH₄, NH₃, I₂, HCl\nGiant Covalent: Diamond, Graphite, Silicon(IV) Oxide\nMetallic: Cu, Fe, Al, Mg, Na',
      colorClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-900 dark:text-emerald-100',
      icon: <FlaskConical className="w-5 h-5" />,
    },
    {
      id: 'quicktest',
      title: 'Quick Test Questions',
      content:
        "1. Why does diamond not conduct electricity?\n2. What type of structure is NaCl?\n3. Why does CO₂ have a low boiling point?\n4. What allows graphite to conduct?\n5. Why is MgO's melting point higher than NaCl?\n6. Compare the structures of diamond and graphite.",
      colorClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-300 dark:border-amber-700',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      textClass: 'text-amber-900 dark:text-amber-100',
      icon: <HelpCircle className="w-5 h-5" />,
    },
  ]);

  const handleContentChange = (id: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content: value } : s))
    );
  };

  const toggleCheck = (idx: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
  };

  const completedCount = checked.filter(Boolean).length;

  return (
    <BuilderLayout
      title="Topic Recovery Pack"
      subtitle="Structure & Bonding Engine"
      backHref="/teacher/resources/chemistry/structure-bonding"
      isSaving={isSaving}
      onSave={handleSave}
    >
      <div className="space-y-8">
        {/* 2×2 Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`rounded-2xl border ${section.borderClass} bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-shadow overflow-hidden`}
            >
              {/* Section header */}
              <div className={`${section.bgClass} px-5 py-3 flex items-center gap-2 border-b ${section.borderClass}`}>
                <span className={section.colorClass}>{section.icon}</span>
                <h3 className={`font-semibold text-sm ${section.colorClass}`}>
                  {section.title}
                </h3>
              </div>

              {/* Editable content */}
              <div className="p-4">
                <textarea
                  value={section.content}
                  onChange={(e) => handleContentChange(section.id, e.target.value)}
                  rows={6}
                  className={`w-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed ${section.textClass} placeholder-gray-400 font-mono`}
                  placeholder="Add content here..."
                />
              </div>
            </div>
          ))}
        </div>

        {/* Study Checklist */}
        <div className="rounded-2xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-900 shadow-md overflow-hidden">
          {/* Checklist header */}
          <div className="bg-teal-50 dark:bg-teal-950/40 px-5 py-4 border-b border-teal-200 dark:border-teal-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-semibold text-teal-700 dark:text-teal-300">
                Study Checklist
              </h3>
            </div>
            <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/50 px-2.5 py-1 rounded-full">
              {completedCount} / {CHECKLIST_ITEMS.length} complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>

          {/* Checklist items */}
          <div className="p-4 space-y-2">
            {CHECKLIST_ITEMS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => toggleCheck(idx)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                  checked[idx]
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {checked[idx] ? (
                    <CheckSquare className="w-4 h-4 text-teal-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    checked[idx]
                      ? 'text-teal-800 dark:text-teal-200 line-through decoration-teal-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item}
                </span>
              </button>
            ))}
          </div>

          {completedCount === CHECKLIST_ITEMS.length && (
            <div className="mx-4 mb-4 p-3 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-center text-sm font-semibold text-teal-700 dark:text-teal-300">
              🎉 All objectives complete! Ready for the exam.
            </div>
          )}
        </div>
      </div>
    </BuilderLayout>
  );
}
