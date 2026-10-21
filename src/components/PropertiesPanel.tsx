import { AlignLeft, CircleHelp, Type } from 'lucide-react'

export interface SelectedElement {
  tag: string
  text: string
}

interface PropertiesPanelProps {
  selectedElement: SelectedElement | null
  hasDeck: boolean
}

export function PropertiesPanel({ selectedElement, hasDeck }: PropertiesPanelProps) {
  return (
    <aside className="sidebar properties-sidebar" aria-label="Properties">
      <div className="panel-heading">
        <div>
          <h2>Properties</h2>
          <span className="panel-subtitle">Selected element</span>
        </div>
      </div>
      {selectedElement ? (
        <div className="property-content">
          <div className="property-card">
            <span className="property-label"><Type size={14} /> Element</span>
            <span className="property-value tag-value">&lt;{selectedElement.tag}&gt;</span>
          </div>
          <div className="property-card">
            <span className="property-label"><AlignLeft size={14} /> Text content</span>
            <p className="property-text">{selectedElement.text || 'Empty text'}</p>
          </div>
          <div className="property-note">
            <CircleHelp size={15} />
            Text changes are saved as you type.
          </div>
        </div>
      ) : (
        <div className="properties-empty">
          <Type size={19} />
          <p>{hasDeck ? 'Select text on the slide to inspect it.' : 'Element details will appear here.'}</p>
        </div>
      )}
    </aside>
  )
}
