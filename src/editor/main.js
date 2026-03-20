import dayjs from 'dayjs'

import * as sampleModule from '../../sample.cv.json'
import * as jsoncvSchemaModule from '../../schema/jsoncv.schema.json'
import {
  getCVData,
  getPrimaryColor,
  getTheme,
  saveCVJSON,
  savePrimaryColor,
  saveTheme,
} from '../lib/store'
import {
  createElement,
  downloadContent,
  downloadIframeHTML,
  propertiesToObject,
} from '../lib/utils'
import { getCVTitle } from '../themes/data'
import { getThemeNames } from '../themes'
import { CVEditor } from './cv-editor'
import { getItemTitle, humanizeKey } from './schema-utils'

// --- Schema ---
const jsoncvSchema = structuredClone(jsoncvSchemaModule.default)

// --- Init data ---
let data = getCVData()
if (!data) {
  data = sampleModule.default
  // Save initial data so the preview iframe can render it
  const initData = structuredClone(data)
  if (!initData.meta) initData.meta = {}
  initData.meta.theme = getTheme()
  saveCVJSON(JSON.stringify(initData, null, 2))
}

// --- Grab output elements BEFORE editor init (onDataChange fires synchronously) ---
const outputJsonEl = document.querySelector('.output-json')
const outputJsonContent = document.querySelector('.output-json__content')
const outputHtmlIframe = document.querySelector('.output-html')

// --- TOC ---
const tocEl = document.querySelector('.editor-toc')
const containerEl = document.querySelector('.editor-container')
let scrollObserver = null

const SECTIONS_ORDER = [
  'basics', 'education', 'work', 'projects', 'sideProjects',
  'skills', 'languages', 'interests', 'references', 'awards',
  'publications', 'volunteer', 'certificates', 'meta'
]

function buildTOC(cvData) {
  tocEl.innerHTML = ''
  const ul = createElement('ul', { parent: tocEl })

  // Use sectionOrder from meta if available, otherwise default
  const order = cvData.meta?.sectionOrder
  let sectionKeys
  if (order && Array.isArray(order) && order.length > 0) {
    const draggable = order.filter(s => s !== 'basics' && s !== 'meta' && SECTIONS_ORDER.includes(s))
    const missing = SECTIONS_ORDER.filter(s => s !== 'basics' && s !== 'meta' && !draggable.includes(s))
    sectionKeys = ['basics', ...draggable, ...missing, 'meta']
  } else {
    sectionKeys = SECTIONS_ORDER
  }

  for (const name of sectionKeys) {
    const sectionSchema = jsoncvSchema.properties[name]
    if (!sectionSchema) continue

    const li = createElement('li', { parent: ul })
    createElement('a', {
      text: humanizeKey(name),
      attrs: { href: `#section-${name}` },
      parent: li,
    })

    const sectionData = cvData[name]

    // Sub-items for object sections with nested arrays/objects
    if (name === 'basics' && sectionData && typeof sectionData === 'object') {
      const subUl = createElement('ul', { parent: li })
      if (sectionData.location) {
        const subLi = createElement('li', { parent: subUl })
        createElement('a', {
          text: 'Location',
          attrs: { href: `#section-basics-location` },
          parent: subLi,
        })
      }
      if (sectionData.profiles && sectionData.profiles.length) {
        const subLi = createElement('li', { parent: subUl })
        createElement('a', {
          text: `Profiles (${sectionData.profiles.length})`,
          attrs: { href: `#section-basics-profiles` },
          parent: subLi,
        })
      }
    }

    // Sub-items for array sections — show item titles
    if (sectionSchema.type === 'array' && Array.isArray(sectionData) && sectionData.length > 0) {
      const subUl = createElement('ul', { parent: li })
      sectionData.forEach((item, idx) => {
        const title = getItemTitle(item, name, idx)
        const subLi = createElement('li', { parent: subUl })
        createElement('a', {
          text: title,
          attrs: { href: `#section-${name}` },
          parent: subLi,
        })
      })
    }
  }

  setupScrollTracking()
}

