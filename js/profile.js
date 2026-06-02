// ===== PROFILE MODULE =====

const ProfileModule = {
  storageKey: 'profile',
  cloudinary: window.LIFEP_CLOUDINARY_CONFIG || {
    cloudName: 'ddgpq2zef',
    uploadPreset: 'lifep_upload'
  },

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
  async handlePhotoUpload(e) {
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

    try {
      this.showSaveStatus('กำลังอัปโหลดรูป...');
      const imageUrl = await this.uploadToCloudinary(file);
      this.updatePhoto(imageUrl);
      this.save();
    } catch (error) {
      console.error('Profile upload error:', error);
      alert('อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: ' + error.message);
      this.showSaveStatus('');
    } finally {
      e.target.value = '';
    }
  },

  async uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinary.uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudinary.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data.secure_url;
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
      facebook: document.getElementById('profile-facebook').value.trim(),
      discord: document.getElementById('profile-discord').value.trim(),
      instagram: document.getElementById('profile-instagram').value.trim(),
      note: document.getElementById('profile-note').value.trim(),
      photo: this.getPhotoData(),
      updatedAt: new Date().toISOString()
    };

    DB.save(this.storageKey, profile);
    this.showSaveStatus('บันทึกแล้ว ✓');
  },

  // Load profile
  load() {
    const profile = DB.get(this.storageKey);
    if (!profile || Object.keys(profile).length === 0) return;

    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-address').value = profile.address || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-birthday').value = profile.birthday || '';
    document.getElementById('profile-facebook').value = profile.facebook || '';
    document.getElementById('profile-discord').value = profile.discord || '';
    document.getElementById('profile-instagram').value = profile.instagram || '';
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
  DB.onReady(() => ProfileModule.load());
});
