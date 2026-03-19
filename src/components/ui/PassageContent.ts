import { Node, mergeAttributes } from '@tiptap/core'

export interface PassageOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    passage: {
      setPassage: (attributes?: { type: 'passage' | 'poem' }) => ReturnType,
      togglePassage: (attributes?: { type: 'passage' | 'poem' }) => ReturnType,
    }
  }
}

export const Passage = Node.create<PassageOptions>({
  name: 'passage',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'text*',
  preserveWhitespace: 'full',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'passage',
        parseHTML: element => element.getAttribute('data-type') || 'passage',
        renderHTML: attributes => ({
          'data-type': attributes.type,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="passage"]',
      },
      {
        tag: 'pre[data-type="poem"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const isPoem = node.attrs.type === 'poem'
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `passage-node ${isPoem ? 'is-poem' : 'is-passage'}`,
        style: `white-space: pre-wrap; font-family: ${isPoem ? 'Georgia, serif' : 'inherit'}; margin: 1.5em 0; padding: 1.25em; background: rgba(139, 92, 246, 0.05); border-radius: 12px; border-left: 4px solid #8B5CF6; position: relative;`,
      }),
      0,
    ]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.insertContent('\n'),
      'Shift-Enter': () => this.editor.commands.insertContent('\n'),
    }
  },

  addCommands() {
    return {
      setPassage: attributes => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
      togglePassage: attributes => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph', attributes)
      },
    }
  },
})
