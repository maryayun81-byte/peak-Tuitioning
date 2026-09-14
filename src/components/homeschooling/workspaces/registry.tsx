'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// Workspace registry (§55-56). Maps a learning TASK to the right
// interactive workspace. The subject never decides the interface —
// the task does. Teachers can override the recommendation per question.

export interface WorkspaceProps {
  question: {
    id: string
    prompt: string
    interaction_type?: string | null
    workspace_id?: string | null
    expected_skill?: string | null
    working_required?: boolean | null
    config?: any
  }
  initialWorking?: any
  initialAnswer?: any
  readOnly?: boolean
  onWorkingChange?: (working: any, answer: any) => void
}

const BinaryBuilder = dynamic(() => import('./BinaryBuilder'), { ssr: false })
const HexadecimalBuilder = dynamic(() => import('./HexadecimalBuilder'), { ssr: false })
const NumberSystemConverter = dynamic(() => import('./NumberSystemConverter'), { ssr: false })
const WrittenResponse = dynamic(() => import('./WrittenResponse'), { ssr: false })
const TableBuilder = dynamic(() => import('./TableBuilder'), { ssr: false })
const MatchingBoard = dynamic(() => import('./MatchingBoard'), { ssr: false })
const OrderingBoard = dynamic(() => import('./OrderingBoard'), { ssr: false })
const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false })
const Debugger = dynamic(() => import('./Debugger'), { ssr: false })
const FlowchartBuilder = dynamic(() => import('./FlowchartBuilder'), { ssr: false })
const LogicGateBuilder = dynamic(() => import('./LogicGateBuilder'), { ssr: false })

// Task → workspace mapping (§56)
export const TASK_WORKSPACE_MAP: Record<string, string> = {
  BINARY_CONVERSION: 'BINARY_BUILDER',
  HEX_CONVERSION: 'HEX_BUILDER',
  DECIMAL_CONVERSION: 'NUMBER_CONVERTER',
  CODE_WRITING: 'CODE_EDITOR',
  CODE_DEBUGGING: 'DEBUGGER',
  FLOWCHART: 'FLOWCHART_BUILDER',
  LOGIC_GATES: 'LOGIC_GATE_BUILDER',
  TABLE_COMPLETION: 'TABLE_BUILDER',
  MATCHING: 'MATCHING_BOARD',
  ORDERING: 'ORDERING_BOARD',
  WRITTEN_EXPLANATION: 'WRITTEN_RESPONSE',
  SHORT_ANSWER: 'WRITTEN_RESPONSE',
  ESSAY: 'WRITTEN_RESPONSE',
}

export const WORKSPACE_META: Record<string, { label: string; hint: string }> = {
  BINARY_BUILDER: { label: 'Binary builder', hint: 'Toggle each place value, then total.' },
  HEX_BUILDER: { label: 'Hexadecimal builder', hint: 'Work out each power of 16, then total.' },
  NUMBER_CONVERTER: { label: 'Number converter', hint: 'Show each step of the conversion.' },
  CODE_EDITOR: { label: 'Code editor', hint: 'Write code, run the checks, fix what fails.' },
  DEBUGGER: { label: 'Debugger', hint: 'Find the faulty line, explain the cause, write the fix.' },
  FLOWCHART_BUILDER: { label: 'Flowchart', hint: 'Build the flow from Start to End.' },
  LOGIC_GATE_BUILDER: { label: 'Logic gate', hint: 'Pick a gate, set inputs, predict the output.' },
  TABLE_BUILDER: { label: 'Table', hint: 'Fill in each cell.' },
  MATCHING_BOARD: { label: 'Matching', hint: 'Pair each item with its match.' },
  ORDERING_BOARD: { label: 'Ordering', hint: 'Arrange the steps in order.' },
  WRITTEN_RESPONSE: { label: 'Written response', hint: 'Plan, draft, then write your final answer.' },
  GENERIC: { label: 'Answer', hint: 'Show your working, then answer.' },
}

export function resolveWorkspaceId(question: WorkspaceProps['question']): string {
  if (question.workspace_id && WORKSPACE_META[question.workspace_id]) return question.workspace_id
  const task = (question.interaction_type || '').toUpperCase()
  if (WORKSPACE_META[task]) return task
  return TASK_WORKSPACE_MAP[task] || 'GENERIC'
}

export function GenericAnswer({ question, initialWorking, initialAnswer, readOnly, onWorkingChange }: WorkspaceProps) {
  const [answer, setAnswer] = useState<any>(initialAnswer ?? '')
  const [workingText, setWorkingText] = useState<string>(
    typeof initialWorking?.working_text === 'string' ? initialWorking.working_text : ''
  )
  const emit = (a: any, w: string) => onWorkingChange?.({ ...initialWorking, working_text: w }, a)
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Your answer
      </label>
      <input
        type="text"
        value={answer}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => { setAnswer(e.target.value); emit(e.target.value, workingText) }}
        placeholder="Type your answer…"
        className="w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
        style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
      />
      {question.working_required && (
        <textarea
          value={workingText}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => { setWorkingText(e.target.value); emit(answer, e.target.value) }}
          placeholder="Show your working here…"
          rows={3}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--input)', borderColor: 'var(--card-border)', color: 'var(--text)' }}
        />
      )}
    </div>
  )
}

export default function WorkspaceRenderer(props: WorkspaceProps) {
  const id = resolveWorkspaceId(props.question)
  const hint = WORKSPACE_META[id]?.hint
  return (
    <div className="space-y-3">
      {hint && id !== 'GENERIC' && (
        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
      {id === 'BINARY_BUILDER' && <BinaryBuilder {...props} />}
      {id === 'HEX_BUILDER' && <HexadecimalBuilder {...props} />}
      {id === 'NUMBER_CONVERTER' && <NumberSystemConverter {...props} />}
      {id === 'CODE_EDITOR' && <CodeEditor {...props} />}
      {id === 'DEBUGGER' && <Debugger {...props} />}
      {id === 'FLOWCHART_BUILDER' && <FlowchartBuilder {...props} />}
      {id === 'LOGIC_GATE_BUILDER' && <LogicGateBuilder {...props} />}
      {id === 'TABLE_BUILDER' && <TableBuilder {...props} />}
      {id === 'MATCHING_BOARD' && <MatchingBoard {...props} />}
      {id === 'ORDERING_BOARD' && <OrderingBoard {...props} />}
      {id === 'WRITTEN_RESPONSE' && <WrittenResponse {...props} />}
      {id === 'GENERIC' && <GenericAnswer {...props} />}
    </div>
  )
}
