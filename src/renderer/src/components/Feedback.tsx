import type { ReactElement } from 'react'

type FeedbackProps = {
  error: string | null
  notice: string | null
}

export function Feedback({ error, notice }: FeedbackProps): ReactElement | null {
  if (error) {
    return <div className="feedback feedback-error">{error}</div>
  }

  if (notice) {
    return <div className="feedback feedback-notice">{notice}</div>
  }

  return null
}
