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
          <p class="section-desc">Generate high-converting Airbnb titles, experiential descriptions, SEO tags, and audit photography staging quality.</p>
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
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: #0f172a;">Property Details</h3>
            <select id="listing-preset-select" class="form-select" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;">
              <option value="">⚡ Load Listing...</option>
              ${properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Property Title / Name</label>
            <input type="text" id="listing-input-name" class="form-input" value="Casa Azul Pool Villa" placeholder="e.g. Casa Azul Villa" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Property Type</label>
              <select id="listing-input-type" class="form-select">
                <option value="villa">Luxury Villa</option>
                <option value="chalet">Mountain Chalet / Cabin</option>
                <option value="heritage_room">Heritage Stay / Haveli</option>
                <option value="beach_hut">Beachfront Stay</option>
                <option value="apartment">Modern Apartment / Penthouse</option>
                <option value="homestay">Farmstay / Homestay</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Destination / Location</label>
              <input type="text" id="listing-input-location" class="form-input" value="Anjuna, Goa" list="listing-loc-presets" placeholder="e.g. Manali, Bandra, Jaipur, Bali" />
              <datalist id="listing-loc-presets">
                <option value="Anjuna, Goa">
                <option value="Old Manali, Himachal">
                <option value="Old City, Jaipur">
                <option value="Bandra West, Mumbai">
                <option value="Udaipur, Rajasthan">
                <option value="Coorg, Karnataka">
                <option value="Rishikesh, Uttarakhand">
                <option value="Alibaug, Maharashtra">
                <option value="Seminyak, Bali">
                <option value="Downtown Dubai">
              </datalist>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Bedrooms</label>
              <input type="number" id="listing-input-beds" class="form-input" value="2" min="1" max="15" />
            </div>
            <div class="form-group">
              <label class="form-label">Bathrooms</label>
              <input type="number" id="listing-input-baths" class="form-input" value="2" min="1" max="15" />
            </div>
            <div class="form-group">
              <label class="form-label">Max Guests</label>
              <input type="number" id="listing-input-guests" class="form-input" value="6" min="1" max="30" />
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
                <input type="checkbox" value="mountain_view" />
                <span>🏔️ Mountain View</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="sea_view" />
                <span>🌊 Sea View</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="fireplace" />
                <span>🔥 Fireplace</span>
              </label>
              <label class="amenity-chip-label">
                <input type="checkbox" value="breakfast" />
                <span>☕ Breakfast</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Host Notes / Unique Features</label>
            <textarea id="listing-input-notes" class="form-textarea" placeholder="e.g. 5 min walk to attractions, private sunset deck, artisan decor...">Private pool with tropical garden, quiet residential enclave close to local dining and cafes.</textarea>
          </div>

          <button id="btn-generate-copy" class="btn btn-primary" style="width: 100%;">
            <span>✨ Generate AI Listing Copy</span>
          </button>
        </div>

        <!-- Right: Generated Output -->
        <div id="listing-output-container">
          <div class="glass-card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">✍️</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">AI Copy Assistant Ready</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Click "Generate AI Listing Copy" to craft catchy titles, sensory descriptions, and high-ranking search tags.</p>
          </div>
        </div>
      </div>

      <!-- Section 2: Photo & Staging Auditor (Hidden by default) -->
      <div id="section-photo-auditor" style="display: none; grid-template-columns: 1fr 1fr; gap: 1.75rem; align-items: start;">
        <div class="glass-card">
          <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">Listing Photo Review</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">Select a property photo or paste an image URL to receive automated architectural lighting, staging, and composition ratings.</p>

          <div class="form-group">
            <label class="form-label">Sample Staging Photo</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
              <img src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80" class="sample-photo-thumb active" data-url="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" style="width: 100%; height: 75px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; border: 2px solid #0284c7;" />
              <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80" class="sample-photo-thumb" data-url="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80" style="width: 100%; height: 75px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; border: 2px solid transparent;" />
              <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80" class="sample-photo-thumb" data-url="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80" style="width: 100%; height: 75px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; border: 2px solid transparent;" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input type="text" id="photo-input-url" class="form-input" value="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" />
          </div>

          <div id="photo-preview-box" style="margin-bottom: 1.25rem; border-radius: var(--radius-md); overflow: hidden; max-height: 220px;">
            <img id="photo-preview-img" src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>

          <button id="btn-audit-photo" class="btn btn-emerald" style="width: 100%;">
            <span>🔍 Audit Photo Staging Quality</span>
          </button>
        </div>

        <div id="photo-assessment-container">
          <div class="glass-card" style="text-align: center; padding: 3rem;">
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">📷</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">Photo Auditor Ready</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Click "Audit Photo Staging Quality" to evaluate architectural lighting, symmetry, and guest conversion readiness.</p>
          </div>
        </div>
      </div>
    `;

    // Tab switcher
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
      secCopy.style.display = 'none';
      secPhoto.style.display = 'grid';
      doAuditPhoto();
    });

    // Preset selector
    const presetSelect = container.querySelector('#listing-preset-select') as HTMLSelectElement;
    presetSelect?.addEventListener('change', () => {
      const propId = Number(presetSelect.value);
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        (container.querySelector('#listing-input-name') as HTMLInputElement).value = prop.name;
        (container.querySelector('#listing-input-type') as HTMLSelectElement).value = prop.property_type;
        (container.querySelector('#listing-input-location') as HTMLInputElement).value = prop.location;
        (container.querySelector('#listing-input-beds') as HTMLInputElement).value = String(prop.bedrooms);
        (container.querySelector('#listing-input-baths') as HTMLInputElement).value = String(prop.bathrooms);
        (container.querySelector('#listing-input-guests') as HTMLInputElement).value = String(prop.max_guests);
        (container.querySelector('#listing-input-notes') as HTMLTextAreaElement).value = prop.description;

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

    // Generate Copy Action
    const btnGenCopy = container.querySelector('#btn-generate-copy') as HTMLButtonElement;
    btnGenCopy?.addEventListener('click', doGenerateCopy);

    async function doGenerateCopy() {
      const outContainer = container.querySelector('#listing-output-container') as HTMLElement;
      outContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 3rem;">
          <div class="status-dot" style="margin: 0 auto 1rem; width: 16px; height: 16px;"></div>
          <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">Writing High-Converting Listing Copy with AI...</div>
        </div>
      `;

      const name = (container.querySelector('#listing-input-name') as HTMLInputElement).value;
      const propertyType = (container.querySelector('#listing-input-type') as HTMLSelectElement).value;
      const location = (container.querySelector('#listing-input-location') as HTMLInputElement).value || 'Vacation Destination';
      const bedrooms = Number((container.querySelector('#listing-input-beds') as HTMLInputElement).value) || 2;
      const bathrooms = Number((container.querySelector('#listing-input-baths') as HTMLInputElement).value) || 2;
      const maxGuests = Number((container.querySelector('#listing-input-guests') as HTMLInputElement).value) || 4;
      const description = (container.querySelector('#listing-input-notes') as HTMLTextAreaElement).value;

      const amenities: string[] = [];
      container.querySelectorAll('.amenity-chip-label input:checked').forEach(inp => {
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
            <div style="color: #e11d48; font-weight: 700;">Generation Error</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${(err as Error).message}</p>
          </div>
        `;
      }
    }

    function renderListingOutput(target: HTMLElement, result: ListingResult) {
      target.innerHTML = `
        <div class="glass-card" style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a;">
              ✨ Catchy Listing Headlines (3 Variations)
            </h4>
            <span style="font-size: 0.75rem; color: #0284c7; font-weight: 700; text-transform: uppercase;">Click to Copy</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${result.titles.map((title, i) => `
              <div class="title-option-box" data-copy="${title.replace(/"/g, '&quot;')}">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
                  <div>
                    <span style="font-size: 0.72rem; font-weight: 800; color: #0284c7; text-transform: uppercase;">Option ${i + 1}</span>
                    <div style="font-weight: 700; color: var(--text-primary); margin-top: 0.2rem; font-size: 0.95rem;">${title}</div>
                  </div>
                  <button class="btn-copy-mini" title="Copy to Clipboard">📋</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="glass-card" style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a;">
              📖 Compelling Listing Description
            </h4>
            <button id="btn-copy-desc" class="btn btn-secondary btn-sm" style="font-size: 0.78rem;">📋 Copy Text</button>
          </div>
          <div style="background: #faf8f5; border: 1px solid #f1ede4; border-radius: var(--radius-md); padding: 1.2rem; font-size: 0.9rem; line-height: 1.65; color: var(--text-primary); white-space: pre-line;">
            ${result.description}
          </div>
        </div>

        <div class="glass-card">
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
            🏷️ Search Engine & Channel Tags
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;">
            ${result.tags.map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>

          <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-bottom: 0.6rem;">
            ⭐ Signature Property Highlights
          </h4>
          <ul style="padding-left: 1.2rem; font-size: 0.88rem; color: var(--text-primary); display: flex; flex-direction: column; gap: 0.4rem;">
            ${result.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `;

      target.querySelectorAll('.title-option-box').forEach(box => {
        box.addEventListener('click', () => {
          const text = box.getAttribute('data-copy') || '';
          navigator.clipboard.writeText(text);
          showToast('Headline copied to clipboard!', 'success');
        });
      });

      target.querySelector('#btn-copy-desc')?.addEventListener('click', () => {
        navigator.clipboard.writeText(result.description);
        showToast('Full description copied to clipboard!', 'success');
      });
    }

    // Photo Auditor thumbnail selection
    const photoThumbs = container.querySelectorAll('.sample-photo-thumb');
    const photoInput = container.querySelector('#photo-input-url') as HTMLInputElement;
    const photoPreviewImg = container.querySelector('#photo-preview-img') as HTMLImageElement;

    photoThumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        photoThumbs.forEach(t => {
          (t as HTMLElement).style.borderColor = 'transparent';
          t.classList.remove('active');
        });
        (thumb as HTMLElement).style.borderColor = '#0284c7';
        thumb.classList.add('active');
        const url = thumb.getAttribute('data-url') || '';
        photoInput.value = url;
        photoPreviewImg.src = url;
        doAuditPhoto();
      });
    });

    photoInput?.addEventListener('input', () => {
      photoPreviewImg.src = photoInput.value;
    });

    const btnAudit = container.querySelector('#btn-audit-photo') as HTMLButtonElement;
    btnAudit?.addEventListener('click', doAuditPhoto);

    async function doAuditPhoto() {
      const assessmentContainer = container.querySelector('#photo-assessment-container') as HTMLElement;
      if (!assessmentContainer) return;

      assessmentContainer.innerHTML = `
        <div class="glass-card" style="text-align: center; padding: 3rem;">
          <div class="status-dot" style="margin: 0 auto 1rem; width: 16px; height: 16px;"></div>
          <div style="font-weight: 700; font-size: 1.05rem; color: #0f172a;">Auditing Staging & Architectural Lighting...</div>
        </div>
      `;

      const imageUrl = photoInput.value;

      try {
        const assessment: ImageAssessment = await api.assessImage(imageUrl);
        renderPhotoAssessment(assessmentContainer, assessment);
      } catch (err) {
        assessmentContainer.innerHTML = `
          <div class="glass-card" style="text-align: center; padding: 2rem;">
            <div style="color: #e11d48; font-weight: 700;">Audit Error</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${(err as Error).message}</p>
          </div>
        `;
      }
    }

    function renderPhotoAssessment(target: HTMLElement, a: ImageAssessment) {
      target.innerHTML = `
        <div class="glass-card" style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <span style="font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Quality Rating</span>
              <h3 style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: #0f172a;">Overall Score: ${a.score}/10</h3>
            </div>
            <div style="font-size: 2.2rem; font-weight: 800; color: #059669; font-family: var(--font-mono);">${a.score >= 8.5 ? '🏆 A+' : a.score >= 7.5 ? '⭐ A' : '👍 B'}</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1.25rem;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">
                <span style="color: var(--text-primary);">Natural & Ambient Lighting</span>
                <span style="color: #0284c7; font-family: var(--font-mono);">${a.lighting}/10</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${(a.lighting / 10) * 100}%; background: #0284c7;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">
                <span style="color: var(--text-primary);">Architectural Composition & Depth</span>
                <span style="color: #7c3aed; font-family: var(--font-mono);">${a.composition}/10</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${(a.composition / 10) * 100}%; background: #7c3aed;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem;">
                <span style="color: var(--text-primary);">Decluttering & Clean Staging</span>
                <span style="color: #059669; font-family: var(--font-mono);">${a.cleanliness}/10</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${(a.cleanliness / 10) * 100}%; background: #059669;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <div class="ai-advice-box" style="margin-bottom: 1.25rem;">
            <div class="ai-sparkle-icon">📸</div>
            <div class="ai-advice-text">
              <strong>Visual Expert Feedback:</strong> ${a.feedback}
            </div>
          </div>

          <h4 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
            💡 High-Conversion Staging Tips
          </h4>
          <ul style="padding-left: 1.2rem; font-size: 0.88rem; color: var(--text-primary); display: flex; flex-direction: column; gap: 0.5rem;">
            ${a.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Auto generate copy on load
    doGenerateCopy();

  } catch (error) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 3rem;">
        <div style="color: #e11d48;">Could not load listing optimizer: ${(error as Error).message}</div>
      </div>
    `;
  }
}
