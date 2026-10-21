import { Download, FileUp, Moon, Sun } from 'lucide-react'

interface TopBarProps {
  fileName?: string
  hasDeck: boolean
  theme: 'light' | 'dark'
  onImport: (file: File) => void
  onExport: () => void
  onToggleTheme: () => void
}

export function TopBar({
  fileName,
  hasDeck,
  theme,
  onImport,
  onExport,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">S</div>
        <div className="brand-copy">
          <strong>HTML Slide Studio</strong>
          <span>{fileName ?? 'Local presentation editor'}</span>
        </div>
      </div>
      <div className="topbar-actions">
        <label className="button button-secondary import-button">
          <FileUp size={16} aria-hidden="true" />
          <span>Import HTML</span>
          <input
            aria-label="Import HTML file"
            type="file"
            accept=".html,.htm,text/html"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) onImport(file)
              event.currentTarget.value = ''
            }}
          />
        </label>
        <button
          className="button button-primary"
          type="button"
          disabled={!hasDeck}
          onClick={onExport}
        >
          <Download size={16} aria-hidden="true" />
          Export HTML
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  )
}
