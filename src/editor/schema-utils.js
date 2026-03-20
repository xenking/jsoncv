// Schema introspection utilities — pure functions, no DOM

// Keys whose values should render as textarea
const textareaKeyPaths = new Set([
  'summary',
  'description',
  'reference',
])

// Keys inside arrays whose items should use textarea
const textareaArrayItemPaths = new Set([
  'highlights',
])

export function isTextareaKey(key) {
  return textareaKeyPaths.has(key)
}

export function isTextareaArrayItems(key) {
  return textareaArrayItemPaths.has(key)
}

// Resolve a $ref like "#/definitions/iso8601" within the schema
export function resolveRef(rootSchema, ref) {
  if (!ref || !ref.startsWith('#/')) return null
  const parts = ref.substring(2).split('/')
  let obj = rootSchema
  for (const part of parts) {
    obj = obj[part]
    if (!obj) return null
  }
  return obj
}

// Determine the field type for rendering
export function getFieldType(propSchema, key, rootSchema) {
  if (!propSchema) return 'text'

  // Resolve $ref
  let schema = propSchema
  if (schema.$ref) {
    const resolved = resolveRef(rootSchema, schema.$ref)
    if (resolved) schema = { ...resolved, ...schema, $ref: undefined }
  }

  // Array of objects
  if (schema.type === 'array' && schema.items) {
    if (schema.items.type === 'object' || schema.items.properties) return 'array'
    return 'string-array'
  }

  // Nested object
  if (schema.type === 'object' && schema.properties) return 'object'

  // Textarea
  if (isTextareaKey(key)) return 'textarea'

  // Format-based
  if (schema.format === 'email') return 'email'
  if (schema.format === 'uri') return 'url'

  // Date detection (iso8601 pattern)
  if (schema.pattern && schema.pattern.includes('[0-9]{3}')) return 'date'

  // Boolean
  if (schema.type === 'boolean') return 'boolean'

  // Enum (select dropdown)
  if (schema.enum) return 'enum'

  return 'text'
}

// Get ordered properties from an object schema
export function getOrderedProperties(schemaObj, orderedKeys) {
  if (!schemaObj || !schemaObj.properties) return []

  const required = new Set(schemaObj.required || [])
  const keys = orderedKeys || Object.keys(schemaObj.properties)

  return keys
    .filter(key => schemaObj.properties[key])
    .map(key => ({
      key,
      schema: schemaObj.properties[key],
      required: required.has(key),
    }))
}

// Build a default empty value from a schema
export function getDefaultItem(itemSchema) {
  if (!itemSchema) return ''
  if (itemSchema.type === 'object' || itemSchema.properties) {
    return getDefaultObject(itemSchema)
  }
  if (itemSchema.type === 'array') return []
  if (itemSchema.type === 'number' || itemSchema.type === 'integer') return 0
  if (itemSchema.type === 'boolean') return false
  return ''
}

export function getDefaultObject(schemaObj) {
  if (!schemaObj || !schemaObj.properties) return {}
  const obj = {}
  for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
    if (propSchema.type === 'array') obj[key] = []
    else if (propSchema.type === 'object') obj[key] = getDefaultObject(propSchema)
    else if (propSchema.type === 'number' || propSchema.type === 'integer') obj[key] = 0
    else if (propSchema.type === 'boolean') obj[key] = false
    else obj[key] = ''
  }
  return obj
}

// Humanize a camelCase key: startDate → Start Date
export function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

// Get a display title for an array item based on its data
export function getItemTitle(item, sectionKey, index) {
  if (typeof item === 'string') return item || `Item ${index + 1}`

  // Try common name fields in priority order
  const nameFields = ['name', 'institution', 'organization', 'title', 'language', 'network']
  for (const field of nameFields) {
    if (item[field]) return item[field]
  }

  // Fallback: section singular + index
  let noun = sectionKey
  if (noun.endsWith('s')) noun = noun.slice(0, -1)
  return `${noun} ${index + 1}`
}

// Get a subtitle for an array item (position, dates, etc.)
export function getItemSubtitle(item) {
  if (typeof item !== 'object' || !item) return ''
  const parts = []
  if (item.position) parts.push(item.position)
  if (item.area) parts.push(item.area)
  if (item.studyType) parts.push(item.studyType)
  if (item.startDate || item.endDate) {
    const start = item.startDate || '?'
    const end = item.endDate || 'present'
    parts.push(`${start} → ${end}`)
  }
  return parts.join(' · ')
}
