// Renders individual field inputs — returns DOM elements
import Sortable from 'sortablejs'
import { getIconSVG } from '../lib/icons'
import { humanizeKey, getFieldType, getOrderedProperties, isTextareaArrayItems } from './schema-utils'

// Debounce helper
function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// Auto-resize a textarea to fit its content
function autoResize(textarea) {
  textarea.style.height = 'auto'
  const h = textarea.scrollHeight
  if (h > 0) {
    textarea.style.height = h + 'px'
  }
}

// Schedule auto-resize after element is in the DOM and laid out
function scheduleAutoResize(textarea) {
  // Double-RAF ensures the element is rendered and has dimensions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      autoResize(textarea)
    })
  })
}

// Render a single field and return its DOM element
export function renderField(key, value, fieldType, options = {}) {
  const { description, onChange, rootSchema } = options

  switch (fieldType) {
    case 'textarea':
      return renderTextarea(key, value, { description, onChange })
    case 'string-array':
      return renderStringArray(key, value, { description, onChange, isTextarea: isTextareaArrayItems(key) })
    case 'object':
      return renderNestedObject(key, value, options)
    default:
      return renderTextInput(key, value, { description, onChange, type: fieldType })
  }
}

function renderTextInput(key, value, { description, onChange, type }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'cv-field'
  wrapper.dataset.field = key

  const label = document.createElement('label')
  label.className = 'cv-field__label'
  label.textContent = humanizeKey(key)
  wrapper.appendChild(label)

  const input = document.createElement('input')
  input.className = 'cv-field__input'
  input.type = 'text'
  input.value = value || ''
  if (type === 'date') input.placeholder = 'YYYY-MM-DD'
  else if (type === 'email') input.placeholder = 'email@example.com'
  else if (type === 'url') input.placeholder = 'https://...'
  wrapper.appendChild(input)

  if (description) {
    const desc = document.createElement('span')
    desc.className = 'cv-field__desc'
    desc.textContent = description
    wrapper.appendChild(desc)
  }

  const debouncedChange = debounce((val) => onChange && onChange(val), 150)
  input.addEventListener('input', () => debouncedChange(input.value))

  return wrapper
}

function renderTextarea(key, value, { description, onChange }) {
  const wrapper = document.createElement('div')
  wrapper.className = 'cv-field cv-field--textarea'
  wrapper.dataset.field = key

  const label = document.createElement('label')
  label.className = 'cv-field__label'
  label.textContent = humanizeKey(key)
  wrapper.appendChild(label)

  const textarea = document.createElement('textarea')
  textarea.className = 'cv-field__input'
  textarea.value = value || ''
  textarea.rows = 3
  wrapper.appendChild(textarea)

  if (description) {
    const desc = document.createElement('span')
    desc.className = 'cv-field__desc'
    desc.textContent = description
    wrapper.appendChild(desc)
  }

  // Auto-resize after appending to DOM
  scheduleAutoResize(textarea)

  const debouncedChange = debounce((val) => onChange && onChange(val), 150)
  textarea.addEventListener('input', () => {
    autoResize(textarea)
    debouncedChange(textarea.value)
  })

  return wrapper
}

