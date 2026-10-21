import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'leaflet/dist/leaflet.css'

import App from './App'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(
    'Root element not found. Make sure index.html contains <div id="root"></div>.',
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)