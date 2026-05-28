// ===== PROFILE MODULE =====

const ProfileModule = {
  storageKey: 'myspace-profile',

  // Initialize
  init() {
    this.bindEvents();
    this.load();
  },

  // Bind events
  bindEvents() {
    // Photo upload
    document.getElementById('btn-change-photo').addEventListener('click', () => {
      document.getElementById('profile-photo-input').click();
    });

    document.getElementById('profile-photo-input').addEventListener('change', (e) => {
      this.handlePhotoUpload(e);
    });

    // Save profile
    document.getElementById('btn-save-profile').addEventListener('click', () => {
      this.save();
    });
  },

  // Handle photo upload
  handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    // Read and save as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      this.updatePhoto(event.target.result);
      this.save();
    };
    reader.readAsDataURL(file);
  },

  // Update photo display
  updatePhoto(imageUrl) {
    const photoEl = document.getElementById('profile-photo');
    if (imageUrl) {
      photoEl.innerHTML = `<img src="${imageUrl}" alt="Profile Photo">`;
    } else {
      photoEl.innerHTML = '<i class="ti ti-user"></i>';
    }
  },

  // Save profile
  save() {
    const profile = {
      name: document.getElementById('profile-name').value.trim(),
      address: document.getElementById('profile-address').value.trim(),
      phone: document.getElementById('profile-phone').value.trim(),
      email: document.getElementById('profile-email').value.trim(),
      birthday: document.getElementById('profile-birthday').value,
      note: document.getElementById('profile-note').value.trim(),
      photo: this.getPhotoData(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.storageKey, JSON.stringify(profile));
    this.showSaveStatus('บันทึกแล้ว ✓');
  },

  // Load profile
  load() {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return;

    const profile = JSON.parse(data);

    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-address').value = profile.address || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-birthday').value = profile.birthday || '';
    document.getElementById('profile-note').value = profile.note || '';

    if (profile.photo) {
      this.updatePhoto(profile.photo);
    }
  },

  // Get photo data from current display
  getPhotoData() {
    const photoEl = document.getElementById('profile-photo');
    const img = photoEl.querySelector('img');
    return img ? img.src : null;
  },

  // Show save status
  showSaveStatus(message) {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = message;
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ProfileModule.init();
});
