import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../global/index.jsx'

/**
 * ImageCrop — simple drag-to-reposition square crop component
 * No external dependency. Output: cropped Blob via onCrop(blob)
 */
export default function ImageCrop({ src, aspect = 1, onCrop, onCancel }) {
  const canvasRef  = useRef()
  const imgRef     = useRef()
  const [offset,   setOffset]   = useState({ x: 0, y: 0 })
  const [scale,    setScale]    = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart,setDragStart]= useState(null)
  const SIZE = 280 // canvas display size

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      drawCanvas({ x: 0, y: 0 }, 1)
    }
    img.src = src
  }, [src])

  const drawCanvas = useCallback((off, sc) => {
    const canvas = canvasRef.current
    if (!canvas || !imgRef.current) return
    const ctx  = canvas.getContext('2d')
    const img  = imgRef.current
    const dim  = SIZE

    ctx.clearRect(0, 0, dim, dim)
    // Draw image
    const drawW = img.width  * sc
    const drawH = img.height * sc
    ctx.drawImage(img, off.x, off.y, drawW, drawH)

    // Overlay with circular mask
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(dim / 2, dim / 2, dim / 2 - 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Border
    ctx.strokeStyle = '#C18B3C'
    ctx.lineWidth   = 3
    ctx.beginPath()
    ctx.arc(dim / 2, dim / 2, dim / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart) return
    const newOff = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }
    setOffset(newOff)
    drawCanvas(newOff, scale)
  }, [dragging, dragStart, scale, drawCanvas])

  const handleMouseUp = () => setDragging(false)

  const handleScale = (e) => {
    const sc = parseFloat(e.target.value)
    setScale(sc)
    drawCanvas(offset, sc)
  }

  const handleCrop = () => {
    const canvas  = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => { if (blob) onCrop(blob) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-3xl p-6 w-full max-w-sm shadow-modal animate-scale-in">
        <h3 className="text-lg font-bold text-text-primary mb-4 text-center">Crop Photo</h3>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full cursor-grab active:cursor-grabbing"
            style={{ width: SIZE, height: SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Scale slider */}
        <div className="mb-5">
          <label className="text-xs text-text-muted font-medium block mb-1.5">Zoom</label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={scale}
            onChange={handleScale}
            className="w-full accent-brand-500"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="md" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="primary"   size="md" onClick={handleCrop} className="flex-1">Apply</Button>
        </div>
      </div>
    </div>
  )
}
