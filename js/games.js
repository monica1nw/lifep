// ===== GAMES MODULE =====

const GamesModule = {
  storageKey: 'myspace-games',
  games: [],

  init() {
    this.games = this.load();
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('btn-add-game').addEventListener('click', () => this.toggleForm());
    document.getElementById('btn-save-game').addEventListener('click', () => this.save());
    document.getElementById('btn-cancel-game').addEventListener('click', () => this.toggleForm(false));
  },

  toggleForm(show = null) {
    const form = document.getElementById('game-form');
    if (show === null) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    } else {
      form.style.display = show ? 'block' : 'none';
    }

    if (form.style.display === 'none') {
      this.clearForm();
    }
  },

  clearForm() {
    document.getElementById('game-name').value = '';
    document.getElementById('game-platform').value = 'PC';
    document.getElementById('game-status').value = 'เล่นจบแล้ว';
    document.getElementById('game-cover').value = '';
    document.getElementById('game-note').value = '';
  },

  save() {
    const name = document.getElementById('game-name').value.trim();
    if (!name) {
      alert('กรุณาใส่ชื่อเกม');
      return;
    }

    const game = {
      id: Date.now(),
      name,
      platform: document.getElementById('game-platform').value,
      status: document.getElementById('game-status').value,
      cover: document.getElementById('game-cover').value.trim(),
      note: document.getElementById('game-note').value.trim(),
      createdAt: new Date().toISOString()
    };

    this.games.unshift(game);
    this.persist();
    this.render();
    this.toggleForm(false);
  },

  delete(id) {
    if (!confirm('ลบเกมนี้?')) return;
    this.games = this.games.filter(g => g.id !== id);
    this.persist();
    this.render();
  },

  load() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  },

  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.games));
  },

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  render() {
    const grid = document.getElementById('games-grid');

    if (this.games.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="ti ti-device-gamepad-2"></i>
          <p>ยังไม่มีเกม กด "+ เพิ่มเกม" ได้เลย 🎮</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.games.map(game => `
      <div class="game-card" data-id="${game.id}">
        <div class="game-card-cover">
          ${game.cover
            ? `<img src="${this.escapeHtml(game.cover)}" alt="${this.escapeHtml(game.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><i class="ti ti-device-gamepad-2" style="display:none"></i>`
            : '<i class="ti ti-device-gamepad-2"></i>'
          }
        </div>
        <div class="game-card-info">
          <div class="game-card-title">${this.escapeHtml(game.name)}</div>
          <div class="game-card-meta">
            <span class="game-card-platform">${game.platform}</span>
            <span class="game-card-status status-${game.status}">${game.status}</span>
          </div>
        </div>
        <div class="game-card-actions">
          <button data-action="delete" title="ลบ"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('');

    // Attach events
    grid.querySelectorAll('.game-card').forEach(card => {
      const id = Number(card.dataset.id);
      const game = this.games.find(g => g.id === id);

      card.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          this.showDetail(game);
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.delete(id);
      });
    });
  },

  showDetail(game) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'game-modal active';
    modal.innerHTML = `
      <div class="game-modal-content">
        <div class="game-modal-header">
          <div class="game-modal-cover">
            ${game.cover
              ? `<img src="${this.escapeHtml(game.cover)}" alt="">`
              : '<i class="ti ti-device-gamepad-2" style="font-size:64px;color:var(--text3)"></i>'
            }
          </div>
          <button class="game-modal-close"><i class="ti ti-x"></i></button>
        </div>
        <div class="game-modal-body">
          <div class="game-modal-title">${this.escapeHtml(game.name)}</div>
          <div class="game-modal-meta">
            <span>🎮 ${game.platform}</span>
            <span class="game-card-status status-${game.status}">${game.status}</span>
          </div>
          ${game.note ? `<div class="game-modal-note">${this.escapeHtml(game.note)}</div>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.game-modal-close')) {
        modal.remove();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => GamesModule.init());
