import type { ReactElement } from 'react'

import type { SafeEndpointKind } from '../rendererTypes'

type CopyRowProps = {
  label: string
  value: string | null
  kind: SafeEndpointKind
  busy: boolean
  onCopy: (kind: SafeEndpointKind) => void
}

export function CopyRow({
  label,
  value,
  kind,
  busy,
  onCopy
}: CopyRowProps): ReactElement {
  return (
    <div className="copy-row">
      <div>
        <span>{label}</span>
        <code>{value ?? 'Unavailable'}</code>
      </div>
      <button
        type="button"
        disabled={!value || busy}
        aria-busy={busy || undefined}
        onClick={() => onCopy(kind)}
      >
        Copy
      </button>
    </div>
  )
}
