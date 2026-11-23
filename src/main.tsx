import { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/dm-serif-text/latin-400.css'
import './style.css'

// The app module starts the simulation clock. Load it after the refresh screen.
const App = lazy(() => import('./App'))
const refreshDuration = 10_000

function RefreshScreen() {
  return <main className="refresh-screen">
    <div className="refresh-card">
      <img src="/bank.svg" width="52" height="52" alt=""/>
      <h1>Banking Tycoon</h1>
      <p role="status"><span className="loading-spinner" aria-hidden="true"/>Opening your branch…</p>
      <div className="refresh-progress" aria-hidden="true"><i style={{ animationDuration: refreshDuration + 'ms' }}/></div>
    </div>
  </main>
}

function Startup() {
  const [refreshing,setRefreshing] = useState(() => {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    return navigation?.type === 'reload'
  })
  useEffect(() => {
    if (!refreshing) return
    const timer = window.setTimeout(() => setRefreshing(false), refreshDuration)
    return () => window.clearTimeout(timer)
  }, [refreshing])
  if (refreshing) return <RefreshScreen/>
  return <Suspense fallback={<div className="tab-loading" role="status"><span className="loading-spinner" aria-hidden="true"/>Opening your branch…</div>}><App/></Suspense>
}

createRoot(document.getElementById('root')!).render(<Startup/>)
