// Renders a top-level CV section as a collapsible card
import { getIconSVG } from '../lib/icons'
import { getFieldType, getOrderedProperties, humanizeKey } from './schema-utils'
import { renderField } from './field-renderer'
import { ArrayList } from './array-list'

// Internal meta fields that should never appear in the properties dropdown
const INTERNAL_META_FIELDS = new Set(['hiddenSections', 'sectionOrder', 'hiddenFields'])

// Get all available property keys for a section
function getSectionPropertyKeys(sectionKey, sectionSchema, rootSchema) {
  if (sectionSchema.type === 'array') {
    const itemSchema = sectionSchema.items || {}
    if (itemSchema.properties) {
      return Object.keys(itemSchema.properties)
    }
    return []
  }

  if (sectionSchema.type === 'object' && sectionSchema.properties) {
    const keys = Object.keys(sectionSchema.properties)
    if (sectionKey === 'meta') {
      return keys.filter(k => !INTERNAL_META_FIELDS.has(k))
    }
    return keys
  }

  return []
}

// Render a section card
export function renderSection(sectionKey, sectionSchema, data, options = {}) {
  const { onChange, onToggleVisibility, onToggleField, isHidden, isPinned, hiddenFields, rootSchema, collapsedSections } = options

  const section = document.createElement('div')
  section.className = 'cv-section'
  section.id = `section-${sectionKey}`
  section.dataset.section = sectionKey

  if (isPinned) {
    section.classList.add('cv-section--pinned')
  }
  if (collapsedSections && collapsedSections.has(sectionKey)) {
    section.classList.add('cv-section--collapsed')
  }
  if (isHidden) {
    section.classList.add('cv-section--hidden')
  }

  // Header
  const header = document.createElement('div')
  header.className = 'cv-section__header'

  // Drag handle for non-pinned sections
  if (!isPinned) {
    const dragHandle = document.createElement('span')
    dragHandle.className = 'cv-section__drag-handle'
    dragHandle.appendChild(getIconSVG('mdi:drag', { dom: true }))
    header.appendChild(dragHandle)
  }

  const chevron = document.createElement('span')
  chevron.className = 'cv-section__chevron'
  chevron.appendChild(getIconSVG('mdi:chevron-down', { dom: true }))
  header.appendChild(chevron)

  const title = document.createElement('h2')
  title.className = 'cv-section__title'
  title.textContent = humanizeKey(sectionKey)
  header.appendChild(title)

  // Item count for arrays
  if (sectionSchema.type === 'array' && Array.isArray(data)) {
    const count = document.createElement('span')
    count.className = 'cv-section__count'
    count.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`
    header.appendChild(count)
  }

  // Actions
  const actions = document.createElement('div')
  actions.className = 'cv-section__actions'

  // Add button for array sections (in header)
  if (sectionSchema.type === 'array') {
    let noun = sectionKey
    if (noun.endsWith('s')) noun = noun.slice(0, -1)

    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'cv-section__add-btn'
    addBtn.title = `Add ${noun}`
    addBtn.textContent = `+ Add`
    addBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (section.classList.contains('cv-section--collapsed')) {
        section.classList.remove('cv-section--collapsed')
      }
      const addBtnBottom = section.querySelector('.cv-array__add-btn')
      if (addBtnBottom) addBtnBottom.click()
    })
    actions.appendChild(addBtn)
  }

  // Properties toggle button
  const propKeys = getSectionPropertyKeys(sectionKey, sectionSchema, rootSchema)
  if (propKeys.length > 0 && onToggleField) {
    const propsBtn = document.createElement('button')
    propsBtn.type = 'button'
    propsBtn.className = 'cv-section__props-btn'
    propsBtn.title = 'Toggle field visibility'
    propsBtn.appendChild(getIconSVG('mdi:format-list-checks', { dom: true }))
    propsBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      // Close any existing dropdown
      const existing = section.querySelector('.cv-section__props-dropdown')
      if (existing) {
        existing.remove()
        return
      }

      // Read live hidden fields state (not the stale closure value)
      const liveHiddenFields = options.getHiddenFields ? options.getHiddenFields(sectionKey) : (hiddenFields || new Set())
      const dropdown = createPropsDropdown(sectionKey, propKeys, liveHiddenFields, onToggleField)
      // Position relative to button
      actions.style.position = 'relative'
      actions.appendChild(dropdown)

      // Close on outside mousedown
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

  if (onToggleVisibility) {
    const visBtn = document.createElement('button')
    visBtn.type = 'button'
    visBtn.className = 'cv-section__visibility-btn'
    updateVisibilityButton(visBtn, isHidden)
    visBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      onToggleVisibility(sectionKey)
    })
    actions.appendChild(visBtn)
  }

  header.appendChild(actions)

  // Collapse/expand
  header.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.cv-section__props-dropdown') || e.target.closest('.cv-array__props-dropdown')) return
    section.classList.toggle('cv-section--collapsed')
    const event = new CustomEvent('section-collapse', {
      detail: { sectionKey, collapsed: section.classList.contains('cv-section--collapsed') }
    })
    section.dispatchEvent(event)
  })

  section.appendChild(header)

  // Body
  const body = document.createElement('div')
  body.className = 'cv-section__body'

  const getHiddenFields = options.getHiddenFields
  if (sectionSchema.type === 'array') {
    renderArraySection(body, sectionKey, sectionSchema, data, onChange, rootSchema, hiddenFields, onToggleField, getHiddenFields)
  } else if (sectionSchema.type === 'object') {
    renderObjectSection(body, sectionKey, sectionSchema, data, onChange, rootSchema, hiddenFields)
  }

  section.appendChild(body)

  return section
}

function createPropsDropdown(sectionKey, propKeys, hiddenFields, onToggleField) {
  const dropdown = document.createElement('div')
  dropdown.className = 'cv-section__props-dropdown'

  for (const key of propKeys) {
    const isFieldHidden = hiddenFields.has(key)

    const row = document.createElement('label')
    row.className = 'cv-section__props-item'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = !isFieldHidden
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation()
    })
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation()
      onToggleField(sectionKey, key)
    })
    row.appendChild(checkbox)

    const label = document.createElement('span')
    label.textContent = humanizeKey(key)
    row.appendChild(label)

    dropdown.appendChild(row)
  }

  return dropdown
}

function renderArraySection(body, sectionKey, sectionSchema, data, onChange, rootSchema, hiddenFields, onToggleField, getHiddenFields) {
  const items = Array.isArray(data) ? data : []
  const itemSchema = sectionSchema.items || {}

  const listContainer = document.createElement('div')
  body.appendChild(listContainer)

  new ArrayList(listContainer, items, itemSchema, {
    sectionKey,
    hiddenFields: hiddenFields || new Set(),
    getHiddenFields,
    onToggleField,
    onChange: (newItems) => {
      onChange && onChange(sectionKey, newItems)
    },
    renderItemFields: (item, index, bodyEl) => {
      if (typeof item !== 'object' || item === null) return

      const properties = getOrderedProperties(itemSchema)
      for (const prop of properties) {
        const fieldType = getFieldType(prop.schema, prop.key, rootSchema)
        const fieldEl = renderField(prop.key, item[prop.key], fieldType, {
          description: prop.schema.description,
          schema: prop.schema,
          rootSchema,
          onChange: (newVal) => {
            item[prop.key] = newVal
            onChange && onChange(sectionKey, items.map(i => structuredClone(i)))
          },
        })
        if (hiddenFields && hiddenFields.has(prop.key)) {
          fieldEl.style.display = 'none'
        }
        bodyEl.appendChild(fieldEl)
      }
    }
  })
}

function renderObjectSection(body, sectionKey, sectionSchema, data, onChange, rootSchema, hiddenFields) {
  const sectionData = data && typeof data === 'object' ? { ...data } : {}

  // Special ordering for basics
  let orderedKeys
  if (sectionKey === 'basics') {
    orderedKeys = ['name', 'label', 'email', 'phone', 'url', 'summary', 'image', 'location', 'profiles']
  }

  const properties = getOrderedProperties(sectionSchema, orderedKeys)

  for (const prop of properties) {
    // Skip internal meta fields entirely (never shown)
    if (sectionKey === 'meta' && INTERNAL_META_FIELDS.has(prop.key)) continue

    const isFieldHidden = hiddenFields && hiddenFields.has(prop.key)
    const fieldType = getFieldType(prop.schema, prop.key, rootSchema)

    if (fieldType === 'array') {
      // Wrap label + list in a container with data-field for toggling
      const fieldWrap = document.createElement('div')
      fieldWrap.dataset.field = prop.key
      if (isFieldHidden) fieldWrap.style.display = 'none'

      const arrayLabel = document.createElement('label')
      arrayLabel.className = 'cv-field__label'
      arrayLabel.textContent = humanizeKey(prop.key)
      arrayLabel.style.marginTop = '12px'
      fieldWrap.appendChild(arrayLabel)

      const listContainer = document.createElement('div')
      listContainer.id = `section-${sectionKey}-${prop.key}`
      fieldWrap.appendChild(listContainer)

      new ArrayList(listContainer, sectionData[prop.key] || [], prop.schema.items || {}, {
        sectionKey: prop.key,
        onChange: (newItems) => {
          sectionData[prop.key] = newItems
          onChange && onChange(sectionKey, { ...sectionData })
        },
        renderItemFields: (item, index, bodyEl) => {
          if (typeof item !== 'object' || item === null) return
          const itemProperties = getOrderedProperties(prop.schema.items || prop.schema)
          for (const itemProp of itemProperties) {
            const ft = getFieldType(itemProp.schema, itemProp.key, rootSchema)
            const fieldEl = renderField(itemProp.key, item[itemProp.key], ft, {
              description: itemProp.schema.description,
              schema: itemProp.schema,
              rootSchema,
              onChange: (newVal) => {
                item[itemProp.key] = newVal
                sectionData[prop.key] = [...(sectionData[prop.key] || [])]
                onChange && onChange(sectionKey, { ...sectionData })
              },
            })
            bodyEl.appendChild(fieldEl)
          }
        }
      })

      body.appendChild(fieldWrap)
    } else {
      const fieldEl = renderField(prop.key, sectionData[prop.key], fieldType, {
        description: prop.schema.description,
        schema: prop.schema,
        rootSchema,
        onChange: (newVal) => {
          sectionData[prop.key] = newVal
          onChange && onChange(sectionKey, { ...sectionData })
        },
      })
      if (isFieldHidden) fieldEl.style.display = 'none'
      body.appendChild(fieldEl)
    }
  }
}

export function updateVisibilityButton(btn, isHidden) {
  btn.innerHTML = ''
  const icon = getIconSVG(isHidden ? 'mdi:eye-off' : 'mdi:eye', { dom: true })
  btn.appendChild(icon)
  const label = document.createElement('span')
  label.textContent = isHidden ? 'show' : 'hide'
  btn.appendChild(label)
  btn.title = isHidden ? 'Show section in CV' : 'Hide section from CV'
}
