import React from 'react'
import { Plus, Trash2, Copy, GripVertical, FileText } from 'lucide-react'

export interface RepeaterItem {
  id: string
  _title: string // used strictly for sidebar display
}

interface RepeaterFieldLayoutProps<T extends RepeaterItem> {
  items: T[]
  activeId: string | null
  onActiveChange: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  children: React.ReactNode // the form for the active item
  itemLabel?: string // e.g., "Reaction", "Observation"
}

export function RepeaterFieldLayout<T extends RepeaterItem>({
  items,
  activeId,
  onActiveChange,
  onAdd,
  onDelete,
  onDuplicate,
  children,
  itemLabel = "Item"
}: RepeaterFieldLayoutProps<T>) {
  return (
    <div className="flex w-full h-full">
      {/* Sidebar Navigation */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
            <FileText size={16} className="text-primary" /> 
            {items.length} {itemLabel}{items.length === 1 ? '' : 's'}
          </h2>
          <button 
            onClick={onAdd}
            className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
            title={`Add ${itemLabel}`}
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.map((item, index) => {
            const isActive = item.id === activeId
            return (
              <div 
                key={item.id}
                onClick={() => onActiveChange(item.id)}
                className={`
                  group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 shadow-sm' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                `}
              >
                <div className="text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600 shrink-0">
                  <GripVertical size={16} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {item._title || `Untitled ${itemLabel}`}
                  </p>
                  <p className="text-xs text-slate-400">{itemLabel} {index + 1}</p>
                </div>

                <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDuplicate(item.id) }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          
          {items.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p>No {itemLabel.toLowerCase()}s yet.</p>
              <button onClick={onAdd} className="text-primary font-bold mt-2 hover:underline">Add one now</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
