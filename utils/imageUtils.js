// src/utils/imageUtils.js

// Returns a tiny 4×4 blurred base64 image as placeholder
// while the real image loads — prevents layout shift
export function getBlurDataURL(color = '#f3f4f6') {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
  
    // Smallest possible PNG: 1x1 solid color
    const canvas =
      typeof window !== 'undefined' ? document.createElement('canvas') : null
    if (!canvas) return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
  
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(0, 0, 1, 1)
    return canvas.toDataURL()
  }
  
  export const DEFAULT_BLUR =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='