// ===== SETTINGS MODULE =====
const Settings = {
  STORAGE_KEY: 'myspace-settings',

  DEFAULTS: {
    // UI Settings
    fontSize: 'medium',      // small, medium, large
    uiScale: 100,            // 80, 90, 100, 110, 120
    compactMode: false,

    // Performance Settings
    animations: true,
    transitions: true,
    lazyLoadImages: true,

    // Sound Settings
    sounds: true,
    volume: 50,

    // Privacy Settings
    profileVisibility: 'public',  // public, followers, private
    showOnlineStatus: true,

    // Profile Lock
    profileLockEnabled: false,
    profileLockPin: null
  },

  // Get current settings
  get() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        return { ...this.DEFAULTS, ...JSON.parse(data) };
      } catch (e) {
        console.warn('Settings parse error:', e);
      }
    }
    return { ...this.DEFAULTS };
  },

  // Save settings
  save(settings) {
    const current = this.get();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.apply(updated);
    this.syncToCloud(updated);
    return updated;
  },

  // Apply settings to UI
  apply(settings) {
    const root = document.documentElement;

    // Font size
    const fontSizes = { small: '13px', medium: '14px', large: '16px' };
    root.style.setProperty('--font-size-base', fontSizes[settings.fontSize] || '14px');

    // UI Scale
    root.style.setProperty('--ui-scale', settings.uiScale / 100);

    // Compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Animations
    if (!settings.animations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Transitions
    if (!settings.transitions) {
      root.classList.add('no-transitions');
    } else {
      root.classList.remove('no-transitions');
    }

    // Lazy load images
    if (settings.lazyLoadImages) {
      root.classList.add('lazy-load-images');
    } else {
      root.classList.remove('lazy-load-images');
    }

    // Save to window for global access
    window.LifePSettings = settings;
  },

  // Sync settings to cloud
  async syncToCloud(settings) {
    if (window.LifePDB?.currentUserId) {
      window.LifePDB.save('settings', settings);
    }
  },

  // Load settings from cloud
  async loadFromCloud() {
    if (window.LifePDB) {
      const settings = window.LifePDB.get('settings');
      if (settings && Object.keys(settings).length > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        this.apply(settings);
      }
    }
  },

  // Reset to defaults
  reset() {
    this.save(this.DEFAULTS);
  },

  // Initialize
  init() {
    const settings = this.get();
    this.apply(settings);

    // Listen for storage changes (sync across tabs)
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        this.apply(JSON.parse(e.newValue));
        renderSettingsPage();
      }
    });
  }
};

