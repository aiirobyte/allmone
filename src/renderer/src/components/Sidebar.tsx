import type { ReactElement } from 'react'

import type { ActiveSection } from '../rendererTypes'

type SidebarProps = {
  activeSection: ActiveSection
  onSelect: (section: ActiveSection) => void
}

const sections: Array<{ id: ActiveSection; label: string }> = [
  { id: 'providers', label: 'Providers' },
  { id: 'settings', label: 'Settings' }
]

export function Sidebar({
  activeSection,
  onSelect
}: SidebarProps): ReactElement {
  return (
    <aside className="app-sidebar" aria-label="Primary">
      <h1>Allmone</h1>
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={section.id === activeSection ? 'active' : ''}
            aria-current={section.id === activeSection ? 'page' : undefined}
            onClick={() => onSelect(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
