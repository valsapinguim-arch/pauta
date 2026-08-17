import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { App } from './App'
import '@/styles/tokens.css'
import '@/styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemento #root não encontrado em index.html')
}

createRoot(container).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
