import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { App } from './App'

test('renders the React app shell placeholder', () => {
  const html = renderToStaticMarkup(<App appVersion="0.1.6" />)

  assert.match(html, /allmone 0\.1\.6/)
  assert.match(html, /Runtime Control/)
  assert.match(html, /Loading renderer/)
})

test('renders Providers as the default sidebar section', () => {
  const html = renderToStaticMarkup(<App appVersion="0.1.6" />)

  assert.match(html, /Allmone/)
  assert.match(html, /Providers/)
  assert.match(html, /Settings/)
  assert.match(html, /Upstream Setup/)
  assert.doesNotMatch(html, /OpenAI-Compatible Providers/)
})

test('renders managed runtime controls in Settings', () => {
  const html = renderToStaticMarkup(
    <App appVersion="0.1.6" initialSection="settings" />
  )

  assert.match(html, /Managed CLIProxyAPI/)
  assert.match(html, /Output Port/)
})
