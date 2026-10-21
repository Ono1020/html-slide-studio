import { useEffect, useRef, type RefObject } from 'react'
import { ArrowLeft, ArrowRight, MousePointer2 } from 'lucide-react'
import { buildSlidePreview, type HtmlDeck } from '../lib/htmlSlides'

interface CanvasProps {
  deck: HtmlDeck | null
  activeSlide: number
  token: string
  frameRef: RefObject<HTMLIFrameElement | null>
  onNavigate: (index: number) => void
}

export function Canvas({ deck, activeSlide, token, frameRef, onNavigate }: CanvasProps) {
  const deckRef = useRef(deck)

  useEffect(() => {
    deckRef.current = deck
  }, [deck])

  useEffect(() => {
    const currentDeck = deckRef.current
    if (!currentDeck || !frameRef.current) return
    frameRef.current.srcdoc = buildSlidePreview(currentDeck, activeSlide, token)
  }, [activeSlide, deck?.sourceHtml, frameRef, token])

  return (
    <main className="canvas-area">
      <div className="canvas-toolbar">
        <div className="canvas-breadcrumb">
          <span>Canvas</span>
          {deck && <span className="breadcrumb-divider">/</span>}
          {deck && <span>{String(activeSlide + 1).padStart(2, '0')} — {deck.slides[activeSlide]?.title}</span>}
        </div>
        <div className="canvas-controls">
          {deck && <span className="edit-hint">
            <MousePointer2 size={14} aria-hidden="true" />
            Click text to edit
          </span>}
          {deck && <div className="canvas-navigation" aria-label="Slide navigation">
            <button
              className="canvas-nav-button"
              type="button"
              aria-label="Previous slide"
              disabled={activeSlide === 0}
              onClick={() => onNavigate(activeSlide - 1)}
            >
              <ArrowLeft size={15} aria-hidden="true" />
            </button>
            <span className="canvas-nav-count">{activeSlide + 1} / {deck.slides.length}</span>
            <button
              className="canvas-nav-button"
              type="button"
              aria-label="Next slide"
              disabled={activeSlide === deck.slides.length - 1}
              onClick={() => onNavigate(activeSlide + 1)}
            >
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>}
        </div>
      </div>
      {deck ? (
        <div className="canvas-stage">
          <iframe
            ref={frameRef}
            className="slide-frame"
            title={`Slide ${activeSlide + 1}`}
            sandbox="allow-scripts"
          />
        </div>
      ) : (
        <div className="canvas-empty">
          <div className="empty-icon"><MousePointer2 size={23} /></div>
          <h1>Your canvas is ready</h1>
          <p>Import a single-file HTML presentation to start editing.</p>
          <span>HTML and HTM files are supported</span>
        </div>
      )}
    </main>
  )
}
