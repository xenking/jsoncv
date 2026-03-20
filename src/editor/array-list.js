// SortableJS-powered array list with drag-and-drop, delete/duplicate
import Sortable from 'sortablejs'
import { getIconSVG } from '../lib/icons'
import { getDefaultItem, getItemTitle, getItemSubtitle, humanizeKey } from './schema-utils'

export class ArrayList {
  constructor(containerEl, items, itemSchema, options = {}) {
    this._container = containerEl
    this._items = Array.isArray(items) ? items.map(i => structuredClone(i)) : []
    this._itemSchema = itemSchema
    this._onChange = options.onChange
    this._sectionKey = options.sectionKey || 'item'
    this._renderItemFields = options.renderItemFields // (item, index, bodyEl) => void
    this._hiddenFields = options.hiddenFields || new Set()
    this._getHiddenFields = options.getHiddenFields // () => Set
    this._onToggleField = options.onToggleField // (sectionKey, fieldKey) => void
    this._sortable = null
    this._collapsedItems = new Set()

    this.render()
  }

  getValue() {
    return this._items.map(i => structuredClone(i))
  }

  setValue(items) {
    this._items = Array.isArray(items) ? items.map(i => structuredClone(i)) : []
    this.render()
  }

  render() {
    this._container.innerHTML = ''

    const arrayEl = document.createElement('div')
    arrayEl.className = 'cv-array'

    const itemsEl = document.createElement('div')
    itemsEl.className = 'cv-array__items'
    arrayEl.appendChild(itemsEl)

    let noun = this._sectionKey
    if (noun.endsWith('s')) noun = noun.slice(0, -1)

    if (this._items.length === 0) {
      // Show prominent add button when empty
      const emptyBtn = document.createElement('button')
      emptyBtn.type = 'button'
      emptyBtn.className = 'cv-array__add-btn cv-array__add-btn--empty'
      emptyBtn.textContent = `+ Add ${noun}`
      emptyBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.addItem(0)
      })
      arrayEl.appendChild(emptyBtn)
    } else {
      // Render each item
      this._items.forEach((item, i) => {
        itemsEl.appendChild(this._createItemCard(item, i))
      })

      // Add button at bottom
      const addBtn = document.createElement('button')
      addBtn.type = 'button'
      addBtn.className = 'cv-array__add-btn'
      addBtn.textContent = `+ Add ${noun}`
      addBtn.addEventListener('click', (e) => {
        e.preventDefault()
        this.addItem(this._items.length)
      })
      arrayEl.appendChild(addBtn)
    }

    this._container.appendChild(arrayEl)

    // Init SortableJS
    if (this._sortable) {
      this._sortable.destroy()
      this._sortable = null
    }

    if (this._items.length > 1) {
      this._sortable = Sortable.create(itemsEl, {
        handle: '.cv-array__drag-handle',
        draggable: '.cv-array__item',
        animation: 200,
        ghostClass: 'cv-array__item--ghost',
        dragClass: 'cv-array__item--drag',
        onEnd: (evt) => {
          const oldIdx = evt.oldDraggableIndex
          const newIdx = evt.newDraggableIndex
          if (oldIdx === undefined || newIdx === undefined || oldIdx === newIdx) return

          const [moved] = this._items.splice(oldIdx, 1)
          this._items.splice(newIdx, 0, moved)
          this._emitChange()
          this.render()
        }
      })
    }
  }

  addItem(index) {
    const newItem = getDefaultItem(this._itemSchema)
    this._items.splice(index, 0, newItem)
    this._emitChange()
    this.render()
  }

  deleteItem(index) {
    this._items.splice(index, 1)
    this._emitChange()
    this.render()
  }

  duplicateItem(index) {
    const clone = structuredClone(this._items[index])
    this._items.splice(index + 1, 0, clone)
    this._emitChange()
    this.render()
  }

  destroy() {
    if (this._sortable) {
      this._sortable.destroy()
      this._sortable = null
    }
  }

  _emitChange() {
    this._onChange && this._onChange(this.getValue())
  }

  _getItemPropKeys() {
    if (this._itemSchema && this._itemSchema.properties) {
      return Object.keys(this._itemSchema.properties)
    }
    return []
  }

  _createItemCard(item, index) {
    const card = document.createElement('div')
    card.className = 'cv-array__item'
    card.dataset.index = index
    if (this._collapsedItems.has(index)) {
      card.classList.add('cv-array__item--collapsed')
    }

    // Header
    const header = document.createElement('div')
    header.className = 'cv-array__item-header'

    // Drag handle
    const handle = document.createElement('span')
    handle.className = 'cv-array__drag-handle'
    handle.appendChild(getIconSVG('mdi:drag-horizontal-variant', { dom: true }))
    header.appendChild(handle)

    // Title + subtitle
    const titleWrap = document.createElement('div')
    titleWrap.className = 'cv-array__item-title-wrap'

    const title = document.createElement('span')
    title.className = 'cv-array__item-title'
    title.textContent = getItemTitle(item, this._sectionKey, index)
    titleWrap.appendChild(title)

    const subtitle = getItemSubtitle(item)
    if (subtitle) {
      const sub = document.createElement('span')
      sub.className = 'cv-array__item-subtitle'
      sub.textContent = subtitle
      titleWrap.appendChild(sub)
    }
    header.appendChild(titleWrap)

    // Actions
    const actions = document.createElement('div')
    actions.className = 'cv-array__item-actions'

    // Properties toggle button
    const propKeys = this._getItemPropKeys()
    if (propKeys.length > 0 && this._onToggleField) {
      const propsBtn = document.createElement('button')
      propsBtn.type = 'button'
      propsBtn.className = 'cv-array__btn--props'
      propsBtn.title = 'Toggle field visibility'
      propsBtn.appendChild(getIconSVG('mdi:format-list-checks', { dom: true }))
      propsBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()

        const existing = card.querySelector('.cv-array__props-dropdown')
        if (existing) {
          existing.remove()
          return
        }

        const dropdown = this._createPropsDropdown(propKeys, card)
        // Position dropdown relative to the actions area
        actions.style.position = 'relative'
        actions.appendChild(dropdown)

        const close = (evt) => {
          if (!dropdown.contains(evt.target) && !propsBtn.contains(evt.target)) {
            dropdown.remove()
            document.removeEventListener('mousedown', close, true)
          }
        }
        setTimeout(() => document.addEventListener('mousedown', close, true), 0)
      })
      actions.appendChild(propsBtn)
    }

    const dupBtn = document.createElement('button')
    dupBtn.type = 'button'
    dupBtn.className = 'cv-array__btn--duplicate'
    dupBtn.title = 'Duplicate'
    dupBtn.appendChild(getIconSVG('mdi:content-copy', { dom: true }))
    dupBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.duplicateItem(index)
    })
    actions.appendChild(dupBtn)

    const delBtn = document.createElement('button')
    delBtn.type = 'button'
    delBtn.className = 'cv-array__btn--delete'
    delBtn.title = 'Delete'
    delBtn.appendChild(getIconSVG('mdi:delete-outline', { dom: true }))
    delBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.deleteItem(index)
    })
    actions.appendChild(delBtn)

    header.appendChild(actions)
    card.appendChild(header)

    // Collapse/expand on header click (but not on buttons)
    header.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.cv-array__drag-handle') || e.target.closest('.cv-array__props-dropdown')) return
      card.classList.toggle('cv-array__item--collapsed')
      if (card.classList.contains('cv-array__item--collapsed')) {
        this._collapsedItems.add(index)
      } else {
        this._collapsedItems.delete(index)
      }
    })

    // Body
    const body = document.createElement('div')
    body.className = 'cv-array__item-body'

    if (this._renderItemFields) {
      this._renderItemFields(item, index, body)
    }

    card.appendChild(body)

    return card
  }

  _createPropsDropdown(propKeys, card) {
    const dropdown = document.createElement('div')
    dropdown.className = 'cv-array__props-dropdown'

    for (const key of propKeys) {
      const liveFields = this._getHiddenFields ? this._getHiddenFields(this._sectionKey) : this._hiddenFields
      const isFieldHidden = liveFields.has(key)

      const row = document.createElement('label')
      row.className = 'cv-array__props-item'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = !isFieldHidden
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation()
      })
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation()
        // Toggle in data
        if (this._onToggleField) {
          this._onToggleField(this._sectionKey, key)
        }
        // Update this checkbox to reflect new state
        const nowHidden = !checkbox.checked
        // Also update all other open dropdowns' checkboxes for the same field
        const section = card.closest('.cv-section')
        if (section) {
          section.querySelectorAll(`.cv-array__props-dropdown input[type="checkbox"]`).forEach(cb => {
            if (cb !== checkbox && cb.closest('.cv-array__props-item')?.querySelector('span')?.textContent === humanizeKey(key)) {
              cb.checked = checkbox.checked
            }
          })
        }
      })
      row.appendChild(checkbox)

      const label = document.createElement('span')
      label.textContent = humanizeKey(key)
      row.appendChild(label)

      dropdown.appendChild(row)
    }

    return dropdown
  }
}
