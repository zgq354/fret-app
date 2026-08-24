import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const preventPageZoom = (event: Event) => event.preventDefault()
document.addEventListener('gesturestart', preventPageZoom, {
  passive: false,
})
document.addEventListener('gesturechange', preventPageZoom, {
  passive: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
