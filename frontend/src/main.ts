import './style.css';
import { api } from './api';
import { renderDashboard } from './components/Dashboard';
import { renderPricingEngine } from './components/PricingEngine';
import { renderListingOptimizer } from './components/ListingOptimizer';
import { renderBotSimulator } from './components/BotSimulator';
import { renderPropertyManager } from './components/PropertyManager';

// Global Toast Manager
function showToast(message: string, type: 'success' | 'error' = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// App Initialization
function initApp() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  
  app.innerHTML = `
    <!-- Top Header -->
    <header class="top-header">
      <div class="brand-section">
        <div class="brand-logo-badge">🌴</div>
        <div>
          <div class="brand-title">Wayzyy <span style="font-size: 0.85rem; font-weight: 500; color: #38bdf8; padding: 0.15rem 0.5rem; background: rgba(14, 165, 233, 0.15); border-radius: 9999px; border: 1px solid rgba(14, 165, 233, 0.3);">Host Toolkit</span></div>
          <div class="brand-subtitle">Goa Short-Term Rental AI & Revenue OS</div>
        </div>
      </div>

      <div class="header-right">
        <div id="backend-status-pill" class="status-pill">
          <div class="status-dot"></div>
          <span>API Connected</span>
        </div>

        <div class="host-profile">
          <div class="host-avatar">RN</div>
          <div>
            <div class="host-info-name">Rajesh Naik</div>
            <div class="host-info-role">Superhost • Goa (3 stays)</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Bar -->
    <nav class="nav-bar">
      <button class="nav-tab active" data-tab="dashboard">
        <span>📊</span>
        <span>Overview & KPIs</span>
      </button>
      <button class="nav-tab" data-tab="pricing">
        <span>⚡</span>
        <span>Dynamic Pricing Studio</span>
        <span class="nav-badge">AI Powered</span>
      </button>
      <button class="nav-tab" data-tab="listing">
        <span>✍️</span>
        <span>AI Listing & Staging</span>
      </button>
      <button class="nav-tab" data-tab="bot">
        <span>💬</span>
        <span>WhatsApp Concierge</span>
        <span class="nav-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">24/7 Live</span>
      </button>
      <button class="nav-tab" data-tab="properties">
        <span>🏡</span>
        <span>Properties & Calendar</span>
      </button>
    </nav>

    <!-- Main Content Container -->
    <main id="main-content" class="main-content">
      <!-- Active module rendered here -->
    </main>

    <!-- Global Toast Container -->
    <div id="toast-container" class="toast-container"></div>
  `;

  const contentArea = document.getElementById('main-content') as HTMLElement;
  const navTabs = document.querySelectorAll<HTMLButtonElement>('.nav-tab');

  function navigateTo(tabName: string) {
    navTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    switch (tabName) {
      case 'dashboard':
        renderDashboard(contentArea, navigateTo);
        break;
      case 'pricing':
        renderPricingEngine(contentArea, showToast);
        break;
      case 'listing':
        renderListingOptimizer(contentArea, showToast);
        break;
      case 'bot':
        renderBotSimulator(contentArea, showToast);
        break;
      case 'properties':
        renderPropertyManager(contentArea, showToast);
        break;
      default:
        renderDashboard(contentArea, navigateTo);
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName) navigateTo(tabName);
    });
  });

  // Health check loop
  async function verifyConnection() {
    const statusPill = document.getElementById('backend-status-pill');
    if (!statusPill) return;

    try {
      const health = await api.checkHealth();
      if (health.status === 'ok') {
        if (health.llmWorking) {
          statusPill.innerHTML = `
            <div class="status-dot" style="background: #059669; box-shadow: 0 0 6px rgba(5, 150, 105, 0.4);"></div>
            <span style="font-weight: 700; color: #065f46;">API Connected (Claude AI)</span>
          `;
          statusPill.style.borderColor = '#a7f3d0';
          statusPill.style.background = '#ecfdf5';
          statusPill.title = 'Live Anthropic Claude 3.5 Sonnet API active & responsive';
        } else if (health.llmConfigured) {
          statusPill.innerHTML = `
            <div class="status-dot" style="background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.4);"></div>
            <span style="font-weight: 700; color: #92400e;">API Connected (Smart Fallback)</span>
          `;
          statusPill.style.borderColor = '#fde68a';
          statusPill.style.background = '#fef3c7';
          statusPill.title = health.llmError ? `Claude key issue: ${health.llmError} (Fallback engine active)` : 'Fallback engine active';
        } else {
          statusPill.innerHTML = `
            <div class="status-dot" style="background: #0284c7; box-shadow: 0 0 6px rgba(2, 132, 199, 0.4);"></div>
            <span style="font-weight: 700; color: #075985;">API Connected (Smart Fallback)</span>
          `;
          statusPill.style.borderColor = '#bae6fd';
          statusPill.style.background = '#f0f9ff';
          statusPill.title = 'Built-in Goan domain knowledge engine active';
        }
      } else {
        throw new Error();
      }
    } catch {
      statusPill.innerHTML = `
        <div class="status-dot" style="background: #e11d48; box-shadow: 0 0 8px rgba(225, 29, 72, 0.4);"></div>
        <span style="color: #9f1239; font-weight: 700;">Backend Offline</span>
      `;
      statusPill.style.borderColor = '#fecdd3';
      statusPill.style.background = '#fff1f2';
      statusPill.title = 'Unable to reach backend server on http://localhost:5000';
    }
  }

  verifyConnection();
  setInterval(verifyConnection, 15000);

  // Load initial view
  navigateTo('dashboard');
}

initApp();
