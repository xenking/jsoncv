// Central CV Editor class — manages data, renders sections, handles data flow
import Sortable from 'sortablejs'
import { renderSection, updateVisibilityButton } from './section-renderer'

const SECTIONS_ORDER = [
  'basics', 'education', 'work', 'projects', 'sideProjects',
  'skills', 'languages', 'interests', 'references', 'awards',
  'publications', 'volunteer', 'certificates', 'meta'
]

const PINNED_SECTIONS = new Set(['basics', 'meta'])

const COLLAPSE_STORAGE_KEY = 'editor-collapsed-sections'

export class CVEditor {
  constructor(containerEl, schema, initialData, options = {}) {
    this._container = containerEl
    this._schema = structuredClone(schema)
    this._data = structuredClone(initialData || {})
    this._onDataChange = options.onDataChange
    this._sectionElements = new Map()
    this._collapsedSections = this._loadCollapsedSections()
    this._saveTimer = null
    this._sortable = null

    this.render()
  }

  getValue() {
    return structuredClone(this._data)
  }

  setValue(newData) {
    this._data = structuredClone(newData || {})
    this.render()
    this._emitChange()
  }

  _getSectionOrder() {
    const custom = this._data.meta?.sectionOrder
    if (custom && Array.isArray(custom) && custom.length > 0) {
      const draggable = custom.filter(s => !PINNED_SECTIONS.has(s) && SECTIONS_ORDER.includes(s))
      const missing = SECTIONS_ORDER.filter(s => !PINNED_SECTIONS.has(s) && !draggable.includes(s))
      return ['basics', ...draggable, ...missing, 'meta']
    }
    return SECTIONS_ORDER
  }

  _getHiddenFields(sectionKey) {
    const hf = this._data.meta?.hiddenFields
    if (!hf || !hf[sectionKey]) return new Set()
    return new Set(hf[sectionKey])
  }

  render() {
    this._container.innerHTML = ''
    this._sectionElements.clear()
    if (this._sortable) {
      this._sortable.destroy()
      this._sortable = null
    }

    const order = this._getSectionOrder()

    for (const sectionKey of order) {
      const sectionSchema = this._schema.properties[sectionKey]
      if (!sectionSchema) continue

      const sectionData = this._data[sectionKey]
      const isHidden = this._isSectionHidden(sectionKey)
      const isPinned = PINNED_SECTIONS.has(sectionKey)
      const hiddenFields = this._getHiddenFields(sectionKey)

      const sectionEl = renderSection(sectionKey, sectionSchema, sectionData, {
        onChange: (key, newData) => this._onSectionChange(key, newData),
        onToggleVisibility: (key) => this._toggleVisibility(key),
        onToggleField: (secKey, fieldKey) => this._toggleField(secKey, fieldKey),
        getHiddenFields: (secKey) => this._getHiddenFields(secKey),
        isHidden,
        isPinned,
        hiddenFields,
        rootSchema: this._schema,
        collapsedSections: this._collapsedSections,
      })

      sectionEl.addEventListener('section-collapse', (e) => {
        const { sectionKey: key, collapsed } = e.detail
        if (collapsed) {
          this._collapsedSections.add(key)
        } else {
          this._collapsedSections.delete(key)
        }
        this._saveCollapsedSections()
      })

      this._container.appendChild(sectionEl)
      this._sectionElements.set(sectionKey, sectionEl)
    }

    this._initSortable()
  }

  _initSortable() {
    this._sortable = Sortable.create(this._container, {
      handle: '.cv-section__drag-handle',
      draggable: '.cv-section:not(.cv-section--pinned)',
      animation: 200,
      ghostClass: 'cv-section--ghost',
      chosenClass: 'cv-section--chosen',
      dragClass: 'cv-section--drag',
      onEnd: () => {
        const sections = this._container.querySelectorAll('.cv-section')
        const newOrder = []
        sections.forEach(el => {
          const key = el.dataset.section
          if (key && !PINNED_SECTIONS.has(key)) {
            newOrder.push(key)
          }
        })

        if (!this._data.meta) this._data.meta = {}
        this._data.meta.sectionOrder = newOrder
        this._emitChange()
      }
    })
  }

