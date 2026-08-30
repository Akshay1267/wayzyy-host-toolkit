import { api } from '../api';
import type { ListingResult, ImageAssessment } from '../types';

export async function renderListingOptimizer(container: HTMLElement, showToast: (msg: string, type?: 'success' | 'error') => void) {
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
          <h1 class="section-title">AI Listing Copy & Staging Optimizer</h1>
          <p class="section-desc">Generate high-converting Airbnb titles, experiential descriptions, Goa search tags, and audit photography quality.</p>
        </div>
      </div>

      <!-- Navigation Tabs inside Listing Tool -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
        <button id="tab-btn-copy" class="btn btn-primary btn-sm">✍️ AI Copy Generator</button>
        <button id="tab-btn-photo" class="btn btn-secondary btn-sm">📷 Photo & Staging Auditor</button>
      </div>

      <!-- Section 1: AI Copy Generator -->
      <div id="section-copy-generator" style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 1.75rem; align-items: start;">
        <!-- Left: Form -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;">Property Details</h3>
            <select id="listing-preset-select" class="form-select" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem;">
              <option value="">⚡ Load Listing...</option>
              ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Property Title / Name</label>
            <input type="text" id="listing-input-name" class="form-input" value="Casa Azul" placeholder="e.g. Casa Azul Villa" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Property Type</label>
              <select id="listing-input-type" class="form-select">
                <option value="villa">Luxury Villa</option>
                <option value="heritage_room">Heritage Stay</option>
                <option value="beach_hut">Beachfront Hut</option>
                <option value="apartment">Apartment</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Location (Goa)</label>
              <select id="listing-input-location" class="form-select">
                <option value="Anjuna">Anjuna</option>
                <option value="Fontainhas">Fontainhas (Panaji)</option>
                <option value="Palolem">Palolem</option>
                <option value="Vagator">Vagator</option>
                <option value="Assagao">Assagao</option>
                <option value="Morjim">Morjim</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Bedrooms</label>
              <input type="number" id="listing-input-beds" class="form-input" value="2" min="1" max="10" />
            </div>
            <div class="form-group">
              <label class="form-label">Bathrooms</label>
              <input type="number" id="listing-input-baths" class="form-input" value="2" min="1" max="10" />
            </div>
            <div class="form-group">
              <label class="form-label">Max Guests</label>
              <input type="number" id="listing-input-guests" class="form-input" value="6" min="1" max="20" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Featured Amenities</label>
            <div class="amenities-grid">
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="pool" checked />
                <span>🏊 Pool</span>
              </label>
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="ac" checked />
                <span>❄️ AC</span>
              </label>
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="wifi" checked />
                <span>📶 WiFi</span>
              </label>
              <label class="amenity-chip-label checked">
                <input type="checkbox" value="kitchen" checked />
                <span>🍳 Kitchen</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="sea_view" />
                <span>🌊 Sea View</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="breakfast" />
                <span>☕ Breakfast</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Host Notes / Special Features</label>
            <textarea id="listing-input-notes" class="form-textarea" placeholder="e.g. 5 min walk to beach, sunset deck, Portuguese antique decor...">Portuguese architecture with private pool in Anjuna center, peaceful cul-de-sac.</textarea>
          </div>

          <button id="btn-generate-copy" class="btn btn-primary" style="width: 100%;">
            <span>✨ Generate AI Listing Copy</span>
          </button>
        </div>

        <!-- Right: Generated Output -->
        <div id="listing-output-container">
          <div class="glass-card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">✍️</div>
            <div style="font-size: 1.1rem; font-weight: 600;">AI Copy Assistant Ready</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Click "Generate AI Listing Copy" to craft catchy titles, descriptions, and tags tailored for Goan holidaymakers.</p>
          </div>
        </div>
      </div>

      <!-- Section 2: Photo & Staging Auditor (Hidden by default) -->
      <div id="section-photo-auditor" style="display: none; grid-template-columns: 1fr 1fr; gap: 1.75rem; align-items: start;">
        <div class="glass-card">
          <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">Listing Photo Review</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Select a property photo or paste an image URL to receive automated architectural lighting, staging, and composition ratings.</p>

          <div class="form-group">
            <label class="form-label">Select Demo Photo</label>
            <select id="photo-preset-select" class="form-select">
              <option value="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80">Casa Azul — Pool & Sun Deck</option>
              <option value="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80">Pinto's — Fontainhas Heritage Room</option>
              <option value="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80">Sunset Shack — Palolem Beach View</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Or Custom Image URL</label>
            <input type="text" id="custom-photo-url" class="form-input" placeholder="https://..." />
          </div>

          <div style="border-radius: var(--radius-md); overflow: hidden; height: 240px; background: #000; margin-bottom: 1.25rem;">
            <img id="photo-preview-img" src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview" />
          </div>

          <button id="btn-audit-photo" class="btn btn-emerald" style="width: 100%;">
            <span>🔍 Analyze Photo Quality & Staging</span>
          </button>
        </div>

        <div id="photo-audit-results">
          <div class="glass-card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">📸</div>
            <div style="font-size: 1.1rem; font-weight: 600;">Staging Auditor Ready</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Click "Analyze Photo Quality" to receive expert scoring and staging recommendations.</p>
          </div>
        </div>
      </div>
    `;

    // Sub-tab toggling
    const tabCopy = container.querySelector('#tab-btn-copy') as HTMLButtonElement;
    const tabPhoto = container.querySelector('#tab-btn-photo') as HTMLButtonElement;
    const secCopy = container.querySelector('#section-copy-generator') as HTMLElement;
    const secPhoto = container.querySelector('#section-photo-auditor') as HTMLElement;

    tabCopy?.addEventListener('click', () => {
      tabCopy.className = 'btn btn-primary btn-sm';
      tabPhoto.className = 'btn btn-secondary btn-sm';
      secCopy.style.display = 'grid';
      secPhoto.style.display = 'none';
    });

    tabPhoto?.addEventListener('click', () => {
      tabPhoto.className = 'btn btn-primary btn-sm';
      tabCopy.className = 'btn btn-secondary btn-sm';
      secPhoto.style.display = 'grid';
      secPhoto.style.display = 'none';
    });

    // Preset selector
    const presetSelect = container.querySelector('#listing-preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      const propId = Number(presetSelect.value);
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        (container.querySelector('#listing-input-name') as HTMLInputElement).value = prop.name;
        (container.querySelector('#listing-input-type') as HTMLSelectElement).value = prop.property_type;
        (container.querySelector('#listing-input-location') as HTMLSelectElement).value = prop.location;
        (container.querySelector('#listing-input-beds') as HTMLInputElement).value = String(prop.bedrooms);
        (container.querySelector('#listing-input-baths') as HTMLInputElement).value = String(prop.bathrooms);
        (container.querySelector('#listing-input-guests') as HTMLInputElement).value = String(prop.max_guests);
        (container.querySelector('#listing-input-notes') as HTMLTextAreaElement).value = prop.description;

        container.querySelectorAll('#section-copy-generator .amenity-chip-label input').forEach(input => {
          const chk = input as HTMLInputElement;
          const isIncluded = prop.amenities.includes(chk.value);
          chk.checked = isIncluded;
          if (isIncluded) {
            chk.closest('.amenity-chip-label')?.classList.add('checked');
          } else {
            chk.closest('.amenity-chip-label')?.classList.remove('checked');
          }
        });
      }
    });

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

    // Copy generator trigger
    const btnGenCopy = container.querySelector('#btn-generate-copy') as HTMLButtonElement;
    btnGenCopy?.addEventListener('click', generateCopy);

    async function generateCopy() {
      const outContainer = container.querySelector('#listing-output-container') as HTMLElement;
      outContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 3rem;">
          <div class="status-dot" style="margin: 0 auto 1rem; width: 14px; height: 14px;"></div>
          <div style="font-weight: 600;">Writing High-Converting Goan Listing Copy...</div>
        </div>
      `;

      const name = (container.querySelector('#listing-input-name') as HTMLInputElement).value;
      const propertyType = (container.querySelector('#listing-input-type') as HTMLSelectElement).value;
      const location = (container.querySelector('#listing-input-location') as HTMLSelectElement).value;
      const bedrooms = Number((container.querySelector('#listing-input-beds') as HTMLInputElement).value);
      const bathrooms = Number((container.querySelector('#listing-input-baths') as HTMLInputElement).value);
      const maxGuests = Number((container.querySelector('#listing-input-guests') as HTMLInputElement).value);
      const description = (container.querySelector('#listing-input-notes') as HTMLTextAreaElement).value;

      const amenities: string[] = [];
      container.querySelectorAll('#section-copy-generator .amenity-chip-label input:checked').forEach(inp => {
        amenities.push((inp as HTMLInputElement).value);
      });

      try {
        const result: ListingResult = await api.generateListing({
          name,
          propertyType,
          location,
          bedrooms,
          bathrooms,
          maxGuests,
          amenities,
          description
        });

        renderListingOutput(outContainer, result);
      } catch (err) {
        outContainer.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 2rem;">
            <div style="color: #fb7185; font-weight: 600;">Copy Generation Error</div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">${(err as Error).message}</p>
          </div>
        `;
      }
    }

    function renderListingOutput(target: HTMLElement, result: ListingResult) {
      target.innerHTML = `
        <!-- High-Converting Titles -->
        <div class="glass-card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: #38bdf8;">
              Catchy Listing Titles (Select & Copy)
            </h4>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${result.titles.map((title) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${title}</span>
                <button class="btn btn-secondary btn-sm copy-btn" data-copy="${encodeURIComponent(title)}" style="font-size: 0.75rem;">📋 Copy</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Description -->
        <div class="glass-card" style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
            <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: #34d399;">
              Sensory Storytelling Description
            </h4>
            <button class="btn btn-secondary btn-sm copy-btn" data-copy="${encodeURIComponent(result.description)}">📋 Copy Description</button>
          </div>
          <div style="font-size: 0.88rem; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; background: rgba(0, 0, 0, 0.25); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            ${result.description}
          </div>
        </div>

        <!-- Tags and Highlights -->
        <div class="glass-card">
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h5 style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">Search & SEO Tags</h5>
              <button class="btn btn-secondary btn-sm copy-btn" data-copy="${encodeURIComponent(result.tags.map(t => '#' + t).join(' '))}" style="font-size: 0.75rem;">📋 Copy Tags</button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.45rem;">
              ${result.tags.map(tag => `
                <span style="font-size: 0.75rem; padding: 0.25rem 0.65rem; background: rgba(14, 165, 233, 0.12); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.25); border-radius: var(--radius-full);">
                  #${tag}
                </span>
              `).join('')}
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.85rem;">
            <h5 style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); margin-bottom: 0.5rem;">Top Selling Highlights</h5>
            <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem;">
              ${result.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;

      target.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const text = decodeURIComponent((btn as HTMLElement).dataset.copy || '');
          navigator.clipboard.writeText(text);
          showToast('Copied to clipboard!', 'success');
        });
      });
    }

    // Photo audit events
    const photoSelect = container.querySelector('#photo-preset-select') as HTMLSelectElement;
    const photoCustom = container.querySelector('#custom-photo-url') as HTMLInputElement;
    const photoPreview = container.querySelector('#photo-preview-img') as HTMLImageElement;

    photoSelect?.addEventListener('change', () => {
      photoPreview.src = photoSelect.value;
    });

    photoCustom?.addEventListener('input', () => {
      if (photoCustom.value.trim().startsWith('http')) {
        photoPreview.src = photoCustom.value.trim();
      }
    });

    const btnAudit = container.querySelector('#btn-audit-photo') as HTMLButtonElement;
    btnAudit?.addEventListener('click', async () => {
      const resultsDiv = container.querySelector('#photo-audit-results') as HTMLElement;
      resultsDiv.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 3rem;">
          <div class="status-dot" style="margin: 0 auto 1rem; width: 14px; height: 14px;"></div>
          <div style="font-weight: 600;">Auditing Photography Lighting & Staging...</div>
        </div>
      `;

      try {
        const assessment: ImageAssessment = await api.assessImage(photoPreview.src);

        resultsDiv.innerHTML = `
          <div class="glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <div>
                <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;">Photo Staging Scorecard</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Evaluated for luxury Airbnb conversion</p>
              </div>
              <div style="font-family: var(--font-heading); font-size: 2.2rem; font-weight: 800; color: #10b981;">
                ${assessment.score}<span style="font-size: 1rem; color: var(--text-muted);">/10</span>
              </div>
            </div>

            <!-- Score breakdown meters -->
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.25rem;">
                  <span>Lighting & Exposure</span>
                  <span style="color: #38bdf8;">${assessment.lighting}/10</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${assessment.lighting * 10}%;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.25rem;">
                  <span>Composition & Angle</span>
                  <span style="color: #38bdf8;">${assessment.composition}/10</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${assessment.composition * 10}%;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 0.25rem;">
                  <span>Cleanliness & Staging</span>
                  <span style="color: #10b981;">${assessment.cleanliness}/10</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${assessment.cleanliness * 10}%;"></div>
                </div>
              </div>
            </div>

            <!-- Feedback -->
            <div class="ai-advice-box" style="margin-bottom: 1.25rem;">
              <div class="ai-sparkle-icon">📷</div>
              <div class="ai-advice-text">
                ${assessment.feedback}
              </div>
            </div>

            <!-- Actionable Tips -->
            <div>
              <h5 style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Actionable Photography Tips</h5>
              <ul style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.4rem;">
                ${assessment.tips.map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;
      } catch (err) {
        resultsDiv.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 2rem;">
            <div style="color: #fb7185; font-weight: 600;">Image Audit Error</div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">${(err as Error).message}</p>
          </div>
        `;
      }
    });

    // Run initial copy generation
    generateCopy();

  } catch (error) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 3rem;">
        <div style="color: #fb7185;">Could not load listing optimizer: ${(error as Error).message}</div>
      </div>
    `;
  }
}