// ===== RENDER SETTINGS PAGE =====
function renderSettingsPage() {
  const settings = Settings.get();
  const container = document.getElementById('settings-container');
  if (!container) return;

  container.innerHTML = `
    <div class="settings-section">
      <h3 class="settings-section-title"><i class="ti ti-typography"></i> การแสดงผล</h3>

      <div class="settings-group">
        <label class="settings-label">ขนาดตัวอักษร</label>
        <div class="settings-options">
          <button class="settings-option ${settings.fontSize === 'small' ? 'active' : ''}" data-setting="fontSize" data-value="small">เล็ก</button>
          <button class="settings-option ${settings.fontSize === 'medium' ? 'active' : ''}" data-setting="fontSize" data-value="medium">กลาง</button>
          <button class="settings-option ${settings.fontSize === 'large' ? 'active' : ''}" data-setting="fontSize" data-value="large">ใหญ่</button>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">ขนาด UI</label>
        <div class="settings-options">
          <button class="settings-option ${settings.uiScale === 80 ? 'active' : ''}" data-setting="uiScale" data-value="80">80%</button>
          <button class="settings-option ${settings.uiScale === 90 ? 'active' : ''}" data-setting="uiScale" data-value="90">90%</button>
          <button class="settings-option ${settings.uiScale === 100 ? 'active' : ''}" data-setting="uiScale" data-value="100">100%</button>
          <button class="settings-option ${settings.uiScale === 110 ? 'active' : ''}" data-setting="uiScale" data-value="110">110%</button>
          <button class="settings-option ${settings.uiScale === 120 ? 'active' : ''}" data-setting="uiScale" data-value="120">120%</button>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">โหมดกะทัดรัด</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-compact" ${settings.compactMode ? 'checked' : ''}>
          <label for="toggle-compact" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">ลดระยะห่างระหว่างองค์ประกอบ</span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title"><i class="ti ti-cpu"></i> ประสิทธิภาพ</h3>

      <div class="settings-group">
        <label class="settings-label">อนิเมชั่น</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-animations" ${settings.animations ? 'checked' : ''}>
          <label for="toggle-animations" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">เปิดอนิเมชั่นต่างๆ</span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Transitions</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-transitions" ${settings.transitions ? 'checked' : ''}>
          <label for="toggle-transitions" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">เปิดเอฟเฟกต์การเปลี่ยนภาพ</span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">Lazy Load รูปภาพ</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-lazyload" ${settings.lazyLoadImages ? 'checked' : ''}>
          <label for="toggle-lazyload" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">โหลดรูปเฉพาะตอนเลื่อนถึง (ประหยัดแรม)</span>
          </label>
        </div>
      </div>

      <button class="btn-outline settings-performance-btn" id="btn-performance-mode">
        <i class="ti ti-rocket"></i> โหมดประสิทธิภาพสูง (ปิดทุกอย่าง)
      </button>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title"><i class="ti ti-volume"></i> เสียง</h3>

      <div class="settings-group">
        <label class="settings-label">เสียงเอฟเฟกต์</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-sounds" ${settings.sounds ? 'checked' : ''}>
          <label for="toggle-sounds" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">เปิดเสียงเอฟเฟกต์</span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">ระดับเสียง: <span id="volume-value">${settings.volume}%</span></label>
        <input type="range" id="volume-slider" min="0" max="100" value="${settings.volume}" class="settings-slider">
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title"><i class="ti ti-lock"></i> ความเป็นส่วนตัว</h3>

      <div class="settings-group">
        <label class="settings-label">การมองเห็นโปรไฟล์</label>
        <select id="select-visibility" class="settings-select">
          <option value="public" ${settings.profileVisibility === 'public' ? 'selected' : ''}>สาธารณะ - ทุกคนเห็น</option>
          <option value="followers" ${settings.profileVisibility === 'followers' ? 'selected' : ''}>เฉพาะผู้ติดตาม</option>
          <option value="private" ${settings.profileVisibility === 'private' ? 'selected' : ''}>ส่วนตัว - เฉพาะคุณ</option>
        </select>
      </div>

      <div class="settings-group">
        <label class="settings-label">แสดงสถานะออนไลน์</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-online" ${settings.showOnlineStatus ? 'checked' : ''}>
          <label for="toggle-online" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">ให้คนอื่นเห็นว่าคุณออนไลน์</span>
          </label>
        </div>
      </div>

      <div class="settings-group">
        <label class="settings-label">ล็อกโปรไฟล์ด้วย PIN</label>
        <div class="settings-toggle">
          <input type="checkbox" id="toggle-lock" ${settings.profileLockEnabled ? 'checked' : ''}>
          <label for="toggle-lock" class="toggle-label">
            <span class="toggle-switch"></span>
            <span class="toggle-text">ต้องใส่ PIN เพื่อดูข้อมูลสำคัญ</span>
          </label>
        </div>
        ${settings.profileLockEnabled ? `
          <button class="btn-outline settings-pin-btn" id="btn-change-pin">
            <i class="ti ti-key"></i> เปลี่ยน PIN
          </button>
        ` : ''}
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title"><i class="ti ti-user"></i> บัญชี</h3>

      <div class="settings-account-info">
        <p><strong>อีเมล:</strong> <span id="settings-email">${window.LifePAuth?.user?.email || '-'}</span></p>
        <p><strong>UID:</strong> <span id="settings-uid">${window.LifePAuth?.user?.uid?.slice(0, 12) || '-'}...</span></p>
      </div>

      <div class="settings-account-actions">
        <button class="btn-outline" id="btn-export-data"><i class="ti ti-download"></i> ส่งออกข้อมูล</button>
        <button class="btn-outline" id="btn-change-password"><i class="ti ti-key"></i> เปลี่ยนรหัสผ่าน</button>
        <button class="btn-outline" id="btn-become-admin"><i class="ti ti-shield"></i> ขอเป็น Admin</button>
        <button class="btn-outline btn-danger" id="btn-delete-account"><i class="ti ti-trash"></i> ลบบัญชี</button>
      </div>
    </div>

    <div class="settings-section">
      <button class="btn" id="btn-reset-settings"><i class="ti ti-refresh"></i> รีเซ็ตเป็นค่าเริ่มต้น</button>
    </div>
  `;

  // Bind events
  bindSettingsEvents();
}

