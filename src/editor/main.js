import 'iconify-icon'; // import only

import $ from 'cash-dom';
import dayjs from 'dayjs';
import objectPath from 'object-path';

import { JSONEditor } from '@json-editor/json-editor/dist/jsoneditor';

import * as sampleModule from '../../sample.cv.json';
import * as jsoncvSchemaModule from '../../schema/jsoncv.schema.json';
import {
  getCVData,
  getPrimaryColor,
  getTheme,
  saveCVJSON,
  savePrimaryColor,
  saveTheme,
} from '../lib/store';
import {
  createElement,
  downloadContent,
  downloadIframeHTML,
  propertiesToObject,
  traverseDownObject,
} from '../lib/utils';
import { getCVTitle } from '../themes/data';
import { getThemeNames } from '../themes';
import { getIconSVG } from '../lib/icons';
import { registerIconLib } from './je-iconlib';
import { registerTheme } from './je-theme';

const propertiesInOrder = ['basics', 'education', 'work', 'projects', 'sideProjects', 'skills', 'languages', 'interests', 'references', 'awards', 'publications', 'volunteer', 'certificates', 'meta']
const basicsPropertiesInOrder = ['name', 'label', 'email', 'phone', 'url', 'summary', 'image', 'location', 'profiles']

// toc elements
const elToc = document.querySelector('.editor-toc')
const tocUl = createElement('ul', {
  parent: elToc
})
const basicsUl = createElement('ul', {
  parent: tocUl
})


// copy the object to remove the readonly restriction on module
const jsoncvSchema = {...jsoncvSchemaModule.default}

// add propertyOrder to schema, and add links to toc
propertiesInOrder.forEach((name, index) => {
  jsoncvSchema.properties[name].propertyOrder = index

  const li = createElement('li', {parent: tocUl})
  createElement('a', {
    text: name,
    attrs: {
      href: `#root.${name}`
    },
    parent: li,
  })

  if (name === 'basics') {
    li.appendChild(basicsUl)
  }
})
basicsPropertiesInOrder.forEach((name, index) => {
  jsoncvSchema.properties.basics.properties[name].propertyOrder = index
  // only add location and profiles to basics toc
  if (!['location', 'profiles'].includes(name)) return
  const li = createElement('li', {parent: basicsUl})
  createElement('a', {
    text: name,
    attrs: {
      href: `#root.basics.${name}`
    },
    parent: li,
  })
})

// add headerTemplate for each type:array in schema
traverseDownObject(jsoncvSchema, (key, obj) => {
  let noun = key
  if (noun.endsWith('s')) noun = noun.slice(0, -1)
  if (obj.type === 'array' && obj.items) {
    obj.items.headerTemplate = `${noun} {{i1}}`
  }
})

// add format to schema
const keyFormatMap = {
  'basics.properties.summary': 'textarea',
  'work.items.properties.description': 'textarea',
  'work.items.properties.summary': 'textarea',
  'work.items.properties.highlights.items': 'textarea',
  'projects.items.properties.description': 'textarea',
  'projects.items.properties.highlights.items': 'textarea',
  'sideProjects.items.properties.description': 'textarea',
  'skills.items.properties.summary': 'textarea',
  'languages.items.properties.summary': 'textarea',
  'references.items.properties.reference': 'textarea',
  'awards.items.properties.summary': 'textarea',
  'publications.items.properties.summary': 'textarea',
  'volunteer.items.properties.summary': 'textarea',
  'volunteer.items.properties.highlights.items': 'textarea',
}
for (const [key, format] of Object.entries(keyFormatMap)) {
  objectPath.get(jsoncvSchema.properties, key).format = format
}

// Override date format to use text input instead of HTML date input
// This allows partial dates (YYYY, YYYY-MM, YYYY-MM-DD) as supported by the schema pattern
jsoncvSchema.definitions.iso8601.format = 'text'

// change schema title
jsoncvSchema.title = 'CV Schema'

// change some descriptions
jsoncvSchema.properties.meta.properties.lastModified.description += '. This will be automatically updated when downloading.'


// init data
let data = getCVData()
if (!data) data = sampleModule.default