function setupScrollTracking() {
  if (scrollObserver) scrollObserver.disconnect()

  const middleCol = document.querySelector('.middle')
  const tocLinks = tocEl.querySelectorAll('a')
  const sections = containerEl.querySelectorAll('.cv-section')

  if (!sections.length) return

  scrollObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const id = entry.target.id
        tocLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`)
        })
      }
    }
  }, {
    root: middleCol,
    rootMargin: '-10% 0px -80% 0px',
    threshold: 0,
  })

  sections.forEach(s => scrollObserver.observe(s))
}

// Smooth scroll for TOC links
tocEl.addEventListener('click', (e) => {
  const link = e.target.closest('a')
  if (!link) return
  e.preventDefault()
  const target = document.querySelector(link.getAttribute('href'))
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

// Debounce TOC rebuilds
let tocTimer = null
function scheduleTOCRebuild(cvData) {
  clearTimeout(tocTimer)
  tocTimer = setTimeout(() => buildTOC(cvData), 300)
}

// --- Init editor ---
const cvEditor = new CVEditor(containerEl, jsoncvSchema, data, {
  onDataChange(data) {
    const previewData = structuredClone(data)
    if (!previewData.meta) previewData.meta = {}
    previewData.meta.theme = getTheme()
    const json = JSON.stringify(previewData, null, 2)
    if (outputJsonContent) outputJsonContent.textContent = json
    saveCVJSON(json)
    scheduleTOCRebuild(data)
  }
})

// Initial TOC build
buildTOC(data)

// Populate JSON preview on load (onDataChange doesn't fire during constructor)
{
  const previewData = structuredClone(data)
  if (!previewData.meta) previewData.meta = {}
  previewData.meta.theme = getTheme()
  if (outputJsonContent) outputJsonContent.textContent = JSON.stringify(previewData, null, 2)
}

// --- Sidebar actions ---

// Toggle preview/JSON
document.getElementById('fn-toggle-preview').addEventListener('click', () => {
  const isHtmlHidden = outputHtmlIframe.style.display === 'none'
  if (isHtmlHidden || !outputHtmlIframe.offsetHeight) {
    outputJsonEl.style.display = 'none'
    outputHtmlIframe.style.display = ''
  } else {
    outputHtmlIframe.style.display = 'none'
    outputJsonEl.style.display = ''
  }
})

// Copy JSON
document.getElementById('fn-copy-json').addEventListener('click', (e) => {
  const btn = e.currentTarget
  const json = outputJsonContent?.textContent || ''
  navigator.clipboard.writeText(json).then(() => {
    const orig = btn.textContent
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = orig }, 1500)
  })
})

// New data
document.getElementById('fn-new-data').addEventListener('click', () => {
  if (!window.confirm('Create an empty CV? Current data will be lost.')) return
  const v = propertiesToObject(jsoncvSchema.properties)
  cvEditor.setValue(v)
})

// Open existing file
const uploadInput = document.querySelector('input[name=upload-data]')

document.getElementById('fn-upload-data').addEventListener('click', () => {
  // Reset so selecting the same file triggers change
  uploadInput.value = ''
  uploadInput.click()
})

uploadInput.addEventListener('change', (e) => {
  const files = e.target.files
  if (files.length === 0) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result)
      cvEditor.setValue(parsed)
    } catch (err) {
      console.error('Failed to load file:', err)
      alert('Invalid JSON file: ' + err.message)
    }
  }
  reader.readAsText(files[0])
})

// Download
function downloadCV(contentType) {
  const data = cvEditor.getValue()
  const meta = data.meta || (data.meta = {})
  const title = getCVTitle(data)

  meta.lastModified = dayjs().format('YYYY-MM-DDTHH:mm:ssZ[Z]')
  meta.theme = getTheme()

  if (contentType === 'json') {
    downloadContent(`${title}.json`, JSON.stringify(data, null, 2))
  } else if (contentType === 'html') {
    downloadIframeHTML(`${title}.html`, outputHtmlIframe)
  }
}

document.getElementById('fn-download-json').addEventListener('click', () => downloadCV('json'))
document.getElementById('fn-download-html').addEventListener('click', () => downloadCV('html'))

// Load sample
document.getElementById('fn-load-sample').addEventListener('click', () => {
  if (!window.confirm('Load sample data? Current data will be replaced.')) return
  cvEditor.setValue(sampleModule.default)
})

// Print preview
document.getElementById('fn-print-preview').addEventListener('click', () => {
  outputHtmlIframe.contentWindow.print()
})

// --- Color picker ---
const colorPickerEl = document.getElementById('fn-color-picker')
const colorValueEl = document.querySelector('.color-picker .value')

colorPickerEl.addEventListener('change', (e) => {
  colorValueEl.textContent = e.target.value
  savePrimaryColor(e.target.value)
})

const primaryColor = getPrimaryColor()
colorValueEl.textContent = primaryColor
colorPickerEl.value = primaryColor

// --- Theme selector ---
const themeSelectEl = document.getElementById('fn-theme-select')
const themeNames = getThemeNames()

themeNames.forEach(name => {
  const option = document.createElement('option')
  option.value = name
  option.textContent = name
  themeSelectEl.appendChild(option)
})

themeSelectEl.value = getTheme()
themeSelectEl.addEventListener('change', (e) => saveTheme(e.target.value))
