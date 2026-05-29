// ===== CALENDAR MODULE =====

const CalendarModule = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),

  // Thai month names
  thMonths: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ],

  // Thai day names (short)
  thDays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],

  // Initialize
  init() {
    this.bindEvents();
    this.render();
  },

  // Bind all events
  bindEvents() {
    // Toggle event form
    document.getElementById('btn-toggle-event-form').addEventListener('click', () => this.toggleForm());
    document.getElementById('btn-cancel-event').addEventListener('click', () => this.toggleForm(false));

    // Add event
    document.getElementById('btn-add-event').addEventListener('click', () => this.addEvent());

    // Month navigation
    document.getElementById('btn-prev-month').addEventListener('click', () => this.prevMonth());
    document.getElementById('btn-next-month').addEventListener('click', () => this.nextMonth());
  },

  // Toggle event form visibility
  toggleForm(show = null) {
    const form = document.getElementById('event-form');
    if (show === null) {
      form.classList.toggle('open');
    } else {
      form.classList.toggle('open', show);
    }
  },

  // Add new event
  addEvent() {
    const nameInput = document.getElementById('ev-name');
    const dateInput = document.getElementById('ev-date');
    const timeInput = document.getElementById('ev-time');
    const noteInput = document.getElementById('ev-note');

    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
      alert('กรุณาใส่ชื่อกิจกรรมและวันที่');
      return;
    }

    DB.add('events', {
      name,
      date,
      time: timeInput.value,
      note: noteInput.value.trim()
    });

    // Clear form
    nameInput.value = '';
    dateInput.value = '';
    timeInput.value = '';
    noteInput.value = '';

    // Close form and refresh
    this.toggleForm(false);
    this.render();
  },

  // Delete event
  deleteEvent(id) {
    DB.delete('events', id);
    this.render();
  },

  // Previous month
  prevMonth() {
    this.month--;
    if (this.month < 0) {
      this.month = 11;
      this.year--;
    }
    this.render();
  },

  // Next month
  nextMonth() {
    this.month++;
    if (this.month > 11) {
      this.month = 0;
      this.year++;
    }
    this.render();
  },

  // Render calendar
  render() {
    this.renderCalendar();
    this.renderEvents();
  },

  // Render calendar grid
  renderCalendar() {
    const label = document.getElementById('cal-month-label');
    label.textContent = `${this.thMonths[this.month]} ${this.year + 543}`;

    // Get first day and total days
    const firstDay = new Date(this.year, this.month, 1).getDay();
    const totalDays = new Date(this.year, this.month + 1, 0).getDate();
    const today = new Date();

    // Map events to dates
    const events = DB.get('events');
    const eventMap = {};

    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === this.year && d.getMonth() === this.month) {
        const day = d.getDate();
        eventMap[day] = (eventMap[day] || 0) + 1;
      }
    });

    // Build calendar HTML
    let html = this.thDays.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    // Day cells
    for (let d = 1; d <= totalDays; d++) {
      const isToday = (
        today.getFullYear() === this.year &&
        today.getMonth() === this.month &&
        today.getDate() === d
      );

      const count = eventMap[d] || 0;
      const dots = count > 0
        ? `<div class="dot-row">${Array(Math.min(count, 3)).fill('<div class="ev-dot"></div>').join('')}</div>`
        : '';

      html += `<div class="cal-cell ${isToday ? 'today' : ''}">${d}${dots}</div>`;
    }

    document.getElementById('cal-grid').innerHTML = html;
  },

  // Render events list
  renderEvents() {
    const events = DB.get('events');
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Split into upcoming and past
    const upcoming = [...events]
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const past = [...events]
      .filter(e => new Date(e.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Build HTML
    let html = '';

    if (upcoming.length) {
      html += upcoming.map(e => this.renderEventItem(e)).join('');
    }

    if (past.length) {
      html += `<div class="section-label" style="margin-top:1.5rem">ที่ผ่านมา</div>`;
      html += past.map(e => this.renderEventItem(e)).join('');
    }

    if (!events.length) {
      html = `<div class="empty-state"><i class="ti ti-calendar-off"></i><p>ยังไม่มีกิจกรรม กด "+ เพิ่มกิจกรรม" ได้เลย</p></div>`;
    }

    document.getElementById('events-list').innerHTML = html;

    // Attach event listeners
    this.attachItemEvents();
  },

  // Render single event item
  renderEventItem(event) {
    const d = new Date(event.date);
    const monthName = this.thMonths[d.getMonth()].slice(0, 3);

    return `
      <div class="event-item" data-id="${event.id}">
        <div class="event-badge">
          ${d.getDate()}
          <small>${monthName}</small>
        </div>
        <div class="event-info">
          <div class="event-name">${escHtml(event.name)}</div>
          <div class="event-meta">
            ${event.time ? `<i class="ti ti-clock" style="font-size:12px"></i> ${event.time}` : ''}
            ${event.note ? `<span>· ${escHtml(event.note)}</span>` : ''}
          </div>
        </div>
        <button class="event-del" data-action="delete" aria-label="ลบ"><i class="ti ti-trash"></i></button>
      </div>
    `;
  },

  // Attach events to event items
  attachItemEvents() {
    document.querySelectorAll('.event-item').forEach(item => {
      const id = Number(item.dataset.id);

      item.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.deleteEvent(id));
    });
  }
};

// Global function for navigation callback
function renderCalendar() {
  CalendarModule.render();
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  CalendarModule.init();
  DB.onReady(() => CalendarModule.render());
});