// initialize editor
registerTheme(JSONEditor)
registerIconLib(JSONEditor)
const elEditorContainer = document.querySelector('.editor-container')
const editor = new JSONEditor(elEditorContainer, {
  schema: jsoncvSchema,
  theme: 'mytheme',
  iconlib: 'myiconlib',
  disable_array_delete_all_rows: true,
  no_additional_properties: true,
  startval: data,
});
// sections that can be hidden in the rendered CV
const hiddenSections = ['basics', 'summary', 'education', 'work', 'projects', 'sideProjects', 'skills', 'languages', 'interests', 'references', 'awards', 'publications', 'volunteer', 'certificates', 'meta']

function isSectionHidden(sectionName) {
  const data = editor.getValue()
  const hidden = data.meta?.hiddenSections || []
  return hidden.includes(sectionName)
}

function toggleSectionVisibility(sectionName) {
  const data = editor.getValue()
  if (!data.meta) data.meta = {}
  if (!data.meta.hiddenSections) data.meta.hiddenSections = []
  
  const idx = data.meta.hiddenSections.indexOf(sectionName)
  if (idx === -1) {
    data.meta.hiddenSections.push(sectionName)
  } else {
    data.meta.hiddenSections.splice(idx, 1)
  }
  
  editor.setValue(data)
}

function updateVisibilityButtonIcon(btn, sectionName) {
  const isHidden = isSectionHidden(sectionName)
  btn.innerHTML = ''
  btn.appendChild(getIconSVG(isHidden ? 'mdi:eye-off' : 'mdi:eye', { dom: true }))
  const label = document.createElement('span')
  label.textContent = isHidden ? 'show' : 'hide'
  btn.appendChild(label)
  btn.title = isHidden ? `Show ${sectionName} in CV` : `Hide ${sectionName} from CV`
}

function addVisibilityButton(sectionName) {
  // For 'summary', it's inside basics, so we need special handling
  let schemaPath = sectionName === 'summary' ? 'root.basics.summary' : `root.${sectionName}`
  const sectionEl = document.querySelector(`[data-schemapath="${schemaPath}"]`)
  if (!sectionEl) return
  
  const header = sectionEl.querySelector(':scope > .je-header')
  if (!header) return
  
  // Check if button already exists
  if (header.querySelector('.visibility-toggle')) return
  
  // Find or create button holder
  let btnHolder = header.querySelector('.je-header-button-holder')
  if (!btnHolder) {
    // Some sections may not have a button holder, create one
    btnHolder = document.createElement('span')
    btnHolder.className = 'je-header-button-holder'
    header.appendChild(btnHolder)
  }
  
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'visibility-toggle'
  updateVisibilityButtonIcon(btn, sectionName)
  
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSectionVisibility(sectionName)
    updateVisibilityButtonIcon(btn, sectionName)
  })
  
  btnHolder.insertBefore(btn, btnHolder.firstChild)
}

function addVisibilityButtons() {
  hiddenSections.forEach(sectionName => {
    addVisibilityButton(sectionName)
  })
}

editor.on('ready',() => {
  // add anchor to each schema element
  document.querySelectorAll('[data-schemapath]').forEach(el => {
    const schemapath = el.getAttribute('data-schemapath')
    el.id = schemapath
  })
  
  // add visibility toggle buttons to sections
  addVisibilityButtons()
})

editor.on('change', () => {
  // update visibility button icons when data changes
  document.querySelectorAll('.visibility-toggle').forEach(btn => {
    const sectionEl = btn.closest('[data-schemapath]')
    if (sectionEl) {
      const schemaPath = sectionEl.getAttribute('data-schemapath')
      let sectionName = schemaPath.replace('root.', '')
      if (sectionName === 'basics.summary') sectionName = 'summary'
      if (hiddenSections.includes(sectionName)) {
        updateVisibilityButtonIcon(btn, sectionName)
      }
    }
  })
})

function getEditorData() {
  const data = editor.getValue()
  // Add theme to preview (same as download)
  const previewData = {...data}
  if (!previewData.meta) previewData.meta = {}
  previewData.meta.theme = getTheme()
  
  return {
    data,
    json: JSON.stringify(previewData, null, 2),
  }
}

