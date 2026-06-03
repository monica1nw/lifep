// ===== MOVIES MODULE =====

const MoviesModule = {
  storageKey: 'movies',
  movies: [],
  currentFilter: 'all',
  selectedRating: 0,

  init() {
    this.movies = this.load();
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Add movie button
    document.getElementById('btn-add-movie').addEventListener('click', () => this.toggleForm());
    document.getElementById('btn-cancel-movie').addEventListener('click', () => this.toggleForm(false));
    document.getElementById('btn-save-movie').addEventListener('click', () => this.save());

    // Rating stars
    document.querySelectorAll('#movie-rating-input .star').forEach(star => {
      star.addEventListener('click', () => {
        this.selectedRating = parseInt(star.dataset.rating);
        this.updateRatingDisplay();
      });

      star.addEventListener('mouseenter', () => {
        this.highlightStars(parseInt(star.dataset.rating));
      });
    });

    document.getElementById('movie-rating-input').addEventListener('mouseleave', () => {
      this.updateRatingDisplay();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });
  },

  toggleForm(show = null) {
    const form = document.getElementById('movie-form');
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
    document.getElementById('movie-title').value = '';
    document.getElementById('movie-type').value = 'movie';
    document.getElementById('movie-status').value = 'อยากดู';
    document.getElementById('movie-poster').value = '';
    document.getElementById('movie-note').value = '';
    this.selectedRating = 0;
    this.updateRatingDisplay();
  },

  highlightStars(rating) {
    document.querySelectorAll('#movie-rating-input .star').forEach((star, index) => {
      star.classList.toggle('active', index < rating);
    });
  },

  updateRatingDisplay() {
    this.highlightStars(this.selectedRating);
    document.getElementById('movie-rating').value = this.selectedRating;
  },

  save() {
    const title = document.getElementById('movie-title').value.trim();
    if (!title) {
      alert('กรุณาใส่ชื่อเรื่อง');
      return;
    }

    const movie = {
      id: Date.now(),
      title,
      type: document.getElementById('movie-type').value,
      status: document.getElementById('movie-status').value,
      rating: this.selectedRating,
      poster: document.getElementById('movie-poster').value.trim(),
      note: document.getElementById('movie-note').value.trim(),
      createdAt: new Date().toISOString()
    };

    this.movies.unshift(movie);
    this.persist();
    this.render();
    this.toggleForm(false);
  },

  delete(id) {
    if (!confirm('ลบรายการนี้?')) return;
    this.movies = this.movies.filter(m => m.id !== id);
    this.persist();
    this.render();
  },

  load() {
    return DB.get(this.storageKey);
  },

  persist() {
    DB.save(this.storageKey, this.movies);
  },

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  getStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  },

  render() {
    const grid = document.getElementById('movies-grid');

    let filtered = this.movies;
    if (this.currentFilter !== 'all') {
      filtered = this.movies.filter(m => m.status === this.currentFilter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="movies-empty">
          <i class="ti ti-device-tv-off"></i>
          <p>ยังไม่มีรายการ กด "+ เพิ่มรายการ" ได้เลย 🎬</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(movie => `
      <div class="movie-card" data-id="${movie.id}">
        <div class="movie-card-poster">
          ${movie.poster
            ? `<img src="${this.escapeHtml(movie.poster)}" alt="${this.escapeHtml(movie.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><i class="ti ti-device-tv" style="display:none"></i>`
            : '<i class="ti ti-device-tv"></i>'
          }
        </div>
        <div class="movie-card-info">
          <div class="movie-card-title">${this.escapeHtml(movie.title)}</div>
          <div class="movie-card-meta">
            <span class="movie-card-type">${movie.type === 'movie' ? '🎬 หนัง' : '📺 ซีรีส์'}</span>
            <span class="movie-card-status status-${movie.status}">${movie.status}</span>
          </div>
          ${movie.rating > 0 ? `<div class="movie-card-rating">${this.getStars(movie.rating)}</div>` : ''}
        </div>
        <div class="movie-card-actions">
          <button data-action="delete" title="ลบ"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('');

    // Attach events
    grid.querySelectorAll('.movie-card').forEach(card => {
      const id = Number(card.dataset.id);
      const movie = this.movies.find(m => m.id === id);

      card.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          this.showDetail(movie);
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.delete(id);
      });
    });
  },

  showDetail(movie) {
    const modal = document.createElement('div');
    modal.className = 'movie-modal active';
    modal.innerHTML = `
      <div class="movie-modal-content">
        <div class="movie-modal-header">
          <div class="movie-modal-poster">
            ${movie.poster
              ? `<img src="${this.escapeHtml(movie.poster)}" alt="">`
              : '<i class="ti ti-device-tv"></i>'
            }
          </div>
          <button class="movie-modal-close"><i class="ti ti-x"></i></button>
        </div>
        <div class="movie-modal-body">
          <div class="movie-modal-title">${this.escapeHtml(movie.title)}</div>
          <div class="movie-modal-meta">
            <span>${movie.type === 'movie' ? '🎬 หนัง' : '📺 ซีรีส์'}</span>
            <span class="movie-card-status status-${movie.status}">${movie.status}</span>
            ${movie.rating > 0 ? `<span class="movie-modal-rating">${this.getStars(movie.rating)}</span>` : ''}
          </div>
          ${movie.note ? `<div class="movie-modal-note">${this.escapeHtml(movie.note)}</div>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.movie-modal-close')) {
        modal.remove();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => MoviesModule.init());
document.addEventListener('DOMContentLoaded', () => {
  DB.onReady(() => {
    MoviesModule.movies = MoviesModule.load();
    MoviesModule.render();
  });
});
