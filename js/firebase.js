// ===== FIREBASE & LOCAL CACHE DATABASE MODULE =====

const DB = {
  firebaseConfig: window.LIFEP_FIREBASE_CONFIG || {
    apiKey: 'AIzaSyDPJ0Yg2__P8wavd-dhWW6xNMwjLOfstqo',
    authDomain: 'lifep-app.firebaseapp.com',
    projectId: 'lifep-app',
    storageBucket: 'lifep-app.firebasestorage.app',
    messagingSenderId: '305504304561',
    appId: '1:305504304561:web:1408f809feb6015dd4d190'
  },
  app: null,
  db: null,
  useFirebase: false,
  ready: false,
  lastError: '',
  listeners: [],

  KEYS: {
    todos: 'myspace-todos',
    notes: 'myspace-notes',
    events: 'myspace-events',
    profile: 'myspace-profile',
    music: 'myspace-music',
    movies: 'myspace-movies',
    games: 'myspace-games',
    gallery: 'myspace-gallery'
  },

  DEFAULTS: {
    todos: [],
    notes: [],
    events: [],
    profile: {},
    music: [],
    movies: [],
    games: [],
    gallery: []
  },

  COLLECTIONS: ['todos', 'notes', 'events', 'profile', 'music', 'movies', 'games', 'gallery'],

  async init() {
    await this.ensureFirebaseRuntime();

    if (!this.hasFirebaseConfig() || !window.firebase) {
      this.lastError = !this.hasFirebaseConfig()
        ? 'Firebase config missing'
        : 'Firebase SDK missing';
      console.warn('LifeP: Firebase is missing, using local cache only:', this.lastError);
      this.ready = true;
      this.notify();
      return;
    }

    try {
      this.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(this.firebaseConfig);
      this.db = firebase.firestore();
      this.useFirebase = true;
      await this.syncAllFromCloud();
      console.log('LifeP: Firebase sync ready.');
    } catch (error) {
      console.warn('LifeP: Firebase init failed, using local cache only:', error);
      this.lastError = error.message || String(error);
      this.useFirebase = false;
    } finally {
      this.ready = true;
      this.notify();
    }
  },

  async ensureFirebaseRuntime() {
    if (window.firebase?.firestore) return;

    await this.loadScript('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
    await this.loadScript('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore-compat.js');
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        const waitForLoad = () => {
          if (window.firebase) resolve();
          else setTimeout(waitForLoad, 50);
        };
        waitForLoad();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`โหลด Firebase SDK ไม่สำเร็จ: ${src}`));
      document.head.appendChild(script);
    });
  },

  onReady(callback) {
    this.listeners.push(callback);
    if (this.ready) callback();
  },

  notify() {
    this.updateBadges();
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('LifeP: render callback failed:', error);
      }
    });
  },

  get(collection) {
    const key = this.KEYS[collection];
    if (!key) return [];

    const data = localStorage.getItem(key);
    if (!data) return this.cloneDefault(collection);

    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn(`LifeP: failed to read ${collection} cache:`, error);
      return this.cloneDefault(collection);
    }
  },

  save(collection, data) {
    const key = this.KEYS[collection];
    if (!key) return;

    localStorage.setItem(key, JSON.stringify(data));
    this.updateBadges();

    if (this.useFirebase && this.db) {
      this.syncToCloud(collection, data);
    }
  },

  add(collection, item) {
    const data = this.ensureArray(collection);
    const newItem = {
      id: Date.now() + Math.random(),
      ...item,
      createdAt: new Date().toISOString()
    };

    data.unshift(newItem);
    this.save(collection, data);
    return newItem;
  },

  update(collection, id, updates) {
    const data = this.ensureArray(collection);
    const index = data.findIndex(item => Number(item.id) === Number(id));

    if (index === -1) return null;

    data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
    this.save(collection, data);
    return data[index];
  },

  delete(collection, id) {
    const data = this.ensureArray(collection);
    const filtered = data.filter(item => Number(item.id) !== Number(id));
    this.save(collection, filtered);
    return filtered;
  },

  getById(collection, id) {
    return this.ensureArray(collection).find(item => Number(item.id) === Number(id)) || null;
  },

  async syncAllFromCloud() {
    for (const collection of this.COLLECTIONS) {
      await this.syncFromCloud(collection);
    }
  },

  async uploadAllLocalToCloud() {
    if (!this.useFirebase || !this.db) {
      throw new Error('Firebase ยังไม่พร้อม');
    }

    const uploaded = [];
    for (const collection of this.COLLECTIONS) {
      const localData = this.get(collection);
      if (!this.isEmptyValue(localData, collection)) {
        await this.writeCloudDoc(collection, localData);
        uploaded.push(collection);
      }
    }

    return uploaded;
  },

  async syncFromCloud(collection) {
    const localData = this.get(collection);
    const docRef = this.db.collection('lifep').doc(collection);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      const remoteData = snapshot.data()?.value;
      if (remoteData !== undefined) {
        localStorage.setItem(this.KEYS[collection], JSON.stringify(remoteData));
      }
      return;
    }

    if (!this.isEmptyValue(localData, collection)) {
      await this.writeCloudDoc(collection, localData);
    }
  },

  async syncToCloud(collection, data) {
    try {
      await this.writeCloudDoc(collection, data);
    } catch (error) {
      console.warn(`LifeP: failed to sync ${collection}:`, error);
    }
  },

  async writeCloudDoc(collection, data) {
    await this.db.collection('lifep').doc(collection).set({
      value: data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  ensureArray(collection) {
    const data = this.get(collection);
    return Array.isArray(data) ? data : [];
  },

  cloneDefault(collection) {
    const value = this.DEFAULTS[collection];
    return Array.isArray(value) ? [...value] : { ...value };
  },

  isEmptyValue(value, collection) {
    if (Array.isArray(value)) return value.length === 0;
    if (collection === 'profile') return !value || Object.keys(value).length === 0;
    return !value;
  },

  updateBadges() {
    const todoBadge = document.getElementById('badge-todo');
    const notesBadge = document.getElementById('badge-notes');
    const eventsBadge = document.getElementById('badge-events');

    if (!todoBadge || !notesBadge || !eventsBadge) return;

    const todos = this.ensureArray('todos');
    const notes = this.ensureArray('notes');
    const events = this.ensureArray('events');

    todoBadge.textContent = todos.filter(t => !t.done).length;
    notesBadge.textContent = notes.length;
    eventsBadge.textContent = events.length;
  },

  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    this.notify();
  },

  exportData() {
    return this.COLLECTIONS.reduce((data, collection) => {
      data[collection] = this.get(collection);
      return data;
    }, { exportedAt: new Date().toISOString() });
  },

  importData(data) {
    this.COLLECTIONS.forEach(collection => {
      if (data[collection] !== undefined) this.save(collection, data[collection]);
    });
    this.notify();
  },

  hasFirebaseConfig() {
    return Boolean(
      this.firebaseConfig &&
      this.firebaseConfig.apiKey &&
      this.firebaseConfig.projectId &&
      this.firebaseConfig.appId
    );
  }
};

window.LifePDB = DB;

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

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

      document.getElementById('page-' + page).classList.add('active');
      item.classList.add('active');

      if (page === 'calendar' && typeof renderCalendar === 'function') {
        renderCalendar();
      }

      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('collapsed');
        updateToggleIcon(true);
      }
    });
  });
}