  _onSectionChange(sectionKey, newSectionData) {
    this._data[sectionKey] = newSectionData
    this._scheduleSave()

    const sectionEl = this._sectionElements.get(sectionKey)
    if (sectionEl && Array.isArray(newSectionData)) {
      const count = sectionEl.querySelector('.cv-section__count')
      if (count) {
        count.textContent = `${newSectionData.length} item${newSectionData.length !== 1 ? 's' : ''}`
      }
    }
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => {
      this._emitChange()
    }, 100)
  }

  _emitChange() {
    this._onDataChange && this._onDataChange(this.getValue())
  }

  _isSectionHidden(sectionName) {
    const hidden = this._data.meta?.hiddenSections || []
    return hidden.includes(sectionName)
  }

  _toggleVisibility(sectionKey) {
    if (!this._data.meta) this._data.meta = {}
    if (!this._data.meta.hiddenSections) this._data.meta.hiddenSections = []

    const idx = this._data.meta.hiddenSections.indexOf(sectionKey)
    if (idx === -1) {
      this._data.meta.hiddenSections.push(sectionKey)
    } else {
      this._data.meta.hiddenSections.splice(idx, 1)
    }

    const sectionEl = this._sectionElements.get(sectionKey)
    if (sectionEl) {
      const isNowHidden = this._isSectionHidden(sectionKey)
      sectionEl.classList.toggle('cv-section--hidden', isNowHidden)
      const visBtn = sectionEl.querySelector('.cv-section__visibility-btn')
      if (visBtn) updateVisibilityButton(visBtn, isNowHidden)
    }

    this._emitChange()
  }

  _toggleField(sectionKey, fieldKey) {
    if (!this._data.meta) this._data.meta = {}
    if (!this._data.meta.hiddenFields) this._data.meta.hiddenFields = {}
    if (!this._data.meta.hiddenFields[sectionKey]) this._data.meta.hiddenFields[sectionKey] = []

    const arr = this._data.meta.hiddenFields[sectionKey]
    const idx = arr.indexOf(fieldKey)
    const nowHidden = idx === -1
    if (nowHidden) {
      arr.push(fieldKey)
    } else {
      arr.splice(idx, 1)
    }

    // Clean up empty arrays
    if (arr.length === 0) {
      delete this._data.meta.hiddenFields[sectionKey]
    }
    if (this._data.meta.hiddenFields && Object.keys(this._data.meta.hiddenFields).length === 0) {
      delete this._data.meta.hiddenFields
    }

    // Toggle field visibility in the DOM without re-rendering (keeps dropdown open)
    const sectionEl = this._sectionElements.get(sectionKey)
    if (sectionEl) {
      const fieldEls = sectionEl.querySelectorAll(`[data-field="${fieldKey}"]`)
      fieldEls.forEach(el => {
        el.style.display = nowHidden ? 'none' : ''
      })
    }

    this._emitChange()
  }

  _rerenderSection(sectionKey) {
    const oldEl = this._sectionElements.get(sectionKey)
    if (!oldEl) return

    const sectionSchema = this._schema.properties[sectionKey]
    if (!sectionSchema) return

    const sectionData = this._data[sectionKey]
    const isHidden = this._isSectionHidden(sectionKey)
    const isPinned = PINNED_SECTIONS.has(sectionKey)
    const hiddenFields = this._getHiddenFields(sectionKey)

    const newEl = renderSection(sectionKey, sectionSchema, sectionData, {
      onChange: (key, newData) => this._onSectionChange(key, newData),
      onToggleVisibility: (key) => this._toggleVisibility(key),
      onToggleField: (secKey, fieldKey) => this._toggleField(secKey, fieldKey),
      getHiddenFields: (secKey) => this._getHiddenFields(secKey),
      isHidden,
      isPinned,
      hiddenFields,
      rootSchema: this._schema,
      collapsedSections: this._collapsedSections,
    })

    newEl.addEventListener('section-collapse', (e) => {
      const { sectionKey: key, collapsed } = e.detail
      if (collapsed) {
        this._collapsedSections.add(key)
      } else {
        this._collapsedSections.delete(key)
      }
      this._saveCollapsedSections()
    })

    oldEl.replaceWith(newEl)
    this._sectionElements.set(sectionKey, newEl)
  }

  _loadCollapsedSections() {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }

  _saveCollapsedSections() {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify([...this._collapsedSections]))
    } catch { /* ignore */ }
  }
}
