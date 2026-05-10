import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { App } from './App'

test('renders the React app shell placeholder', () => {
  const html = renderToStaticMarkup(<App appVersion="0.1.6" />)

  assert.match(html, /allmone 0\.1\.6/)
  assert.match(html, /Runtime Control/)
  assert.match(html, /Loading renderer/)
})

test('renders Models as the default sidebar section above Providers', () => {
  const html = renderToStaticMarkup(<App appVersion="0.1.6" />)

  assert.match(html, /Allmone/)
  assert.match(html, /Models[\s\S]*Providers[\s\S]*Settings/)
  assert.match(html, /Model Inventory/)
  assert.doesNotMatch(html, /OpenAI-Compatible Providers/)
})

test('renders Providers when requested as the initial section', () => {
  const html = renderToStaticMarkup(
    <App appVersion="0.1.6" initialSection="providers" />
  )

  assert.match(html, /Upstream Setup/)
})

test('renders managed runtime controls in Settings', () => {
  const html = renderToStaticMarkup(
    <App appVersion="0.1.6" initialSection="settings" />
  )

  assert.match(html, /Managed CLIProxyAPI/)
  assert.match(html, /Output Port/)
})
