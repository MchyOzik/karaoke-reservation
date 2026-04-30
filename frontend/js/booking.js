const Booking = {
  currentStep: 1,
  selectedRoom: null,
  session: null,
  timerInterval: null,
  bookingId: null,
  lockId: null,

  init() {
    document.getElementById('step1-next-btn').onclick = () => this.nextStep();
    document.getElementById('step2-next-btn').onclick = () => this.nextStep();
    const fileInput = document.getElementById('payment-file-input');
    fileInput.onchange = (e) => this.handleUpload(e);
    document.getElementById('upload-zone').onclick = () => fileInput.click();
    
    // Auto-load slots when date changes
    document.getElementById('booking-date').onchange = () => this.initSlots();
  },

  openModal(roomId) {
    this.selectedRoom = App.rooms.find(r => r.id === roomId);
    if (!this.selectedRoom) return;
    document.getElementById('booking-overlay').classList.add('active');
    this.resetModal();
    this.renderRoomInfo();
    this.initSlots();
  },

  closeModal() {
    document.getElementById('booking-overlay').classList.remove('active');
    if (this.timerInterval) clearInterval(this.timerInterval);
  },

  resetModal() {
    this.currentStep = 1;
    this.session = null;
    this.updateUI();
    document.getElementById('booking-date').valueAsDate = new Date();
    document.getElementById('price-preview').classList.add('hide');
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-alias').value = '';
    document.getElementById('customer-phone').value = '';
  },

  renderRoomInfo() {
    document.getElementById('selected-room-info').innerHTML = `
      <div class="bg-brand-primary/10 border border-brand-primary/30 p-5 rounded-2xl flex justify-between items-center">
        <div>
          <div class="text-brand-primaryGlow font-bold text-lg">${this.selectedRoom.name}</div>
          <div class="text-slate-500 text-xs uppercase tracking-widest">${this.selectedRoom.category}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-white">Rp ${parseFloat(this.selectedRoom.price_per_hour).toLocaleString()}</div>
          <div class="text-slate-500 text-xs">/ JAM</div>
        </div>
      </div>
    `;
  },

  async initSlots() {
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    const date = document.getElementById('booking-date').value;
    
    // Ambil data slot yang sudah tidak tersedia (Double Check!)
    let unavailable = [];
    try {
      const res = await fetch(`${App.apiUrl}/check-slot?room_id=${this.selectedRoom.id}&date=${date}`);
      const data = await res.json();
      unavailable = data.unavailable_slots || [];
    } catch(e) { console.error("Check slot failed"); }

    const render = (wrapId, name) => {
      const wrap = document.getElementById(wrapId);
      wrap.innerHTML = slots.map(s => {
        const isTaken = unavailable.includes(s);
        return `<div class="slot-pill ${isTaken ? 'opacity-20 pointer-events-none' : ''}" 
                     data-time="${s}" 
                     onclick="Booking.selectSlot('${name}', '${s}', this)">${s}</div>`;
      }).join('');
    };
    render('start-slots', 'start');
    render('end-slots', 'end');
  },

  selectSlot(type, time, el) {
    el.parentElement.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    this.calculatePrice();
  },

  calculatePrice() {
    const start = document.querySelector('#start-slots .selected')?.dataset.time;
    const end = document.querySelector('#end-slots .selected')?.dataset.time;
    const statusEl = document.getElementById('slot-status');
    const pricePreview = document.getElementById('price-preview');

    if (start && end) {
      const h1 = parseInt(start.split(':')[0]);
      const h2 = parseInt(end.split(':')[0]);
      const duration = h2 - h1;
      if (duration <= 0) {
        statusEl.innerText = "❌ End time must be after start time!";
        pricePreview.classList.add('hide');
        return;
      }
      const total = duration * parseFloat(this.selectedRoom.price_per_hour);
      document.getElementById('price-value').innerText = `Rp ${total.toLocaleString()}`;
      pricePreview.classList.remove('hide');
      statusEl.innerText = "";
    }
  },

  async nextStep() {
    if (this.currentStep === 1) {
      const date = document.getElementById('booking-date').value;
      const start = document.querySelector('#start-slots .selected');
      const end = document.querySelector('#end-slots .selected');
      if (!date || !start || !end) return App.showToast("Please select a valid schedule.", "error");
      this.currentStep = 2;
      this.updateUI();
      return;
    }

    if (this.currentStep === 2) {
      const name = document.getElementById('customer-name').value;
      const phone = document.getElementById('customer-phone').value;
      if (!name || !phone) return App.showToast("Name and Phone Number are required.", "error");
      
      App.showToast("Processing booking...", "info");
      try {
        const payload = {
          room_id: this.selectedRoom.id,
          room_name: this.selectedRoom.name,
          date: document.getElementById('booking-date').value,
          start: document.querySelector('#start-slots .selected').dataset.time,
          end: document.querySelector('#end-slots .selected').dataset.time,
          customer_name: name,
          alias: document.getElementById('customer-alias').value || "Anonymous",
          customer_phone: phone,
          total_price: document.getElementById('price-value').innerText.replace(/[^0-9]/g, '')
        };
        const res = await fetch(`${App.apiUrl}/booking`, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        this.bookingId = data.booking_id;
        this.lockId = data.lock_id;
        this.session = data;
        this.currentStep = 3;
        this.updateUI();
        this.startTimer(data.expires_at);
      } catch (e) { App.showToast(e.message, "error"); }
    }
  },

  updateUI() {
    document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hide'));
    const activeId = this.currentStep === 'success' ? 'step-success' : `step-${this.currentStep}`;
    document.getElementById(activeId).classList.remove('hide');
    
    // Update Line/Circles
    if(this.currentStep !== 'success') {
      for(let i=1; i<=3; i++) {
        const circle = document.getElementById(`ps-${i}`);
        const line = document.getElementById(`line-${i-1}`);
        if(i <= this.currentStep) {
          circle.classList.replace('bg-white/5', 'bg-brand-primary');
          circle.classList.replace('text-slate-500', 'text-white');
          if(line) line.style.width = '100%';
        } else {
          circle.classList.replace('bg-brand-primary', 'bg-white/5');
          circle.classList.replace('text-white', 'text-slate-500');
          if(line) line.style.width = '0%';
        }
      }
    }
  },

  startTimer(expiry) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerEl = document.getElementById('timer-countdown');
    const update = () => {
      const diff = expiry - Math.floor(Date.now() / 1000);
      if (diff <= 0) {
        clearInterval(this.timerInterval);
        App.showToast("Waktu habis! Slot dilepas.", "warning");
        this.closeModal();
        return;
      }
      const m = Math.floor(diff / 60); const s = diff % 60;
      timerEl.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    update();
    this.timerInterval = setInterval(update, 1000);
  },

  async handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    App.showToast("Uploading payment proof...", "info");
    try {
      const res = await fetch(`${App.apiUrl}/presign`, {
        method: 'POST', body: JSON.stringify({ session_token: this.session.session_token, file_name: file.name, file_type: file.type })
      });
      const data = await res.json();
      await fetch(data.presigned_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const conf = await fetch(`${App.apiUrl}/confirm`, {
        method: 'POST', body: JSON.stringify({ booking_id: this.bookingId, lock_id: this.lockId, s3_key: data.s3_key })
      });
      const resConf = await conf.json();
      if (resConf.success) {
        this.currentStep = 'success';
        this.updateUI();
        clearInterval(this.timerInterval);
        App.fetchSchedule();
      }
    } catch (e) { App.showToast("Upload failed.", "error"); }
  }
};
Booking.init();
