// ===== FIREBASE & LOCALSTORAGE DATABASE MODULE =====

const DB = {
  // Firebase config (กรอกข้อมูลของคุณเอง)
  firebaseConfig: null,
  db: null,
  useFirebase: false,

  // Keys สำหรับ localStorage
  KEYS: {
    todos: 'myspace-todos',
    notes: 'myspace-notes',
    events: 'myspace-events'
  },

  // Initialize
  async init() {
    // ลองเชื่อม Firebase ถ้ามี config
    if (this.firebaseConfig) {
      try {
        // TODO: เพิ่ม Firebase initialization เมื่อมี config
        // this.db = firebase.firestore();
        // this.useFirebase = true;
        console.log('Firebase initialized');
      } catch (error) {
        console.warn('Firebase init failed, using localStorage:', error);
        this.useFirebase = false;
      }
    }
  },

  // ===== CRUD Operations =====

  // Get all items
  get(collection) {
    const data = localStorage.getItem(this.KEYS[collection]);
    return data ? JSON.parse(data) : [];
  },

  // Save all items
  save(collection, data) {
    localStorage.setItem(this.KEYS[collection], JSON.stringify(data));
    this.updateBadges();

    // Sync to Firebase ถ้าเชื่อมต่อแล้ว
    if (this.useFirebase && this.db) {
      this.syncToFirebase(collection, data);
    }
  },

  // Add single item
  add(collection, item) {
    const data = this.get(collection);
    const newItem = {
      id: Date.now(),
      ...item,
      createdAt: new Date().toISOString()
    };
    data.unshift(newItem);
    this.save(collection, data);
    return newItem;
  },

  // Update single item
  update(collection, id, updates) {
    const data = this.get(collection);
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
      this.save(collection, data);
      return data[index];
    }
    return null;
  },

  // Delete single item
  delete(collection, id) {
    const data = this.get(collection);
    const filtered = data.filter(item => item.id !== id);
    this.save(collection, filtered);
    return filtered;
  },

  // Get single item by ID
  getById(collection, id) {
    const data = this.get(collection);
    return data.find(item => item.id === id) || null;
  },

  // ===== Firebase Sync =====
  async syncToFirebase(collection, data) {
    // TODO: Implement Firebase sync
    // await this.db.collection(collection).doc('data').set({ items: data });
  },

  async syncFromFirebase(collection) {
    // TODO: Implement Firebase sync
    // const doc = await this.db.collection(collection).doc('data').get();
    // if (doc.exists) {
    //   localStorage.setItem(this.KEYS[collection], JSON.stringify(doc.data().items));
    // }
  },

  // ===== Badges =====
  updateBadges() {
    const todos = this.get('todos');
    const notes = this.get('notes');
    const events = this.get('events');

    document.getElementById('badge-todo').textContent = todos.filter(t => !t.done).length;
    document.getElementById('badge-notes').textContent = notes.length;
    document.getElementById('badge-events').textContent = events.length;
  },

  // ===== Utilities =====
  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    this.updateBadges();
  },

  exportData() {
    return {
      todos: this.get('todos'),
      notes: this.get('notes'),
      events: this.get('events'),
      exportedAt: new Date().toISOString()
    };
  },

  importData(data) {
    if (data.todos) this.save('todos', data.todos);
    if (data.notes) this.save('notes', data.notes);
    if (data.events) this.save('events', data.events);
  }
};

// ===== Utility Functions =====
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Navigation =====
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;

      // Update active states
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

      // Show selected page
      document.getElementById('page-' + page).classList.add('active');
      item.classList.add('active');

      // Refresh calendar when switching to that page
      if (page === 'calendar' && typeof renderCalendar === 'function') {
        renderCalendar();
      }
    });
  });
}

// ===== Seed Test Data =====
function seedTestData() {
  // Check if already has data
  if (DB.get('todos').length === 0) {
    DB.save('todos', [
      { id: 1, text: 'ทำโปรเจกต์ MySpace เสร็จ', done: false, priority: 'สูง', createdAt: new Date().toISOString() },
      { id: 2, text: 'อ่านหนังสือ JavaScript', done: true, priority: 'กลาง', createdAt: new Date().toISOString() },
      { id: 3, text: 'ออกกำลังกาย 30 นาที', done: false, priority: 'ต่ำ', createdAt: new Date().toISOString() }
    ]);
  }

  if (DB.get('notes').length === 0) {
    DB.save('notes', [
      { id: 1, title: 'ไอเดียโปรเจกต์ใหม่', body: 'อยากทำแอปจดบันทึกค่าใช้จ่ายรายวัน พร้อมกราฟสรุป', tag: 'ไอเดีย', createdAt: new Date().toISOString() },
      { id: 2, title: 'ของที่อยากได้', body: 'Keyboard mechanical, Mouse Logitech, Monitor 27 inch', tag: 'อยากได้', createdAt: new Date().toISOString() }
    ]);
  }

  if (DB.get('events').length === 0) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    DB.save('events', [
      { id: 1, name: 'ประชุมทีม', date: tomorrow.toISOString().split('T')[0], time: '10:00', note: 'ห้องประชุม A', createdAt: new Date().toISOString() },
      { id: 2, name: 'ดูหนังกับเพื่อน', date: nextWeek.toISOString().split('T')[0], time: '19:00', note: 'Siam Paragon', createdAt: new Date().toISOString() }
    ]);
  }

  DB.updateBadges();
  console.log('✅ Test data seeded!');
}

// ===== AFK MODE =====
const AFKMode = {
  timeout: 60000, // 1 นาที
  timer: null,
  clockInterval: null,
  isActive: false,

  thDays: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  thMonths: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],

  init() {
    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer(), true);
    });

    // Exit AFK on click
    document.getElementById('afk-overlay').addEventListener('click', () => this.exit());

    // Start timer
    this.resetTimer();
  },

  resetTimer() {
    clearTimeout(this.timer);
    if (this.isActive) return;

    this.timer = setTimeout(() => this.enter(), this.timeout);
  },

  enter() {
    this.isActive = true;
    document.getElementById('afk-overlay').classList.add('active');
    this.startClock();
  },

  exit() {
    this.isActive = false;
    document.getElementById('afk-overlay').classList.remove('active');
    this.stopClock();
    this.resetTimer();
  },

  startClock() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  },

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  },

  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = this.thDays[now.getDay()];
    const date = now.getDate();
    const month = this.thMonths[now.getMonth()];
    const year = now.getFullYear() + 543;

    document.getElementById('afk-time').textContent = `${hours}:${minutes}`;
    document.getElementById('afk-date').textContent = `${day} ${date} ${month} ${year}`;
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  initNavigation();

  // Seed test data if empty
  seedTestData();

  DB.updateBadges();

  // Initialize AFK mode
  AFKMode.init();
});
