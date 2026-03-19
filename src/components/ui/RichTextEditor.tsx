'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { CustomOrderedList, Passage } from './EditorExtensions'
import { Mathematics } from '@tiptap/extension-mathematics'
import 'katex/dist/katex.min.css'
import { 
  Bold, Italic, Table as TableIcon, List, ListOrdered, 
  Quote, Undo, Redo, Link as LinkIcon, Underline as UnderlineIcon,
  Code, Heading1, Heading2, CheckSquare,
  BookOpen, Type, ChevronRight, Calculator
} from 'lucide-react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: false, // Disable default to use custom
      }),
      CustomOrderedList,
      Underline,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Passage.configure({
        HTMLAttributes: {
          class: 'worksheet-content-node',
        },
      }),
      Mathematics,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[200px] p-4 text-[var(--text)]',
      },
    },
  })

  if (!editor) return null

  const MenuButton = ({ onClick, isActive, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 px-3 rounded-lg flex items-center gap-2 transition-colors ${isActive ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--input)]'}`}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-xl border border-[var(--card-border)] overflow-hidden bg-[var(--card)]">
      <div className="flex flex-wrap gap-1 p-2 bg-[var(--input)] border-b border-[var(--card-border)]">
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><Bold size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><Italic size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon size={16} /></MenuButton>
        
        <div className="w-px h-6 bg-[var(--card-border)] mx-1 self-center" />
        
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={16} /></MenuButton>
        
        <div className="w-px h-6 bg-[var(--card-border)] mx-1 self-center" />
        
        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List"><List size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List"><ListOrdered size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} title="Task List"><CheckSquare size={16} /></MenuButton>
        
        <div className="w-px h-6 bg-[var(--card-border)] mx-1 self-center" />
        
        <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote"><Quote size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code"><Code size={16} /></MenuButton>
        
        <div className="w-px h-6 bg-[var(--card-border)] mx-1 self-center" />
        
        <MenuButton 
          onClick={() => editor.chain().focus().togglePassage({ type: 'passage' }).run()} 
          isActive={editor.isActive('passage', { type: 'passage' })} 
          title="Add Passage"
        >
          <BookOpen size={16} />
          <span className="text-[10px] font-bold">Passage</span>
        </MenuButton>

        <MenuButton 
          onClick={() => editor.chain().focus().togglePassage({ type: 'poem' }).run()} 
          isActive={editor.isActive('passage', { type: 'poem' })} 
          title="Add Poem"
        >
          <Type size={16} />
          <span className="text-[10px] font-bold">Poem</span>
        </MenuButton>

        <MenuButton 
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()} 
          title="Add Sub-Question (Indent)"
        >
          <ChevronRight size={16} />
          <span className="text-[10px] font-bold">Sub-Q</span>
        </MenuButton>

        <MenuButton 
          onClick={() => editor.chain().focus().insertContent('$').run()} 
          title="Add Math (Use $ delimeters)"
        >
          <Calculator size={16} />
          <span className="text-[10px] font-bold">Math</span>
        </MenuButton>

        <div className="w-px h-6 bg-[var(--card-border)] mx-1 self-center" />
        
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={16} /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={16} /></MenuButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
