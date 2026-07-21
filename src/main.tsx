import React from 'react'
import { createRoot } from 'react-dom/client'
import './theme/fonts'
import './theme/tokens.css'
import './styles/app.css'
import './styles/components.css'
import './styles/dialogs.css'
import { App } from './App'

// Tag platform; CSS hides checkerboard under OS transparency.
if (typeof window !== 'undefined' && (window as any).openfall?.isElectron) {
  document.body.setAttribute('data-platform', 'electron')
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