const $outputJSON = $('.output-json')
const $outputHTML = $('.output-html')
const outputHTMLIframe = $outputHTML.get(0)

// listen to change
editor.on('change', () => {
  console.log('on editor change')
  const {json} = getEditorData()
  $outputJSON.text(json)

  // save to localstorage
  saveCVJSON(json)
})

// actions
const $btnTogglePreview = $('#fn-toggle-preview')
const $btnNewData = $('#fn-new-data')
const $btnUploadData = $('#fn-upload-data')
const $inputUploadData = $('input[name=upload-data]')
const $btnDownloadJSON = $('#fn-download-json')
const $btnDownloadHTML = $('#fn-download-html')
const $btnLoadSample = $('#fn-load-sample')
const $btnPrintPreview = $('#fn-print-preview')
const $inputColorPicker = $('#fn-color-picker')
const $colorValue = $('.color-picker .value')

const isElementHidden = elt =>
	! (elt.offsetWidth || elt.offsetHeight || elt.getClientRects().length);
$btnTogglePreview.on('click', () => {
  if (isElementHidden(outputHTMLIframe)) {
    $outputJSON.hide()
    $outputHTML.show()
  } else {
    $outputHTML.hide()
    $outputJSON.show()
  }
})

$btnNewData.on('click', () => {
  if (!confirm('Are you sure to create an empty CV? Your current data will be lost.')) return

  const v = propertiesToObject(jsoncvSchema.properties)
  console.log('new value', v)
  editor.setValue(v)
})

$btnUploadData.on('click', () => {
  if (!confirm('Are you sure to upload an existing CV data? Your current data will be replaced.')) return
  $inputUploadData.trigger('click')
})

$inputUploadData.on('change', () => {
  const files = $inputUploadData.get(0).files
  if (files.length === 0) return

  const reader = new FileReader()
  reader.onload = (e) => {
    let data
    try {
      data = JSON.parse(e.target.result)
    } catch (e) {
      const error = 'Invalid JSON file: ' + new String(e).toString()
      console.log(error)
      throw e
    }
    editor.setValue(data)
  }

  reader.readAsText(files[0])
})

function downloadCV(contentType) {
  const data = editor.getValue()
  const meta = data.meta || (data.meta = {})
  const title = getCVTitle(data)

  // update data
  meta.lastModified = dayjs().format('YYYY-MM-DDTHH:mm:ssZ[Z]')
  meta.theme = getTheme()

  // download
  if (contentType === 'json') {
    let filename = `${title}.json`
    downloadContent(filename, JSON.stringify(data, null, 2))
  } else if (contentType === 'html') {
    let filename = `${title}.html`
    downloadIframeHTML(filename, outputHTMLIframe)
  }

  // update editor value
  editor.getEditor('root.meta').setValue(meta)
}

$btnDownloadJSON.on('click', () => {
  downloadCV('json')
})

$btnDownloadHTML.on('click', () => {
  downloadCV('html')
})

$btnLoadSample.on('click', () => {
  if (!confirm('Are you sure to load sample data? Your current data will be replaced.')) return

  editor.setValue(sampleModule.default)
})

$btnPrintPreview.on('click', () => {
  outputHTMLIframe.contentWindow.print()
})


// primary color

$inputColorPicker.on('change', (e) => {
  const color = e.target.value
  console.log('color', color)
  $colorValue.text(color)
  savePrimaryColor(color)
})

const primaryColor = getPrimaryColor()
$colorValue.text(primaryColor)
$inputColorPicker.val(primaryColor)

// theme selector
const $selectTheme = $('#fn-theme-select')
const themeNames = getThemeNames()

// populate theme options
themeNames.forEach(name => {
  const option = document.createElement('option')
  option.value = name
  option.textContent = name
  $selectTheme.get(0).appendChild(option)
})

// set current theme
const currentTheme = getTheme()
$selectTheme.val(currentTheme)

$selectTheme.on('change', (e) => {
  const theme = e.target.value
  console.log('theme', theme)
  saveTheme(theme)
})
