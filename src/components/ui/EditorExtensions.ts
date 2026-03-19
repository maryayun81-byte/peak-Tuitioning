import OrderedList from '@tiptap/extension-ordered-list'
import { Passage } from './PassageContent'

/**
 * Custom OrderedList extension that supports a 'type' attribute
 * and automatically assigns 'type="a"' to nested lists.
 */
export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: '1',
        parseHTML: element => element.getAttribute('type'),
        renderHTML: attributes => {
          return {
            type: attributes.type,
          }
        },
      },
    }
  },

  addStorage() {
    return {
      ...this.parent?.(),
    }
  },

  onUpdate() {
    const { state, view } = this.editor
    const { tr } = state
    let changed = false

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'orderedList') {
        const resolvedPos = state.doc.resolve(pos)
        let isInsideListItem = false
        for (let d = resolvedPos.depth; d > 0; d--) {
          if (resolvedPos.node(d).type.name === 'listItem') {
            isInsideListItem = true
            break
          }
        }

        const targetType = isInsideListItem ? 'a' : '1'
        if (node.attrs.type !== targetType) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, type: targetType })
          changed = true
        }
      }
    })

    if (changed) {
      view.dispatch(tr)
    }
  },
})

export { Passage }
