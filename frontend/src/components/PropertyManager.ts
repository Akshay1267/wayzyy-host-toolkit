import { api } from '../api';
import type { Booking } from '../types';

export async function renderPropertyManager(container: HTMLElement, showToast: (msg: string, type?: 'success' | 'error') => void) {
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 3rem;">
      <div class="status-dot" style="width: 16px; height: 16px;"></div>
    </div>
  `;

  try {
    const [properties, bookings] = await Promise.all([
      api.getProperties(),
      api.getBookings()
    ]);

    let activeFilter = 'all';

    function renderView() {
      const filteredBookings = activeFilter === 'all'
        ? bookings
        : bookings.filter(b => b.status === activeFilter);

      container.innerHTML = `
        <div class="section-header">
          <div>
            <h1 class="section-title">Properties & Reservations</h1>
            <p class="section-desc">Manage your vacation rental listings, create direct WhatsApp bookings, and oversee calendar reservations.</p>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button id="btn-add-booking-modal" class="btn btn-emerald btn-sm">
              <span>➕ Add Direct Booking</span>
            </button>
            <button id="btn-add-prop-modal" class="btn btn-primary btn-sm">
              <span>🏡 Add New Listing</span>
            </button>
          </div>
        </div>

        <!-- Section 1: Property Cards Showcase -->
        <div style="margin-bottom: 2.5rem;">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">
            Active Listings (${properties.length})
          </h3>

          <div class="properties-grid">
            ${properties.map(p => {
              const imgUrl = p.image_urls[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80';
              return `
                <div class="property-card">
                  <div class="property-img-wrap">
                    <img class="property-img" src="${imgUrl}" alt="${p.name}" />
                    <span class="property-tier-tag">${p.location_tier} tier</span>
                  </div>

                  <div class="property-body">
                    <div class="property-name">${p.name}</div>
                    <div class="property-loc">📍 ${p.location} • ${p.bedrooms} BHK (${p.max_guests} Guests)</div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; height: 3.6em; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.75rem;">
                      ${p.description || 'Charming vacation holiday stay.'}
                    </p>

                    <!-- Amenities tags -->
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem;">
                      ${p.amenities.slice(0, 4).map(a => `
                        <span style="font-size: 0.7rem; padding: 0.15rem 0.45rem; background: rgba(255, 255, 255, 0.05); border-radius: var(--radius-sm); color: var(--text-muted);">
                          ${a}
                        </span>
                      `).join('')}
                      ${p.amenities.length > 4 ? `<span style="font-size: 0.7rem; color: var(--text-muted);">+${p.amenities.length - 4} more</span>` : ''}
                    </div>

                    <div class="property-rate-box">
                      <div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">Base Nightly Rate</div>
                        <div class="property-price">₹${p.base_rate.toLocaleString('en-IN')}</div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 0.72rem; color: var(--text-muted);">Total Revenue</div>
                        <div style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">₹${(p.total_revenue || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Section 2: Bookings Management -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Reservation Log & Status</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Manage upcoming check-ins and direct payment confirmations</p>
            </div>

            <!-- Filter Pills -->
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'} filter-pill" data-filter="all">All</button>
              <button class="btn btn-sm ${activeFilter === 'confirmed' ? 'btn-primary' : 'btn-secondary'} filter-pill" data-filter="confirmed">Confirmed</button>
              <button class="btn btn-sm ${activeFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} filter-pill" data-filter="pending">Pending</button>
              <button class="btn btn-sm ${activeFilter === 'completed' ? 'btn-primary' : 'btn-secondary'} filter-pill" data-filter="completed">Completed</button>
            </div>
          </div>

          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest Details</th>
                  <th>Property</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Nightly</th>
                  <th>Total Amount</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredBookings.map((b: Booking) => `
                  <tr>
                    <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">#${b.id}</td>
                    <td>
                      <div style="font-weight: 600;">${b.guest_name}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${b.guest_phone || 'N/A'}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: #38bdf8;">${b.property_name || 'Listing #' + b.property_id}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${b.location || 'Goa'}</div>
                    </td>
                    <td>
                      <div style="font-family: var(--font-mono); font-size: 0.82rem;">${b.check_in}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">to ${b.check_out}</div>
                    </td>
                    <td>${b.guests}</td>
                    <td style="font-family: var(--font-mono); font-size: 0.82rem;">₹${b.nightly_rate.toLocaleString('en-IN')}</td>
                    <td style="font-family: var(--font-mono); font-weight: 700; color: #10b981;">₹${b.total_amount.toLocaleString('en-IN')}</td>
                    <td>
                      <span style="font-size: 0.75rem; font-weight: 600;">
                        ${b.source === 'whatsapp' ? '💬 WhatsApp' : b.source === 'direct' ? '⚡ Direct' : '🌐 OTA'}
                      </span>
                    </td>
                    <td>
                      <span class="badge-status badge-${b.status}">${b.status}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        ${b.status === 'pending' ? `
                          <button class="btn btn-secondary btn-sm action-confirm-btn" data-id="${b.id}" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: #34d399;">✓ Confirm</button>
                        ` : ''}
                        ${b.status === 'confirmed' ? `
                          <button class="btn btn-secondary btn-sm action-complete-btn" data-id="${b.id}" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: #38bdf8;">Done</button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm action-delete-btn" data-id="${b.id}" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: #fb7185;">✕</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modals Container -->
        <div id="modals-placeholder"></div>
      `;

      // Filter events
      container.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          activeFilter = (btn as HTMLElement).dataset.filter || 'all';
          renderView();
        });
      });

      // Actions in table
      container.querySelectorAll('.action-confirm-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number((btn as HTMLElement).dataset.id);
          await api.updateBookingStatus(id, 'confirmed');
          showToast('Booking confirmed!', 'success');
          renderPropertyManager(container, showToast);
        });
      });

      container.querySelectorAll('.action-complete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number((btn as HTMLElement).dataset.id);
          await api.updateBookingStatus(id, 'completed');
          showToast('Booking marked completed!', 'success');
          renderPropertyManager(container, showToast);
        });
      });

      container.querySelectorAll('.action-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this reservation?')) {
            const id = Number((btn as HTMLElement).dataset.id);
            await api.deleteBooking(id);
            showToast('Booking deleted', 'success');
            renderPropertyManager(container, showToast);
          }
        });
      });

      // Add Booking Modal
      container.querySelector('#btn-add-booking-modal')?.addEventListener('click', () => {
        openAddBookingModal();
      });

      // Add Property Modal
      container.querySelector('#btn-add-prop-modal')?.addEventListener('click', () => {
        openAddPropertyModal();
      });
    }

    function openAddBookingModal() {
      const modalHolder = container.querySelector('#modals-placeholder') as HTMLElement;
      modalHolder.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700;">Add Direct Reservation</h3>
              <button id="btn-close-modal" class="btn btn-secondary btn-sm">✕</button>
            </div>

            <form id="form-new-booking">
              <div class="form-group">
                <label class="form-label">Select Property *</label>
                <select id="modal-prop-id" class="form-select" required>
                  ${properties.map(p => `<option value="${p.id}">${p.name} (${p.location}) — ₹${p.base_rate}/nt</option>`).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Guest Name *</label>
                  <input type="text" id="modal-guest-name" class="form-input" placeholder="e.g. Rohan Das" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Guest WhatsApp/Phone</label>
                  <input type="text" id="modal-guest-phone" class="form-input" placeholder="+91 98..." />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Check-In Date *</label>
                  <input type="date" id="modal-checkin" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Check-Out Date *</label>
                  <input type="date" id="modal-checkout" class="form-input" required />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Guest Count</label>
                  <input type="number" id="modal-guests" class="form-input" value="2" min="1" max="20" />
                </div>
                <div class="form-group">
                  <label class="form-label">Booking Channel</label>
                  <select id="modal-source" class="form-select">
                    <option value="whatsapp">💬 WhatsApp Direct</option>
                    <option value="direct">⚡ Phone / Direct</option>
                    <option value="platform">🌐 Airbnb / OTA</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Special Notes</label>
                <textarea id="modal-notes" class="form-textarea" placeholder="e.g. Early check-in, dietary preferences, airport pickup"></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-emerald">Save Reservation</button>
              </div>
            </form>
          </div>
        </div>
      `;

      modalHolder.querySelector('#btn-close-modal')?.addEventListener('click', () => modalHolder.innerHTML = '');
      modalHolder.querySelector('#btn-cancel-modal')?.addEventListener('click', () => modalHolder.innerHTML = '');

      modalHolder.querySelector('#form-new-booking')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const propId = Number((modalHolder.querySelector('#modal-prop-id') as HTMLSelectElement).value);
        const guestName = (modalHolder.querySelector('#modal-guest-name') as HTMLInputElement).value;
        const guestPhone = (modalHolder.querySelector('#modal-guest-phone') as HTMLInputElement).value;
        const checkIn = (modalHolder.querySelector('#modal-checkin') as HTMLInputElement).value;
        const checkOut = (modalHolder.querySelector('#modal-checkout') as HTMLInputElement).value;
        const guests = Number((modalHolder.querySelector('#modal-guests') as HTMLInputElement).value);
        const source = (modalHolder.querySelector('#modal-source') as HTMLSelectElement).value as any;
        const notes = (modalHolder.querySelector('#modal-notes') as HTMLTextAreaElement).value;

        try {
          await api.createBooking({
            property_id: propId,
            guest_name: guestName,
            guest_phone: guestPhone,
            check_in: checkIn,
            check_out: checkOut,
            guests,
            source,
            notes,
            status: 'confirmed'
          });
          modalHolder.innerHTML = '';
          showToast('Direct reservation added successfully!', 'success');
          renderPropertyManager(container, showToast);
        } catch (err) {
          showToast('Error creating booking: ' + (err as Error).message, 'error');
        }
      });
    }

    function openAddPropertyModal() {
      const modalHolder = container.querySelector('#modals-placeholder') as HTMLElement;
      modalHolder.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
              <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: #0f172a;">Add New Vacation Listing</h3>
              <button id="btn-close-modal" class="btn btn-secondary btn-sm">✕</button>
            </div>

            <form id="form-new-prop">
              <div class="form-group">
                <label class="form-label">Property Name *</label>
                <input type="text" id="prop-name" class="form-input" placeholder="e.g. Cedar Peak Chalet" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Property Type</label>
                  <select id="prop-type" class="form-select">
                    <option value="villa">Luxury Villa</option>
                    <option value="chalet">Mountain Chalet / Cabin</option>
                    <option value="heritage_room">Heritage Stay / Haveli</option>
                    <option value="beach_hut">Beachfront Stay</option>
                    <option value="apartment">Modern Apartment / Penthouse</option>
                    <option value="homestay">Farmstay / Homestay</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Destination / Location *</label>
                  <input type="text" id="prop-location" class="form-input" placeholder="e.g. Old Manali, Himachal" required />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Bedrooms</label>
                  <input type="number" id="prop-beds" class="form-input" value="2" min="1" max="10" />
                </div>
                <div class="form-group">
                  <label class="form-label">Bathrooms</label>
                  <input type="number" id="prop-baths" class="form-input" value="2" min="1" max="10" />
                </div>
                <div class="form-group">
                  <label class="form-label">Max Guests</label>
                  <input type="number" id="prop-guests" class="form-input" value="4" min="1" max="20" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Base Rate per Night (₹) *</label>
                <input type="number" id="prop-rate" class="form-input" value="5000" min="500" step="100" required />
              </div>

              <div class="form-group">
                <label class="form-label">Image URL</label>
                <input type="text" id="prop-img" class="form-input" value="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" />
              </div>

              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea id="prop-desc" class="form-textarea" placeholder="Brief summary of the listing..."></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Property</button>
              </div>
            </form>
          </div>
        </div>
      `;

      modalHolder.querySelector('#btn-close-modal')?.addEventListener('click', () => modalHolder.innerHTML = '');
      modalHolder.querySelector('#btn-cancel-modal')?.addEventListener('click', () => modalHolder.innerHTML = '');

      modalHolder.querySelector('#form-new-prop')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (modalHolder.querySelector('#prop-name') as HTMLInputElement).value;
        const property_type = (modalHolder.querySelector('#prop-type') as HTMLSelectElement).value;
        const location = (modalHolder.querySelector('#prop-location') as HTMLInputElement).value;
        const bedrooms = Number((modalHolder.querySelector('#prop-beds') as HTMLInputElement).value);
        const bathrooms = Number((modalHolder.querySelector('#prop-baths') as HTMLInputElement).value);
        const max_guests = Number((modalHolder.querySelector('#prop-guests') as HTMLInputElement).value);
        const base_rate = Number((modalHolder.querySelector('#prop-rate') as HTMLInputElement).value);
        const imgUrl = (modalHolder.querySelector('#prop-img') as HTMLInputElement).value;
        const description = (modalHolder.querySelector('#prop-desc') as HTMLTextAreaElement).value;

        try {
          await api.createProperty({
            name,
            property_type,
            location,
            location_tier: 'premium',
            bedrooms,
            bathrooms,
            max_guests,
            base_rate,
            amenities: ['wifi', 'ac', 'pool'],
            description,
            image_urls: [imgUrl]
          });
          modalHolder.innerHTML = '';
          showToast('New property listing created!', 'success');
          renderPropertyManager(container, showToast);
        } catch (err) {
          showToast('Error creating property: ' + (err as Error).message, 'error');
        }
      });
    }

    renderView();

  } catch (error) {
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; padding: 3rem;">
        <div style="color: #fb7185;">Could not load properties: ${(error as Error).message}</div>
      </div>
    `;
  }
}
