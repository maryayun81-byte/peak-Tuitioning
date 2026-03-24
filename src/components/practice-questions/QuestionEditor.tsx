'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Mathematics from '@tiptap/extension-mathematics'
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, Heading1, Heading2, Code
} from 'lucide-react'
import 'katex/dist/katex.min.css'

interface QuestionEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function QuestionEditor({ value, onChange, placeholder = 'Write your question here...' }: QuestionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Mathematics,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value ? JSON.parse(value) : '',
    onUpdate: ({ editor }) => {
      // Export as JSON String to save safely to DB
      onChange(JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      attributes: {
        className: 'min-h-[200px] w-full bg-white dark:bg-[#1A1A1A] text-[var(--text)] border border-[var(--card-border)] rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary prose prose-sm sm:prose-base dark:prose-invert max-w-none',
      },
    },
  })

  // Watch for external value changes (like when loading an existing question)
  useEffect(() => {
    if (editor && value) {
      try {
         const parsed = JSON.parse(value)
         const currentContent = editor.getJSON()
         // Basic array stringify comparison to prevent cursor jumping
         if (JSON.stringify(parsed) !== JSON.stringify(currentContent)) {
            editor.commands.setContent(parsed, false)
         }
      } catch (e) {
         // Silently ignore invalid JSON during initial render or if plain text passed
      }
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-2 bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-sm mb-2 backdrop-blur-md">
        
        <ToolbarButton 
           isActive={editor.isActive('bold')} 
           onClick={() => editor.chain().focus().toggleBold().run()}
        ><Bold size={16} /></ToolbarButton>
        <ToolbarButton 
           isActive={editor.isActive('italic')} 
           onClick={() => editor.chain().focus().toggleItalic().run()}
        ><Italic size={16} /></ToolbarButton>
        <ToolbarButton 
           isActive={editor.isActive('underline')} 
           onClick={() => editor.chain().focus().toggleUnderline().run()}
        ><UnderlineIcon size={16} /></ToolbarButton>

        <div className="w-px h-5 mx-1 bg-[var(--card-border)]" />

        <ToolbarButton 
           isActive={editor.isActive('heading', { level: 1 })} 
           onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        ><Heading1 size={16} /></ToolbarButton>
        <ToolbarButton 
           isActive={editor.isActive('heading', { level: 2 })} 
           onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        ><Heading2 size={16} /></ToolbarButton>

        <div className="w-px h-5 mx-1 bg-[var(--card-border)]" />

        <ToolbarButton 
           isActive={editor.isActive('bulletList')} 
           onClick={() => editor.chain().focus().toggleBulletList().run()}
        ><List size={16} /></ToolbarButton>
        <ToolbarButton 
           isActive={editor.isActive('orderedList')} 
           onClick={() => editor.chain().focus().toggleOrderedList().run()}
        ><ListOrdered size={16} /></ToolbarButton>
        
        <div className="w-px h-5 mx-1 bg-[var(--card-border)]" />
        
        <ToolbarButton 
           isActive={false} 
           onClick={() => {
              // Insert a placeholder for a math formula, Tiptap uses $ for inline and $$ for block by default via extension-mathematics
              editor.chain().focus().insertContent('$$  $$').run()
           }}
           title="Insert Math Block ($$ formula $$)"
        >
           <span className="font-serif font-black italic">f(x)</span>
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      
      {/* Help text for Math */}
      <div className="text-[10px] text-muted flex gap-4 px-2">
         <span><strong>Inline Math:</strong> Wrap with <code>$</code> e.g. <code>{'$E=mc^2$'}</code></span>
         <span><strong>Block Math:</strong> Wrap with <code>$$</code> e.g. <code>{'$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$'}</code></span>
      </div>
    </div>
  )
}

function ToolbarButton({ children, isActive = false, onClick, title }: any) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
        ${isActive ? 'bg-primary text-white' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--input)] hover:text-[var(--text)]'}
      `}
    >
      {children}
    </button>
  )
}