// ===== BIND SETTINGS EVENTS =====
function bindSettingsEvents() {
  const settings = Settings.get();

  // Option buttons
  document.querySelectorAll('.settings-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const setting = btn.dataset.setting;
      const value = btn.dataset.value;

      // Update UI
      btn.parentElement.querySelectorAll('.settings-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Save setting
      Settings.save({ [setting]: setting === 'uiScale' ? parseInt(value) : value });
    });
  });

  // Toggle switches
  const toggleMap = {
    'toggle-compact': 'compactMode',
    'toggle-animations': 'animations',
    'toggle-transitions': 'transitions',
    'toggle-lazyload': 'lazyLoadImages',
    'toggle-sounds': 'sounds',
    'toggle-online': 'showOnlineStatus',
    'toggle-lock': 'profileLockEnabled'
  };

  Object.entries(toggleMap).forEach(([id, setting]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      toggle.addEventListener('change', async () => {
        Settings.save({ [setting]: toggle.checked });

        // Special handling for profile lock
        if (setting === 'profileLockEnabled' && toggle.checked) {
          const pin = await showPinSetupModal();
          if (!pin) {
            toggle.checked = false;
            Settings.save({ profileLockEnabled: false });
          }
        }
      });
    }
  });

  // Volume slider
  const volumeSlider = document.getElementById('volume-slider');
  const volumeValue = document.getElementById('volume-value');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      volumeValue.textContent = volumeSlider.value + '%';
      Settings.save({ volume: parseInt(volumeSlider.value) });
    });
  }

  // Visibility select
  const visibilitySelect = document.getElementById('select-visibility');
  if (visibilitySelect) {
    visibilitySelect.addEventListener('change', () => {
      Settings.save({ profileVisibility: visibilitySelect.value });
    });
  }

  // Performance mode button
  const perfBtn = document.getElementById('btn-performance-mode');
  if (perfBtn) {
    perfBtn.addEventListener('click', () => {
      Settings.save({
        animations: false,
        transitions: false,
        lazyLoadImages: true,
        compactMode: true
      });
      renderSettingsPage();
    });
  }

  // Change PIN button
  const changePinBtn = document.getElementById('btn-change-pin');
  if (changePinBtn) {
    changePinBtn.addEventListener('click', async () => {
      await showPinSetupModal();
    });
  }

  // Export data
  const exportBtn = document.getElementById('btn-export-data');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = window.LifePDB?.exportData() || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Change password
  const changePwdBtn = document.getElementById('btn-change-password');
  if (changePwdBtn) {
    changePwdBtn.addEventListener('click', async () => {
      const email = window.LifePAuth?.user?.email;
      if (email && confirm('ส่งอีเมลสำหรับเปลี่ยนรหัสผ่านไปที่ ' + email + '?')) {
        try {
          await firebase.auth().sendPasswordResetEmail(email);
          alert('ส่งอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย');
        } catch (error) {
          alert('เกิดข้อผิดพลาด: ' + error.message);
        }
      }
    });
  }

  // Delete account
  const deleteBtn = document.getElementById('btn-delete-account');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (confirm('คุณแน่ใจหรือไม่ที่จะลบบัญชี? การกระทำนี้ไม่สามารถย้อนกลับได้!')) {
        if (confirm('ยืนยันอีกครั้ง - ข้อมูลทั้งหมดจะถูกลบ!')) {
          try {
            await window.LifePAuth?.user?.delete();
            alert('ลบบัญชีสำเร็จ');
            location.reload();
          } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
          }
        }
      }
    });
  }

  // Become Admin
  const becomeAdminBtn = document.getElementById('btn-become-admin');
  if (becomeAdminBtn) {
    becomeAdminBtn.addEventListener('click', async () => {
      if (!window.LifePAuth?.user) {
        alert('กรุณาล็อกอินก่อน');
        return;
      }

      if (confirm('ต้องการขอสิทธิ์ Admin?')) {
        try {
          const db = firebase.firestore();
          await db.collection('users').doc(window.LifePAuth.user.uid).update({
            admin: true
          });
          alert('✅ คุณเป็น Admin แล้ว! Refresh หน้าเว็บเพื่อเห็นเมนู Admin');
          location.reload();
        } catch (error) {
          alert('เกิดข้อผิดพลาด: ' + error.message);
        }
      }
    });
  }

  // Reset settings
  const resetBtn = document.getElementById('btn-reset-settings');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('รีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้น?')) {
        Settings.reset();
        renderSettingsPage();
      }
    });
  }
}

