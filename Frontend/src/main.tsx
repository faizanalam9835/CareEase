import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter } from "react-router-dom";

// Every button shows its name on hover: one listener instead of a title on each of them.
document.addEventListener('mouseover', (event) => {
  const button = (event.target as Element).closest?.('button, [role="button"]');
  if (!button || button.hasAttribute('title')) return;
  const name = button.getAttribute('aria-label') || button.textContent?.trim();
  if (name) button.setAttribute('title', name);
});

// index.html always contains #root.
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