function renderStringArray(key, value, { description, onChange, isTextarea }) {
  const items = Array.isArray(value) ? [...value] : []

  const wrapper = document.createElement('div')
  wrapper.className = 'cv-field cv-field--tags'
  wrapper.dataset.field = key

  let noun = humanizeKey(key)
  // Singularize simple plural nouns
  if (noun.endsWith('s') && noun.length > 2) noun = noun.slice(0, -1)
  const nounLower = noun.toLowerCase()

  // Label row with "+ Add" button inline
  const labelRow = document.createElement('div')
  labelRow.className = 'cv-field__label-row'

  const label = document.createElement('label')
  label.className = 'cv-field__label'
  label.textContent = humanizeKey(key)
  labelRow.appendChild(label)

  const addBtnHeader = document.createElement('button')
  addBtnHeader.type = 'button'
  addBtnHeader.className = 'cv-tag-list__add-inline'
  addBtnHeader.textContent = '+'
  addBtnHeader.title = `Add ${nounLower}`
  addBtnHeader.addEventListener('click', (e) => {
    e.preventDefault()
    items.push('')
    renderItems()
    emitChange()
    const lastInput = list.querySelector('.cv-tag-item:last-of-type .cv-tag-item__input')
    if (lastInput) lastInput.focus()
  })
  labelRow.appendChild(addBtnHeader)

  wrapper.appendChild(labelRow)

  const list = document.createElement('div')
  list.className = 'cv-tag-list'
  wrapper.appendChild(list)

  let sortableInstance = null

  function collectValues() {
    const inputs = list.querySelectorAll('.cv-tag-item__input')
    return Array.from(inputs).map(inp => inp.value)
  }

  function emitChange() {
    onChange && onChange(collectValues())
  }

  const debouncedEmit = debounce(emitChange, 150)

  function renderItems() {
    // Preserve focus info
    const activeEl = document.activeElement
    const activeIdx = activeEl?.closest?.('.cv-tag-item')?.dataset?.index

    list.innerHTML = ''

    if (sortableInstance) {
      sortableInstance.destroy()
      sortableInstance = null
    }

    if (items.length === 0) {
      // Show prominent add button when empty
      const emptyBtn = document.createElement('button')
      emptyBtn.type = 'button'
      emptyBtn.className = 'cv-tag-list__add-empty'
      emptyBtn.textContent = `+ Add ${nounLower}`
      emptyBtn.addEventListener('click', (e) => {
        e.preventDefault()
        items.push('')
        renderItems()
        emitChange()
        const lastInput = list.querySelector('.cv-tag-item:last-of-type .cv-tag-item__input')
        if (lastInput) lastInput.focus()
      })
      list.appendChild(emptyBtn)
      return
    }

    items.forEach((item, i) => {
      const row = document.createElement('div')
      row.className = 'cv-tag-item'
      row.dataset.index = i

      const handle = document.createElement('span')
      handle.className = 'cv-tag-item__handle'
      handle.innerHTML = '&#x283F;'
      handle.title = 'Drag to reorder'
      row.appendChild(handle)

      let input
      if (isTextarea) {
        input = document.createElement('textarea')
        input.rows = 1
        scheduleAutoResize(input)
        input.addEventListener('input', () => autoResize(input))
      } else {
        input = document.createElement('input')
        input.type = 'text'
      }
      input.className = 'cv-tag-item__input'
      input.value = item || ''
      input.addEventListener('input', () => {
        items[i] = input.value
        debouncedEmit()
      })
      row.appendChild(input)

      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'cv-tag-item__delete'
      deleteBtn.title = 'Remove'
      deleteBtn.textContent = '\u00d7'
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault()
        items.splice(i, 1)
        renderItems()
        emitChange()
      })
      row.appendChild(deleteBtn)

      list.appendChild(row)
    })

    // Add button at bottom
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'cv-tag-list__add-bottom'
    addBtn.textContent = `+ Add ${nounLower}`
    addBtn.addEventListener('click', (e) => {
      e.preventDefault()
      items.push('')
      renderItems()
      emitChange()
      const allInputs = list.querySelectorAll('.cv-tag-item__input')
      const lastInput = allInputs[allInputs.length - 1]
      if (lastInput) lastInput.focus()
    })
    list.appendChild(addBtn)

    // Init SortableJS
    if (items.length > 1) {
      sortableInstance = Sortable.create(list, {
        handle: '.cv-tag-item__handle',
        draggable: '.cv-tag-item',
        filter: '.cv-tag-list__add-bottom',
        preventOnFilter: false,
        animation: 150,
        ghostClass: 'cv-tag-item--ghost',
        onEnd(evt) {
          const oldIdx = evt.oldDraggableIndex
          const newIdx = evt.newDraggableIndex
          if (oldIdx === newIdx) return
          const [moved] = items.splice(oldIdx, 1)
          items.splice(newIdx, 0, moved)
          renderItems()
          emitChange()
        }
      })
    }

    // Restore focus if it was on an input
    if (activeIdx !== undefined) {
      const target = list.querySelector(`.cv-tag-item[data-index="${activeIdx}"] .cv-tag-item__input`)
      if (target) target.focus()
    }
  }

  renderItems()

  if (description) {
    const desc = document.createElement('span')
    desc.className = 'cv-field__desc'
    desc.textContent = description
    wrapper.appendChild(desc)
  }

  return wrapper
}

function renderNestedObject(key, value, options) {
  const { schema, onChange, rootSchema } = options
  const data = value && typeof value === 'object' ? { ...value } : {}

  const wrapper = document.createElement('div')
  wrapper.className = 'cv-field cv-field--object'
  wrapper.dataset.field = key

  const labelEl = document.createElement('label')
  labelEl.className = 'cv-field__label cv-field__label--collapsible'

  const chevron = document.createElement('span')
  chevron.className = 'cv-field__chevron'
  chevron.textContent = '\u25BC'
  labelEl.appendChild(chevron)

  const labelText = document.createElement('span')
  labelText.textContent = humanizeKey(key)
  labelEl.appendChild(labelText)

  wrapper.appendChild(labelEl)

  const nested = document.createElement('div')
  nested.className = 'cv-field__nested'
  wrapper.appendChild(nested)

  // Collapse/expand
  labelEl.addEventListener('click', () => {
    wrapper.classList.toggle('cv-field--collapsed')
  })

  // Render child fields
  const properties = getOrderedProperties(schema)
  for (const prop of properties) {
    const fieldType = getFieldType(prop.schema, prop.key, rootSchema)
    const fieldEl = renderField(prop.key, data[prop.key], fieldType, {
      description: prop.schema.description,
      onChange: (newVal) => {
        data[prop.key] = newVal
        onChange && onChange({ ...data })
      },
      schema: prop.schema,
      rootSchema,
    })
    nested.appendChild(fieldEl)
  }

  return wrapper
}