// ===== Sidebar Toggle =====
function initSidebarToggle() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    updateToggleIcon(sidebar.classList.contains('collapsed'));
  });

  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
    updateToggleIcon(true);
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.add('collapsed');
      updateToggleIcon(true);
    } else {
      sidebar.classList.remove('collapsed');
      updateToggleIcon(false);
    }
  });
}

function updateToggleIcon(isCollapsed) {
  const toggle = document.getElementById('sidebar-toggle');
  toggle.innerHTML = isCollapsed ? '<i class="ti ti-menu-2"></i>' : '<i class="ti ti-x"></i>';
}

// ===== Theme Toggle =====
function initTheme() {
  const savedTheme = localStorage.getItem('lifep-theme') || 'dark';
  const toggle = document.getElementById('theme-toggle');
  const text = document.getElementById('theme-text');

  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
    text.textContent = 'โหมดมืด';
  } else {
    document.documentElement.classList.remove('light');
    text.textContent = 'โหมดสว่าง';
  }

  toggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    const newTheme = isLight ? 'light' : 'dark';

    localStorage.setItem('lifep-theme', newTheme);
    text.textContent = isLight ? 'โหมดมืด' : 'โหมดสว่าง';

    toggle.querySelector('.theme-toggle-icon').style.transform = 'scale(1.2)';
    setTimeout(() => {
      toggle.querySelector('.theme-toggle-icon').style.transform = 'scale(1)';
    }, 200);
  });
}

// ===== Cloud Sync Status =====
function initCloudSyncStatus() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer || document.getElementById('cloud-sync-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'cloud-sync-panel';
  panel.innerHTML = `
    <button id="btn-cloud-sync-now" class="btn-outline cloud-sync-btn" type="button" data-tooltip="Firebase: กำลังตรวจสอบ...">
      <i class="ti ti-cloud-upload"></i> Sync now
    </button>
    <div id="cloud-sync-status" class="cloud-sync-status" aria-live="polite"></div>
  `;

  footer.prepend(panel);

  const status = document.getElementById('cloud-sync-status');
  const button = document.getElementById('btn-cloud-sync-now');

  const updateStatus = () => {
    const counts = DB.COLLECTIONS
      .map(collection => {
        const value = DB.get(collection);
        if (Array.isArray(value)) return `${collection}:${value.length}`;
        return `${collection}:${value && Object.keys(value).length ? 1 : 0}`;
      })
      .join(' ');

    const firebaseStatus = DB.useFirebase
      ? 'Firebase: พร้อม'
      : `Firebase: ยังไม่พร้อม${DB.lastError ? ' (' + DB.lastError + ')' : ''}`;

    button.dataset.tooltip = `${firebaseStatus} | ${counts}`;
  };

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'กำลัง sync...';

    try {
      const uploaded = await DB.uploadAllLocalToCloud();
      status.textContent = uploaded.length
        ? 'sync สำเร็จ'
        : 'ไม่มีข้อมูล local';
      button.dataset.tooltip = uploaded.length
        ? `sync สำเร็จ: ${uploaded.join(', ')}`
        : 'ไม่มีข้อมูล local ให้ sync';
    } catch (error) {
      status.textContent = 'sync ไม่สำเร็จ';
      button.dataset.tooltip = 'sync ไม่สำเร็จ: ' + error.message;
    } finally {
      button.disabled = false;
      setTimeout(() => {
        status.textContent = '';
        updateStatus();
      }, 2500);
    }
  });

  DB.onReady(updateStatus);
}

// ===== AFK MODE =====
const AFKMode = {
  timeout: 60000,
  timer: null,
  clockInterval: null,
  isActive: false,

  thDays: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  thMonths: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],

  init() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer(), true);
    });

    document.getElementById('afk-overlay').addEventListener('click', () => this.exit());
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

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSidebarToggle();
  initTheme();
  AFKMode.init();
  initCloudSyncStatus();
  DB.init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('มีเวอร์ชันใหม่! กด OK เพื่อรีเฟรช')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
});
