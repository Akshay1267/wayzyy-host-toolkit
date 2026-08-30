import { api } from '../api';
import type { Booking } from '../types';

export async function renderDashboard(container: HTMLElement, onNavigate: (tab: string) => void) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 3rem;">
      <div class="status-dot" style="width: 16px; height: 16px;"></div>
    </div>
  `;

  try {
    const [stats, bookings] = await Promise.all([
      api.getDashboardStats(),
      api.getBookings()
    ]);

    const maxRevenue = Math.max(...stats.propertyBreakdown.map(p => p.revenue), 1);

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h1 class="section-title">Host Performance & Intelligence</h1>
          <p class="section-desc">Real-time revenue metrics, occupancy analytics, and market pacing for your Goa properties.</p>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-quick-price" class="btn btn-primary btn-sm">
            <span>⚡ Calculate Dynamic Price</span>
          </button>
          <button id="btn-quick-bot" class="btn btn-emerald btn-sm">
            <span>💬 Launch WhatsApp Bot</span>
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card" style="--card-accent: #059669;">
          <div class="kpi-header">
            <span class="kpi-label">Total Revenue</span>
            <div class="kpi-icon-wrap">💰</div>
          </div>
          <div class="kpi-value">₹${stats.totalRevenue.toLocaleString('en-IN')}</div>
          <div class="kpi-subtext">
            <span>↗ +18.4% vs last month</span>
          </div>
        </div>

        <div class="kpi-card" style="--card-accent: #0284c7;">
          <div class="kpi-header">
            <span class="kpi-label">Estimated Occupancy</span>
            <div class="kpi-icon-wrap">📊</div>
          </div>
          <div class="kpi-value">${stats.occupancyRate}%</div>
          <div class="kpi-subtext">
            <span style="color: #0284c7;">● 4.2 nights avg stay</span>
          </div>
        </div>

        <div class="kpi-card" style="--card-accent: #d97706;">
          <div class="kpi-header">
            <span class="kpi-label">Total Bookings</span>
            <div class="kpi-icon-wrap">📅</div>
          </div>
          <div class="kpi-value">${stats.totalBookings}</div>
          <div class="kpi-subtext">
            <span style="color: #d97706;">● 3 WhatsApp direct leads</span>
          </div>
        </div>

        <div class="kpi-card" style="--card-accent: #7c3aed;">
          <div class="kpi-header">
            <span class="kpi-label">Avg. Daily Rate (ADR)</span>
            <div class="kpi-icon-wrap">🏷️</div>
          </div>
          <div class="kpi-value">₹${stats.avgNightlyRate.toLocaleString('en-IN')}</div>
          <div class="kpi-subtext">
            <span style="color: #7c3aed;">● Highest in Anjuna (₹4.8k)</span>
          </div>
        </div>
      </div>

      <!-- Dashboard Two Column Grid -->
      <div class="dashboard-grid">
        <!-- Left: Revenue by Property -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #0f172a;">Revenue by Listing</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">Cumulative revenue across your 3 active Goa stays</p>
            </div>
            <button id="btn-view-all-props" class="btn btn-secondary btn-sm">Manage Properties →</button>
          </div>

          <div style="margin-top: 1.75rem;">
            ${stats.propertyBreakdown.map(prop => {
              const pct = Math.round((prop.revenue / maxRevenue) * 100);
              return `
                <div class="revenue-bar-row">
                  <div class="bar-prop-info">
                    <div style="color: var(--text-primary); font-weight: 700;">${prop.name}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${prop.location} • ${prop.booking_count} bookings</div>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%;"></div>
                  </div>
                  <div class="bar-amount">₹${prop.revenue.toLocaleString('en-IN')}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="ai-advice-box">
            <div class="ai-sparkle-icon">✨</div>
            <div class="ai-advice-text">
              <strong>Market Intelligence:</strong> Goa shoulder season is concluding. Demand in <strong>Anjuna & Vagator</strong> is trending up by +35% for October long weekends. Consider enabling 2-night minimum stay rules.
            </div>
          </div>
        </div>

        <!-- Right: Booking Channel Split & Fast Actions -->
        <div class="glass-card" style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #0f172a;">Direct vs Platform Share</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Save 15-20% commission on direct WhatsApp bookings</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.1rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-size: 1.3rem;">💬</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: #047857;">WhatsApp Direct</div>
                  <div style="font-size: 0.75rem; color: #065f46;">Zero platform fees</div>
                </div>
              </div>
              <div style="font-weight: 800; color: #047857; font-family: var(--font-mono); font-size: 1.05rem;">45% Share</div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.1rem; background: #f8f6f0; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span style="font-size: 1.3rem;">🌐</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--text-primary);">OTA Channels</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Airbnb, Booking.com</div>
                </div>
              </div>
              <div style="font-weight: 800; color: var(--text-secondary); font-family: var(--font-mono); font-size: 1.05rem;">55% Share</div>
            </div>
          </div>

          <div style="margin-top: auto; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle);">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.75rem;">Toolkit Shortcuts</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
              <button id="btn-dash-listing" class="btn btn-secondary btn-sm" style="font-size: 0.8rem;">✍️ AI Listing Copy</button>
              <button id="btn-dash-bookings" class="btn btn-secondary btn-sm" style="font-size: 0.8rem;">📋 Bookings Table</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Reservations Feed -->
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #0f172a;">Recent Guest Reservations</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Latest check-ins across your properties</p>
          </div>
          <button id="btn-view-bookings-table" class="btn btn-secondary btn-sm">Full Schedule →</button>
        </div>

        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Property</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Total</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.slice(0, 5).map((b: Booking) => `
                <tr>
                  <td>
                    <div style="font-weight: 700;">${b.guest_name}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${b.guest_phone || 'Direct Lead'}</div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #0284c7;">${b.property_name || 'Listing #' + b.property_id}</div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">${b.location || 'Goa'}</div>
                  </td>
                  <td>
                    <div style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600;">${b.check_in} → ${b.check_out}</div>
                  </td>
                  <td style="font-weight: 600;">${b.guests} guests</td>
                  <td style="font-family: var(--font-mono); font-weight: 800; color: #059669; font-size: 0.95rem;">₹${b.total_amount.toLocaleString('en-IN')}</td>
                  <td>
                    <span class="badge-status badge-${b.status}">${b.status}</span>
                  </td>
                  <td>
                    <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 700;">
                      ${b.source === 'whatsapp' ? '💬 WhatsApp' : b.source === 'direct' ? '⚡ Direct' : '🌐 OTA'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('#btn-quick-price')?.addEventListener('click', () => onNavigate('pricing'));
    container.querySelector('#btn-quick-bot')?.addEventListener('click', () => onNavigate('bot'));
    container.querySelector('#btn-view-all-props')?.addEventListener('click', () => onNavigate('properties'));
    container.querySelector('#btn-dash-listing')?.addEventListener('click', () => onNavigate('listing'));
    container.querySelector('#btn-dash-bookings')?.addEventListener('click', () => onNavigate('properties'));
    container.querySelector('#btn-view-bookings-table')?.addEventListener('click', () => onNavigate('properties'));

  } catch (error) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 3rem;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <div style="font-size: 1.1rem; font-weight: 600; color: #e11d48;">Could not load dashboard data</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${(error as Error).message}</p>
        <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}
