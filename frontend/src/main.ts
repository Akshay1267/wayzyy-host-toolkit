import './style.css';
import { api } from './api';
import { renderDashboard } from './components/Dashboard';
import { renderPricingEngine } from './components/PricingEngine';
import { renderListingOptimizer } from './components/ListingOptimizer';
import { renderBotSimulator } from './components/BotSimulator';
import { renderPropertyManager } from './components/PropertyManager';

// Theme Management System
function initTheme() {
  const savedTheme = localStorage.getItem('wayzyy_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  
  applyTheme(initialTheme);

  // Listen to system theme changes if no explicit user preference is stored
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('wayzyy_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  const iconEl = document.getElementById('theme-icon-slot');
  const btn = document.getElementById('theme-toggle-btn');
  
  if (iconEl) {
    iconEl.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
  if (btn) {
    btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('wayzyy_theme', next);
  applyTheme(next);
}

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
        <div class="brand-logo-badge">🏡</div>
        <div>
          <div class="brand-title">
            <span>Wayzyy</span>
            <span class="brand-badge-pill">Host OS</span>
          </div>
          <div class="brand-subtitle">Short-Term Rental AI & Revenue Growth Platform</div>
        </div>
      </div>

      <div class="header-right">
        <!-- Theme Mode Toggle Button (Icon only) -->
        <button id="theme-toggle-btn" class="theme-toggle-btn" title="Toggle Theme" aria-label="Toggle Theme">
          <span class="theme-icon-slot" id="theme-icon-slot">☀️</span>
        </button>

        <!-- API Status Pill -->
        <div id="backend-status-pill" class="status-pill">
          <div class="status-dot"></div>
          <span>API Connected</span>
        </div>

        <!-- Host Profile -->
        <div class="host-profile">
          <div class="host-avatar">RN</div>
          <div>
            <div class="host-info-name">Rajesh Naik</div>
            <div class="host-info-role">★ Superhost • 4 Stays</div>
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
        <span class="nav-badge" style="background: var(--accent-emerald-soft); color: var(--accent-emerald); border-color: var(--accent-emerald-border);">24/7 Live</span>
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

  // Initialize theme button state
  const savedTheme = localStorage.getItem('wayzyy_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));

  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn?.addEventListener('click', toggleTheme);

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
        const waLabel = health.whatsappConfigured ? ' • 💬 WA Live' : '';
        if (health.llmWorking) {
          const providerLabel = health.llmProvider === 'gemini' ? 'Gemini AI' : health.llmProvider === 'claude' ? 'Claude AI' : 'Live AI';
          statusPill.innerHTML = `
            <div class="status-dot" style="background: var(--accent-emerald);"></div>
            <span style="font-weight: 700; color: var(--accent-emerald-text);">API Connected (${providerLabel})${waLabel}</span>
          `;
          statusPill.style.borderColor = 'var(--accent-emerald-border)';
          statusPill.style.background = 'var(--accent-emerald-soft)';
          statusPill.title = `Live ${health.llmModel || providerLabel} active & responding!${health.whatsappConfigured ? ' WhatsApp Cloud API connected.' : ''}`;
        } else if (health.llmConfigured) {
          statusPill.innerHTML = `
            <div class="status-dot" style="background: var(--accent-gold);"></div>
            <span style="font-weight: 700; color: var(--accent-gold);">API Connected (Smart Fallback)${waLabel}</span>
          `;
          statusPill.style.borderColor = 'var(--accent-gold-border)';
          statusPill.style.background = 'var(--accent-gold-soft)';
          statusPill.title = health.llmError ? `AI key notice: ${health.llmError} (Fallback engine active)` : 'Fallback engine active';
        } else {
          statusPill.innerHTML = `
            <div class="status-dot" style="background: var(--accent-ocean);"></div>
            <span style="font-weight: 700; color: var(--accent-ocean-text);">API Connected (Smart Fallback)${waLabel}</span>
          `;
          statusPill.style.borderColor = 'var(--accent-ocean-border)';
          statusPill.style.background = 'var(--accent-ocean-soft)';
          statusPill.title = 'Built-in vacation rental domain knowledge engine active';
        }
      } else {
        throw new Error();
      }
    } catch {
      statusPill.innerHTML = `
        <div class="status-dot" style="background: var(--accent-rose);"></div>
        <span style="color: var(--accent-rose-text); font-weight: 700;">Backend Offline</span>
      `;
      statusPill.style.borderColor = 'var(--accent-rose-border)';
      statusPill.style.background = 'var(--accent-rose-soft)';
      statusPill.title = 'Unable to reach backend server on http://localhost:5000';
    }
  }

  verifyConnection();
  setInterval(verifyConnection, 15000);

  // Load initial view
  navigateTo('dashboard');
}

// Kick off
initTheme();
initApp();
