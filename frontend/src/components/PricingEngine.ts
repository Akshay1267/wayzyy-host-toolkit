import { api } from '../api';
import type { PricingResult } from '../types';

export async function renderPricingEngine(container: HTMLElement, showToast: (msg: string, type?: 'success' | 'error') => void) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 3rem;">
      <div class="status-dot" style="width: 16px; height: 16px;"></div>
    </div>
  `;

  try {
    const properties = await api.getProperties();

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h1 class="section-title">Smart Dynamic Pricing Engine</h1>
          <p class="section-desc">Algorithmically optimize your nightly rates based on Goa seasonality, micro-location tiers, amenities boost, and live market comparables.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 2rem; align-items: start;">
        <!-- Left: Form Controls -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #0f172a;">Pricing Parameters</h3>
            <select id="preset-property-select" class="form-select" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.82rem; font-weight: 600;">
              <option value="">⚡ Load from Listing...</option>
              ${properties.map(p => `<option value="${p.id}">${p.name} (${p.location})</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Base Nightly Rate (₹ INR)</label>
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <input type="number" id="input-base-rate" class="form-input" value="4500" min="500" max="50000" step="100" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">Property Type</label>
              <select id="input-prop-type" class="form-select">
                <option value="villa">Luxury Villa</option>
                <option value="heritage_room">Heritage Stay</option>
                <option value="beach_hut">Beachfront Hut</option>
                <option value="apartment">Modern Apartment</option>
                <option value="homestay">Goan Homestay</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Location (Goa)</label>
              <select id="input-location" class="form-select">
                <option value="Anjuna">Anjuna (Premium Tier)</option>
                <option value="Vagator">Vagator (Premium Tier)</option>
                <option value="Assagao">Assagao (Premium Tier)</option>
                <option value="Fontainhas">Fontainhas (Premium Tier)</option>
                <option value="Calangute">Calangute (Mid Tier)</option>
                <option value="Candolim">Candolim (Mid Tier)</option>
                <option value="Morjim">Morjim (Mid Tier)</option>
                <option value="Palolem">Palolem (Budget Tier)</option>
                <option value="Agonda">Agonda (Budget Tier)</option>
                <option value="Arambol">Arambol (Budget Tier)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
            <div class="form-group">
              <label class="form-label">Bedrooms</label>
              <input type="number" id="input-bedrooms" class="form-input" value="2" min="1" max="10" />
            </div>

            <div class="form-group">
              <label class="form-label">Target Check-In Date</label>
              <input type="date" id="input-check-in" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Key Amenities & USPs</label>
            <div class="amenities-grid">
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="pool" checked />
                <span>🏊 Private Pool</span>
              </label>
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="ac" checked />
                <span>❄️ Full AC</span>
              </label>
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="wifi" checked />
                <span>📶 High-Speed WiFi</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="sea_view" />
                <span>🌊 Sea View</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="kitchen" />
                <span>🍳 Kitchen</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="breakfast" />
                <span>☕ Breakfast</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="parking" />
                <span>🚗 Parking</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="garden" />
                <span>🌿 Garden</span>
              </label>
            </div>
          </div>

          <button id="btn-calculate-price" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem;">
            <span>⚡ Calculate Optimal Rate</span>
          </button>
        </div>

        <!-- Right: Real-time Calculation Result -->
        <div id="pricing-results-container">
          <div class="glass-card" style="text-align: center; padding: 3.5rem;">
            <div style="font-size: 2.8rem; margin-bottom: 1rem;">🌴</div>
            <div style="font-size: 1.2rem; font-weight: 700; color: #0f172a;">Ready to optimize pricing</div>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">Select your parameters or pick an existing property and click "Calculate Optimal Rate".</p>
          </div>
        </div>
      </div>
    `;

    // Setup date default (today)
    const todayStr = new Date().toISOString().split('T')[0];
    const checkInInput = container.querySelector('#input-check-in') as HTMLInputElement;
    if (checkInInput) checkInInput.value = todayStr;

    // Checkbox toggling styling
    container.querySelectorAll('.amenity-chip-label input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) {
          target.closest('.amenity-chip-label')?.classList.add('checked');
        } else {
          target.closest('.amenity-chip-label')?.classList.remove('checked');
        }
      });
    });

    // Preset selector
    const presetSelect = container.querySelector('#preset-property-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      const propId = Number(presetSelect.value);
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        (container.querySelector('#input-base-rate') as HTMLInputElement).value = String(prop.base_rate);
        (container.querySelector('#input-prop-type') as HTMLSelectElement).value = prop.property_type;
        (container.querySelector('#input-location') as HTMLSelectElement).value = prop.location;
        (container.querySelector('#input-bedrooms') as HTMLInputElement).value = String(prop.bedrooms);

        container.querySelectorAll('.amenity-chip-label input').forEach(input => {
          const chk = input as HTMLInputElement;
          const isIncluded = prop.amenities.includes(chk.value);
          chk.checked = isIncluded;
          if (isIncluded) {
            chk.closest('.amenity-chip-label')?.classList.add('checked');
          } else {
            chk.closest('.amenity-chip-label')?.classList.remove('checked');
          }
        });

        // Trigger calculation
        doCalculate();
      }
    });

    // Calculate action
    const btnCalc = container.querySelector('#btn-calculate-price') as HTMLButtonElement;
    btnCalc?.addEventListener('click', doCalculate);

    async function doCalculate() {
      const resultsContainer = container.querySelector('#pricing-results-container') as HTMLElement;
      resultsContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 3.5rem;">
          <div class="status-dot" style="margin: 0 auto 1rem; width: 16px; height: 16px;"></div>
          <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">Analyzing Goa Market Trends & Factors with Claude AI...</div>
        </div>
      `;

      const baseRate = Number((container.querySelector('#input-base-rate') as HTMLInputElement).value) || 4500;
      const propertyType = (container.querySelector('#input-prop-type') as HTMLSelectElement).value;
      const location = (container.querySelector('#input-location') as HTMLSelectElement).value;
      const bedrooms = Number((container.querySelector('#input-bedrooms') as HTMLInputElement).value) || 1;
      const checkIn = (container.querySelector('#input-check-in') as HTMLInputElement).value;

      const amenities: string[] = [];
      container.querySelectorAll('.amenity-chip-label input:checked').forEach(inp => {
        amenities.push((inp as HTMLInputElement).value);
      });

      try {
        const result: PricingResult = await api.calculatePricing({
          baseRate,
          propertyType,
          location,
          bedrooms,
          amenities,
          checkIn
        });

        renderPricingResult(resultsContainer, result, {
          propertyId: Number(presetSelect.value) || undefined,
          propertyType,
          location,
          bedrooms,
          amenities,
          checkIn
        });
      } catch (err) {
        resultsContainer.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 2rem;">
            <div style="color: #e11d48; font-weight: 700;">Calculation Error</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${(err as Error).message}</p>
          </div>
        `;
      }
    }

    function renderPricingResult(target: HTMLElement, result: PricingResult, params: any) {
      target.innerHTML = `
        <!-- Hero Price Box -->
        <div class="pricing-result-hero">
          <div style="font-size: 0.88rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0284c7; margin-bottom: 0.35rem;">
            Recommended Nightly Rate
          </div>
          <div class="rate-badge-lg">₹${result.mid.toLocaleString('en-IN')}</div>
          <div class="rate-range-pill">
            <span style="color: var(--text-muted); font-weight: 500;">Floor: <strong style="color: #0f172a;">₹${result.low.toLocaleString('en-IN')}</strong></span>
            <span style="color: #d6cebf;">|</span>
            <span style="color: var(--text-muted); font-weight: 500;">Ceiling: <strong style="color: #0f172a;">₹${result.high.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        <!-- Factor Breakdown -->
        <div class="glass-card" style="margin-bottom: 1.5rem;">
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem;">
            Pricing Adjustment Breakdown
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${result.factors.map(f => {
              const badgeClass = f.direction === 'up' ? 'factor-up' : f.direction === 'down' ? 'factor-down' : f.direction === 'base' ? 'factor-base' : 'factor-neutral';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.95rem; background: #faf8f5; border: 1px solid #f1ede4; border-radius: var(--radius-sm);">
                  <span style="font-size: 0.92rem; font-weight: 600; color: var(--text-primary);">${f.factor}</span>
                  <span class="factor-impact-badge ${badgeClass}">${f.impact}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- AI Strategic Advice -->
          <div class="ai-advice-box">
            <div class="ai-sparkle-icon">💡</div>
            <div class="ai-advice-text">
              <strong>Goa Host Advisor:</strong> ${result.explanation}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
            <button id="btn-save-pricing-log" class="btn btn-secondary btn-sm">
              <span>💾 Save Recommendation to History</span>
            </button>
          </div>
        </div>

        <!-- Market Comparables -->
        <div class="glass-card">
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem;">
            Goa Market Benchmark Comparables
          </h4>
          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Stay</th>
                  <th>Location</th>
                  <th>Rate</th>
                  <th>Rating</th>
                  <th>Occupancy</th>
                </tr>
              </thead>
              <tbody>
                ${result.comparables.map(c => `
                  <tr>
                    <td style="font-weight: 700;">${c.name}</td>
                    <td style="font-weight: 500;">${c.location}</td>
                    <td style="font-family: var(--font-mono); font-weight: 800; color: #0284c7;">₹${c.rate.toLocaleString('en-IN')}</td>
                    <td style="font-weight: 600;">⭐ ${c.rating}</td>
                    <td>
                      <span style="font-weight: 700; color: ${c.occupancy >= 0.75 ? '#047857' : '#b45309'};">
                        ${Math.round(c.occupancy * 100)}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      target.querySelector('#btn-save-pricing-log')?.addEventListener('click', async () => {
        const propId = params.propertyId || (properties[0] ? properties[0].id : 1);
        try {
          await api.savePricingLog({
            property_id: propId,
            suggested_low: result.low,
            suggested_mid: result.mid,
            suggested_high: result.high,
            factors: result.factors,
            explanation: result.explanation,
            date_range_start: params.checkIn || undefined
          });
          showToast('Pricing recommendation logged successfully!', 'success');
        } catch (e) {
          showToast('Could not save log: ' + (e as Error).message, 'error');
        }
      });
    }

    // Auto-run initial calculation
    doCalculate();

  } catch (error) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 3rem;">
        <div style="color: #e11d48;">Could not load pricing engine: ${(error as Error).message}</div>
      </div>
    `;
  }
}
