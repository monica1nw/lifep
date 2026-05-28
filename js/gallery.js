// ===== GALLERY MODULE =====

const GalleryModule = {
  storageKey: 'myspace-gallery',
  photos: [],
  pendingFiles: [],
  currentAlbum: 'all',

  init() {
    this.photos = this.load();
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Add photo button
    document.getElementById('btn-add-photo').addEventListener('click', () => this.toggleForm());
    document.getElementById('btn-cancel-photo').addEventListener('click', () => this.toggleForm(false));

    // Select photo
    document.getElementById('btn-select-photo').addEventListener('click', () => {
      document.getElementById('photo-file').click();
    });

    document.getElementById('photo-file').addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Save photo
    document.getElementById('btn-save-photo').addEventListener('click', () => this.save());

    // Album filter
    document.querySelectorAll('.album-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.album-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAlbum = btn.dataset.album;
        this.render();
      });
    });
  },

  toggleForm(show = null) {
    const form = document.getElementById('photo-form');
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
    document.getElementById('photo-title').value = '';
    document.getElementById('photo-album').value = 'ทั่วไป';
    document.getElementById('photo-preview').innerHTML = '';
    document.getElementById('photo-file').value = '';
    this.pendingFiles = [];
  },

  handleFiles(files) {
    const preview = document.getElementById('photo-preview');

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const id = Date.now() + Math.random();
        this.pendingFiles.push({ id, data: e.target.result });

        preview.innerHTML += `
          <div class="photo-preview-item" data-id="${id}">
            <img src="${e.target.result}" alt="">
            <button onclick="GalleryModule.removePending(${id})"><i class="ti ti-x"></i></button>
          </div>
        `;
      };
      reader.readAsDataURL(file);
    });
  },

  removePending(id) {
    this.pendingFiles = this.pendingFiles.filter(f => f.id !== id);
    document.querySelector(`.photo-preview-item[data-id="${id}"]`)?.remove();
  },

  save() {
    if (this.pendingFiles.length === 0) {
      alert('กรุณาเลือกรูป');
      return;
    }

    const title = document.getElementById('photo-title').value.trim();
    const album = document.getElementById('photo-album').value;

    this.pendingFiles.forEach(file => {
      this.photos.unshift({
        id: Date.now() + Math.random(),
        title: title || 'ไม่มีชื่อ',
        album,
        data: file.data,
        createdAt: new Date().toISOString()
      });
    });

    this.persist();
    this.render();
    this.toggleForm(false);
  },

  delete(id) {
    if (!confirm('ลบรูปนี้?')) return;
    this.photos = this.photos.filter(p => p.id !== id);
    this.persist();
    this.render();
  },

  load() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  },

  persist() {
    // Limit storage - only keep last 50 photos
    if (this.photos.length > 50) {
      this.photos = this.photos.slice(0, 50);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.photos));
  },

  escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  render() {
    const grid = document.getElementById('gallery-grid');
    let filtered = this.photos;

    if (this.currentAlbum !== 'all') {
      filtered = this.photos.filter(p => p.album === this.currentAlbum);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          <i class="ti ti-photo-off"></i>
          <p>ยังไม่มีรูป กด "+ เพิ่มรูป" ได้เลย 📷</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(photo => `
      <div class="photo-card" data-id="${photo.id}">
        <img src="${photo.data}" alt="${this.escapeHtml(photo.title)}">
        <div class="photo-card-overlay">
          <div class="photo-card-title">${this.escapeHtml(photo.title)}</div>
        </div>
        <div class="photo-card-actions">
          <button data-action="delete" title="ลบ"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('');

    // Attach events
    grid.querySelectorAll('.photo-card').forEach(card => {
      const id = Number(card.dataset.id);
      const photo = this.photos.find(p => p.id === id);

      card.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          this.showFull(photo);
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.delete(id);
      });
    });
  },

  showFull(photo) {
    const modal = document.createElement('div');
    modal.className = 'photo-modal active';
    modal.innerHTML = `
      <img src="${photo.data}" alt="">
      <button class="photo-modal-close"><i class="ti ti-x"></i></button>
      <div class="photo-modal-info">
        <div class="photo-modal-title">${this.escapeHtml(photo.title)}</div>
        <div class="photo-modal-album">📁 ${photo.album}</div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.photo-modal-close')) {
        modal.remove();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => GalleryModule.init());
