// ===== NOTES MODULE =====

const NotesModule = {
  // Initialize
  init() {
    this.bindEvents();
    this.render();
  },

  // Bind all events
  bindEvents() {
    // Add note button
    document.getElementById('btn-add-note').addEventListener('click', () => this.add());
  },

  // Add new note
  add() {
    const titleInput = document.getElementById('note-title');
    const bodyInput = document.getElementById('note-body');
    const tagSelect = document.getElementById('note-tag');

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title && !body) return;

    DB.add('notes', {
      title: title || 'ไม่มีหัวข้อ',
      body,
      tag: tagSelect.value
    });

    // Clear inputs
    titleInput.value = '';
    bodyInput.value = '';

    this.render();
  },

  // Delete note
  delete(id) {
    DB.delete('notes', id);
    this.render();
  },

  // Render all notes
  render() {
    const notes = DB.get('notes');
    const grid = document.getElementById('notes-grid');

    grid.innerHTML = notes.length
      ? notes.map(n => this.renderItem(n)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><i class="ti ti-notes"></i><p>ยังไม่มีโน้ต ลองเพิ่มดูสิ ✍️</p></div>`;

    // Attach event listeners
    this.attachItemEvents();
  },

  // Render single note item
  renderItem(note) {
    const date = note.createdAt
      ? new Date(note.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      : note.date || '';

    return `
      <div class="note-card" data-id="${note.id}">
        <button class="note-del-btn" data-action="delete" aria-label="ลบ"><i class="ti ti-x"></i></button>
        <div class="note-title">${escHtml(note.title)}</div>
        <div class="note-body">${escHtml(note.body)}</div>
        <div class="note-footer">
          <span class="note-tag">${note.tag}</span>
          <span class="note-date">${date}</span>
        </div>
      </div>
    `;
  },

  // Attach events to note items
  attachItemEvents() {
    document.querySelectorAll('.note-card').forEach(card => {
      const id = Number(card.dataset.id);

      card.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.delete(id));
    });
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  NotesModule.init();
});
