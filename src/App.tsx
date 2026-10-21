import { useEffect, useRef, useState } from 'react'
import { Canvas } from './components/Canvas'
import { PropertiesPanel, type SelectedElement } from './components/PropertiesPanel'
import { SlideSidebar } from './components/SlideSidebar'
import { TopBar } from './components/TopBar'
import {
  cleanSlideMarkup,
  exportHtmlDeck,
  getSlideTitle,
  parseHtmlDeck,
  type HtmlDeck,
} from './lib/htmlSlides'

type Theme = 'light' | 'dark'

type EditorMessage =
  | {
      type: 'selection'
      token: string
      slideIndex: number
      tag: string
      text: string
    }
  | {
      type: 'slide-update'
      token: string
      slideIndex: number
      html: string
    }
  | {
      type: 'navigate'
      token: string
      slideIndex: number
      delta: -1 | 1
    }

function createToken(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function App() {
  const [deck, setDeck] = useState<HtmlDeck | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const [token, setToken] = useState('')
  const [theme, setTheme] = useState<Theme>(() => (
    localStorage.getItem('html-slide-studio-theme') === 'dark' ? 'dark' : 'light'
  ))
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null)
  const [notice, setNotice] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const slideCount = deck?.slides.length ?? 1

  useEffect(() => {
    localStorage.setItem('html-slide-studio-theme', theme)
  }, [theme])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frameRef.current?.contentWindow || !event.data || typeof event.data !== 'object') return
      const message = event.data as Partial<EditorMessage>
      if (message.token !== token || message.slideIndex !== activeSlide) return

      if (message.type === 'navigate' && (message.delta === -1 || message.delta === 1)) {
        setActiveSlide((current) => Math.max(0, Math.min(slideCount - 1, current + message.delta!)))
        setSelectedElement(null)
        return
      }

      if (message.type === 'selection' && typeof message.tag === 'string' && typeof message.text === 'string') {
        setSelectedElement({ tag: message.tag, text: message.text })
        return
      }

      if (message.type === 'slide-update' && typeof message.html === 'string') {
        setDeck((currentDeck) => {
          if (!currentDeck || !currentDeck.slides[activeSlide]) return currentDeck
          const html = cleanSlideMarkup(message.html!, token)
          const slides = currentDeck.slides.map((slide, index) => (
            index === activeSlide
              ? { ...slide, html, title: getSlideTitle(html, `Slide ${index + 1}`) }
              : slide
          ))
          return { ...currentDeck, slides }
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [activeSlide, slideCount, token])

  const importFile = async (file: File) => {
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      setNotice('Choose an .html or .htm file.')
      return
    }

    try {
      const sourceHtml = await file.text()
      const importedDeck = parseHtmlDeck(sourceHtml, file.name)
      setDeck(importedDeck)
      setToken(createToken())
      setActiveSlide(0)
      setSelectedElement(null)
      setNotice(`Imported ${importedDeck.slides.length} ${importedDeck.slides.length === 1 ? 'slide' : 'slides'}.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The HTML file could not be read.')
    }
  }

  const exportFile = () => {
    if (!deck) return

    try {
      const html = exportHtmlDeck(deck)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const baseName = deck.name.replace(/\.html?$/i, '') || 'presentation'
      link.href = url
      link.download = `${baseName}-edited.html`
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice('Your edited HTML presentation has been downloaded.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The HTML file could not be exported.')
    }
  }

  const selectSlide = (index: number) => {
    setActiveSlide(index)
    setSelectedElement(null)
  }

  const navigateTo = (index: number) => {
    setActiveSlide(Math.max(0, Math.min((deck?.slides.length ?? 1) - 1, index)))
    setSelectedElement(null)
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <TopBar
        fileName={deck?.name}
        hasDeck={Boolean(deck)}
        theme={theme}
        onImport={importFile}
        onExport={exportFile}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      />
      <div className="editor-layout">
        <SlideSidebar
          slides={deck?.slides ?? []}
          activeSlide={activeSlide}
          onSelect={selectSlide}
        />
        <Canvas
          deck={deck}
          activeSlide={activeSlide}
          token={token}
          frameRef={frameRef}
          onNavigate={navigateTo}
        />
        <PropertiesPanel selectedElement={selectedElement} hasDeck={Boolean(deck)} />
      </div>
      <footer className="statusbar" aria-live="polite">
        <span className={`status-dot ${deck ? 'is-ready' : ''}`} />
        <span>{notice || (deck ? 'Changes are ready to export.' : 'Ready — your files stay on your device.')}</span>
      </footer>
    </div>
  )
}

export default App
