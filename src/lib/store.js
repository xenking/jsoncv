export const storeKeys = {
  cvJSON: 'cvJSON',
  cvSavedTime: 'cvSavedTime',
  primaryColor: 'primary-color',
  theme: 'theme',
}

const defaultPrimaryColor = '#950e0e'
const defaultTheme = 'xenking'

function updateSavedTime() {
  localStorage.setItem(storeKeys.cvSavedTime, Date.now())
}

export function saveCVJSON(str) {
  localStorage.setItem(storeKeys.cvJSON, str)
  updateSavedTime()
}

export function getCVData() {
  const v = localStorage.getItem(storeKeys.cvJSON)
  if (!v) return
  return JSON.parse(v)
}

export function getCVSavedTime() {
  return localStorage.getItem(storeKeys.cvSavedTime)
}

export function savePrimaryColor(color) {
  localStorage.setItem(storeKeys.primaryColor, color)
  updateSavedTime()
}

export function getPrimaryColor() {
  return localStorage.getItem(storeKeys.primaryColor) || defaultPrimaryColor
}

export function saveTheme(theme) {
  localStorage.setItem(storeKeys.theme, theme)
  updateSavedTime()
}

export function getTheme() {
  return localStorage.getItem(storeKeys.theme) || defaultTheme
}