// ===== PIN SETUP MODAL =====
async function showPinSetupModal() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.innerHTML = `
      <div class="pin-modal-content">
        <h3><i class="ti ti-lock"></i> ตั้งค่า PIN</h3>
        <p>ตั้ง PIN 4-6 หลักสำหรับล็อกข้อมูลสำคัญ</p>
        <input type="password" id="pin-input" class="pin-input" maxlength="6" placeholder="••••••" autocomplete="off">
        <p class="pin-hint">ใส่ PIN 4-6 หลัก</p>
        <div class="pin-actions">
          <button class="btn-outline" id="pin-cancel">ยกเลิก</button>
          <button class="btn" id="pin-confirm">ยืนยัน</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const input = modal.querySelector('#pin-input');
    input.focus();

    // Only allow numbers
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });

    const closeModal = (pin) => {
      modal.remove();
      resolve(pin);
    };

    modal.querySelector('#pin-cancel').addEventListener('click', () => closeModal(null));
    modal.querySelector('#pin-confirm').addEventListener('click', () => {
      const pin = input.value;
      if (pin.length >= 4 && pin.length <= 6) {
        // Hash and save PIN
        const hash = btoa(pin + Date.now());
        Settings.save({ profileLockPin: hash });
        closeModal(pin);
      } else {
        input.classList.add('error');
        modal.querySelector('.pin-hint').textContent = 'PIN ต้องมี 4-6 หลัก';
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(null);
    });
  });
}

// ===== VERIFY PIN MODAL =====
async function showVerifyPinModal() {
  return new Promise((resolve) => {
    const savedHash = Settings.get().profileLockPin;
    if (!savedHash) {
      resolve(true);
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'pin-modal';
    modal.innerHTML = `
      <div class="pin-modal-content">
        <h3><i class="ti ti-lock"></i> ใส่ PIN</h3>
        <p>กรุณาใส่ PIN เพื่อเข้าดูข้อมูล</p>
        <input type="password" id="pin-verify-input" class="pin-input" maxlength="6" placeholder="••••••" autocomplete="off">
        <p class="pin-error" id="pin-error"></p>
        <div class="pin-actions">
          <button class="btn-outline" id="pin-verify-cancel">ยกเลิก</button>
          <button class="btn" id="pin-verify-confirm">ยืนยัน</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const input = modal.querySelector('#pin-verify-input');
    input.focus();

    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
    });

    const closeModal = (success) => {
      modal.remove();
      resolve(success);
    };

    modal.querySelector('#pin-verify-cancel').addEventListener('click', () => closeModal(false));
    modal.querySelector('#pin-verify-confirm').addEventListener('click', () => {
      const pin = input.value;
      // Simple verification (in production, use proper hash comparison)
      if (savedHash.startsWith(btoa(pin))) {
        closeModal(true);
      } else {
        input.classList.add('error');
        modal.querySelector('#pin-error').textContent = 'PIN ไม่ถูกต้อง';
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(false);
    });
  });
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  Settings.init();
});

window.LifePSettings = Settings.get();
window.Settings = Settings;
window.showVerifyPinModal = showVerifyPinModal;
