// ===== DIARY MODULE =====

const DiaryModule = {
  storageKey: 'diary',
  entries: [],
  selectedMood: '😊',
  editingId: null,

  thDays: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  thMonths: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],

  init() {
    this.entries = this.load();
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Add diary button
    document.getElementById('btn-add-diary').addEventListener('click', () => this.openEditor());
    document.getElementById('btn-cancel-diary').addEventListener('click', () => this.closeEditor());
    document.getElementById('btn-save-diary').addEventListener('click', () => this.save());

    // Mood selector
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMood = btn.dataset.mood;
        document.getElementById('diary-mood').value = this.selectedMood;
      });
    });
  },

  openEditor(entry = null) {
    const editor = document.getElementById('diary-editor');
    editor.style.display = 'block';

    if (entry) {
      // Edit mode
      this.editingId = entry.id;
      document.getElementById('diary-content').value = entry.content || '';
      this.selectedMood = entry.mood || '😊';
      document.getElementById('diary-mood').value = this.selectedMood;

      // Select mood button
      document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mood === this.selectedMood);
      });

      // Show entry date
      document.getElementById('diary-date-display').textContent = this.formatDate(entry.date);
    } else {
      // New entry
      this.editingId = null;
      document.getElementById('diary-content').value = '';
      this.selectedMood = '😊';
      document.getElementById('diary-mood').value = this.selectedMood;

      // Select default mood
      document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.mood === '😊');
      });

      // Show today's date
      const today = new Date();
      document.getElementById('diary-date-display').textContent = this.formatDate(today.toISOString());
    }

    // Scroll to editor
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  closeEditor() {
    document.getElementById('diary-editor').style.display = 'none';
    document.getElementById('diary-content').value = '';
    this.editingId = null;
  },

  save() {
    const content = document.getElementById('diary-content').value.trim();
    if (!content) {
      alert('กรุณาเขียนเนื้อหา');
      return;
    }

    const now = new Date();

    if (this.editingId) {
      // Update existing entry
      const index = this.entries.findIndex(e => e.id === this.editingId);
      if (index !== -1) {
        this.entries[index] = {
          ...this.entries[index],
          content,
          mood: this.selectedMood,
          updatedAt: now.toISOString()
        };
      }
    } else {
      // Create new entry
      const entry = {
        id: Date.now(),
        date: now.toISOString(),
        mood: this.selectedMood,
        content,
        createdAt: now.toISOString()
      };
      this.entries.unshift(entry);
    }

    this.persist();
    this.render();
    this.closeEditor();
  },

  delete(id) {
    if (!confirm('ลบบันทึกนี้?')) return;
    this.entries = this.entries.filter(e => e.id !== id);
    this.persist();
    this.render();
  },

  load() {
    return DB.get(this.storageKey);
  },

  persist() {
    DB.save(this.storageKey, this.entries);
  },

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = this.thDays[date.getDay()];
    const d = date.getDate();
    const month = this.thMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day} ${d} ${month} ${year} • ${hours}:${minutes}`;
  },

  render() {
    const container = document.getElementById('diary-entries');

    if (this.entries.length === 0) {
      container.innerHTML = `
        <div class="diary-empty">
          <i class="ti ti-book-off"></i>
          <p>ยังไม่มีบันทึก กด "เขียนใหม่" เพื่อเริ่มต้น 📔</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.entries.map(entry => `
      <div class="diary-entry" data-id="${entry.id}">
        <div class="diary-entry-header">
          <div class="diary-entry-date">
            <span class="diary-entry-mood">${entry.mood}</span>
            <span>${this.formatDate(entry.date)}</span>
          </div>
          <div class="diary-entry-actions">
            <button data-action="edit" title="แก้ไข"><i class="ti ti-pencil"></i></button>
            <button data-action="delete" class="delete" title="ลบ"><i class="ti ti-trash"></i></button>
          </div>
        </div>
        <div class="diary-entry-content">${this.escapeHtml(entry.content)}</div>
      </div>
    `).join('');

    // Attach events
    container.querySelectorAll('.diary-entry').forEach(card => {
      const id = Number(card.dataset.id);
      const entry = this.entries.find(e => e.id === id);

      card.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
        this.openEditor(entry);
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        this.delete(id);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => DiaryModule.init());
document.addEventListener('DOMContentLoaded', () => {
  DB.onReady(() => {
    DiaryModule.entries = DiaryModule.load();
    DiaryModule.render();
  });
});
