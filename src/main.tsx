import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if (import.meta.env.DEV && window.location.hostname === 'localhost' && window.location.port === '5173') {
  window.location.replace(`http://localhost:8080${window.location.pathname}${window.location.search}${window.location.hash}`);
}

createRoot(document.getElementById("root")!).render(<App />);
