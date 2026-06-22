"use client";

import React, { useState } from 'react';
import { BuilderLayout } from '@/components/teacher/resources/BuilderLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertTriangle, Save } from 'lucide-react';

interface Trap {
  id: string;
  title: string;
  description: string;
}

const initialTraps: Trap[] = [
  {
    id: '1',
    title: 'Missing Negative Sign',
    description: 'Forgetting the negative sign for exothermic reactions (∆H < 0).'
  },
  {
    id: '2',
    title: 'Mass vs Volume',
    description: 'Using volume instead of mass incorrectly (assuming density = 1 g/cm³ without stating it or for non-aqueous solutions).'
  },
  {
    id: '3',
    title: 'Unit Conversion Error',
    description: 'Forgetting to convert Joules (J) to kilojoules (kJ) when calculating ∆H in kJ mol⁻¹.'
  },
  {
    id: '4',
    title: 'Formation vs Combustion',
    description: 'Confusing standard enthalpy of combustion with standard enthalpy of formation.'
  },
  {
    id: '5',
    title: 'Hess Cycle Arrows',
    description: 'Reversing Hess cycle arrows without changing the signs of the enthalpy values.'
  },
  {
    id: '6',
    title: 'Bond Energy Signs',
    description: 'Forgetting that bond breaking absorbs energy (endothermic, +) and bond making releases energy (exothermic, -).'
  }
];

export default function ExaminerTrapsPage() {
  const [traps, setTraps] = useState<Trap[]>(initialTraps);

  const addTrap = () => {
    setTraps([
      ...traps,
      {
        id: Date.now().toString(),
        title: 'New Trap',
        description: 'Description of the common error...'
      }
    ]);
  };

  const updateTrap = (id: string, field: keyof Trap, value: string) => {
    setTraps(traps.map(trap => trap.id === id ? { ...trap, [field]: value } : trap));
  };

  const deleteTrap = (id: string) => {
    setTraps(traps.filter(trap => trap.id !== id));
  };

  return (
    <BuilderLayout
      title="Examiner Traps Pack"
      subtitle="Enthalpy Changes Engine"
      backHref="/teacher/resources/chemistry/enthalpy"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Identify and compile common student misconceptions and errors.
          </p>
          <Button onClick={addTrap} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
            <Plus className="w-4 h-4 mr-2" />
            Add Trap
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {traps.map((trap) => (
            <Card key={trap.id} className="border-red-100 shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <Input
                    value={trap.title}
                    onChange={(e) => updateTrap(trap.id, 'title', e.target.value)}
                    className="font-semibold text-lg border-none bg-transparent px-2 h-auto focus-visible:ring-1 focus-visible:ring-red-200"
                    placeholder="Trap Title"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTrap(trap.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-opacity shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={trap.description}
                  onChange={(e) => updateTrap(trap.id, 'description', e.target.value)}
                  className="min-h-[100px] border-none bg-red-50/50 resize-none focus-visible:ring-1 focus-visible:ring-red-200"
                  placeholder="Describe the common error..."
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Traps Pack
          </Button>
        </div>
      </div>
    </BuilderLayout>
  );
}
