import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  ),
)

void import('@fontsource/plus-jakarta-sans/latin-400.css')
void import('@fontsource/plus-jakarta-sans/latin-500.css')
void import('@fontsource/plus-jakarta-sans/latin-600.css')
void import('@fontsource/plus-jakarta-sans/latin-700.css')
