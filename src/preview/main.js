import {
  getCVData,
  getCVSavedTime,
  getPrimaryColor,
  getTheme,
} from '../lib/store';
import { upsertStyleTag } from '../lib/utils';
import cvBaseStyle from '../scss/cv-base.css?inline';
import { renderThemeOn } from '../themes';
import { getCVTitle } from '../themes/data';

const themeName = getTheme()
const elCV = document.querySelector('.cv-container')

// Save scroll position on page unload
const storeKeyScroll = 'scroll-position'
const onScroll = () => {
  localStorage.setItem(storeKeyScroll, JSON.stringify({
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }));
}
let onScrollTimer
window.addEventListener("scroll", () => {
  if (onScrollTimer) clearTimeout(onScrollTimer)

  onScrollTimer = setTimeout(onScroll, 50);
}, false)

const restoreScrollPosition = () => {
  const scrollPosition = JSON.parse(localStorage.getItem(storeKeyScroll));
  if (scrollPosition) {
    window.scrollTo(scrollPosition.scrollX, scrollPosition.scrollY);
  }
}

// Render CV
const data = getCVData()
if (data) {

  upsertStyleTag('base-style', cvBaseStyle)

  // Approximate page break indicators (dashed lines at A4 intervals)
  // These are visual guides only — actual PDF breaks may differ slightly
  upsertStyleTag('page-breaks', `
    .cv-container {
      background-image: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 1122px,
        #ccc 1122px,
        transparent 1123px,
        transparent 1124px
      );
    }
    @media print { .cv-container { background-image: none !important; } }
  `)

  renderThemeOn(themeName, elCV, data, getPrimaryColor(), { isPreview: true })

  // change document title
  document.title = getCVTitle(data)
  // restore scroll position
  restoreScrollPosition()
}

const savedTime = getCVSavedTime()
console.log('preview loaded', Date.now())

const interval = setInterval(() => {
  if (savedTime != getCVSavedTime()) {
    clearInterval(interval)
    location.reload()
  }
}, 1000)
