import { FileText } from 'lucide-react'
import type { Slide } from '../lib/htmlSlides'

interface SlideSidebarProps {
  slides: Slide[]
  activeSlide: number
  onSelect: (index: number) => void
}

export function SlideSidebar({ slides, activeSlide, onSelect }: SlideSidebarProps) {
  return (
    <aside className="sidebar slide-sidebar" aria-label="Slide navigation">
      <div className="panel-heading">
        <div>
          <h2>Slides</h2>
          <span className="panel-subtitle">{slides.length} {slides.length === 1 ? 'slide' : 'slides'}</span>
        </div>
      </div>
      <nav className="slide-list">
        {slides.map((slide, index) => (
          <button
            className={`slide-item ${activeSlide === index ? 'is-active' : ''}`}
            type="button"
            key={slide.id}
            aria-current={activeSlide === index ? 'page' : undefined}
            onClick={() => onSelect(index)}
          >
            <span className="slide-thumbnail">
              <FileText size={18} aria-hidden="true" />
              <span>{String(index + 1).padStart(2, '0')}</span>
            </span>
            <span className="slide-item-title">{slide.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
