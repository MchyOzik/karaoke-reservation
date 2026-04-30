const App = {
  apiUrl: localStorage.getItem('neonstage_api_url') || (window.APP_CONFIG && window.APP_CONFIG.API_GATEWAY_URL !== '__API_GATEWAY_URL__' ? window.APP_CONFIG.API_GATEWAY_URL : ''),
  rooms: [],

  init() {
    this.bindEvents();
    this.initParticles();
    
    if (this.apiUrl) {
      this.fetchRooms();
      this.fetchSchedule();
    } else {
      setTimeout(() => this.openSettings(), 1000);
    }
    
    setInterval(() => this.fetchSchedule(), 30000);
  },

  bindEvents() {
    document.getElementById('open-settings-btn').onclick = () => this.openSettings();
    document.getElementById('save-api-btn').onclick = () => {
      let url = document.getElementById('api-url-input').value.trim();
      if (url) {
        url = url.replace(/\/+$/, "");
        localStorage.setItem('neonstage_api_url', url);
        this.apiUrl = url;
        closeModal('settings-overlay');
        this.fetchRooms();
        this.fetchSchedule();
        this.showToast("Connection Established! 🚀", "success");
      }
    };
  },

  openSettings() {
    document.getElementById('api-url-input').value = this.apiUrl;
    document.getElementById('settings-overlay').classList.add('active');
  },

  async fetchRooms() {
    try {
      const res = await fetch(`${this.apiUrl}/rooms`);
      const data = await res.json();
      this.rooms = data.rooms || [];
      this.renderRooms();
    } catch (e) { this.showToast("Failed to fetch rooms.", "error"); }
  },

  renderRooms() {
    const grid = document.getElementById('rooms-grid');
    if (!grid) return;
    grid.innerHTML = this.rooms.map(room => `
      <div class="glass-panel rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500">
        <div class="h-64 overflow-hidden relative">
          <img src="${room.photo_url}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700">
          <div class="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">${room.category}</div>
        </div>
        <div class="p-8">
          <h3 class="text-2xl font-display font-bold mb-2">${room.name}</h3>
          <p class="text-brand-accent font-bold text-xl mb-6">Rp ${parseFloat(room.price_per_hour).toLocaleString()}<span class="text-sm font-normal text-slate-400">/hr</span></p>
          <button class="w-full py-3.5 rounded-2xl border border-brand-primary/50 text-brand-primary font-bold hover:bg-brand-primary hover:text-white transition-all" onclick="Booking.openModal(${room.id})">Reserve Stage</button>
        </div>
      </div>
    `).join('');
  },

  async fetchSchedule() {
    if (!this.apiUrl) return;
    try {
      const res = await fetch(`${this.apiUrl}/status`);
      const data = await res.json();
      this.renderSchedule(data.bookings || []);
    } catch (e) { console.error("Schedule fetch failed."); }
  },

  renderSchedule(bookings) {
    const grid = document.getElementById('schedule-grid');
    const heroList = document.getElementById('hero-upcoming-list');
    if (!grid || !heroList) return;

    grid.innerHTML = '';
    heroList.innerHTML = '';

    if (bookings.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-500 italic">No bookings found for today.</div>';
        heroList.innerHTML = '<div class="text-center py-20 text-slate-500 italic text-sm">Waiting for the first superstar...</div>';
        return;
    }

    grid.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">' + bookings.map(b => `
      <div class="glass-panel p-6 rounded-xl border-l-2 ${b.status === 'confirmed' ? 'border-l-green-500' : 'border-l-brand-primary'}">
        <div class="inline-block px-2 py-0.5 rounded text-[9px] font-bold mb-4 ${b.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-brand-primary/10 text-brand-primary'} uppercase">${b.status}</div>
        <div class="text-xl font-bold mb-1">${b.start_time.substring(0,5)} - ${b.end_time.substring(0,5)}</div>
        <div class="text-slate-400 text-xs mb-4">${b.room_name}</div>
        <div class="flex items-center gap-2 border-t border-white/5 pt-4">
          <div class="text-xs font-bold text-slate-300">${b.alias}</div>
        </div>
      </div>
    `).join('') + '</div>';

    heroList.innerHTML = bookings.slice(0, 4).map(b => `
      <div class="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-xs">🎤</div>
          <div>
            <div class="font-bold text-white text-xs">${b.alias}</div>
            <div class="text-[9px] text-slate-500 uppercase">${b.room_name}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-brand-primary font-mono font-bold text-xs">${b.start_time.substring(0,5)}</div>
        </div>
      </div>
    `).join('');
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-green-500/90' : type === 'error' ? 'bg-red-500/90' : 'bg-brand-primary/90';
    toast.className = `${bg} backdrop-blur-md border border-white/10 text-white px-6 py-4 rounded-2xl shadow-2xl font-semibold flex items-center gap-3 animate-bounce-in`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
  },

  initParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      p.style.cssText = `width: ${size}px; height: ${size}px; left: ${Math.random() * 100}%; top: ${Math.random() * 100}%; opacity: ${Math.random() * 0.4}; animation: float ${Math.random() * 10 + 5}s infinite linear;`;
      container.appendChild(p);
    }
  }
};

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.addEventListener('DOMContentLoaded', () => App.init());
