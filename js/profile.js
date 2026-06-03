// ===== PROFILE MODULE =====

const ProfileModule = {
  storageKey: 'profile',
  cloudinary: window.LIFEP_CLOUDINARY_CONFIG || {
    cloudName: 'ddgpq2zef',
    uploadPreset: 'lifep_upload'
  },

  // Privacy levels for each field
  privacyFields: ['name', 'address', 'phone', 'email', 'birthday', 'facebook', 'discord', 'instagram', 'note'],

  // Default privacy settings
  defaultPrivacy: {
    name: 'public',
    address: 'private',
    phone: 'followers',
    email: 'private',
    birthday: 'followers',
    facebook: 'public',
    discord: 'public',
    instagram: 'public',
    note: 'private'
  },

  // Initialize
  init() {
    this.bindEvents();
    this.load();
    this.initPrivacySettings();
  },

  // Bind events
  bindEvents() {
    // Photo upload
    document.getElementById('btn-change-photo')?.addEventListener('click', () => {
      document.getElementById('profile-photo-input')?.click();
    });

    document.getElementById('profile-photo-input')?.addEventListener('change', (e) => {
      this.handlePhotoUpload(e);
    });

    // Save profile
    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      this.save();
    });
  },

  // Initialize privacy settings UI
  initPrivacySettings() {
    const privacyContainer = document.getElementById('privacy-settings-container');
    if (!privacyContainer) return;

    const privacy = this.getPrivacySettings();

    privacyContainer.innerHTML = `
      <div class="privacy-section">
        <h4><i class="ti ti-lock"></i> การเข้าถึงข้อมูล</h4>
        <p class="privacy-hint">เลือกว่าใครสามารถเห็นข้อมูลแต่ละอย่างได้</p>
        <div class="privacy-legend">
          <span class="privacy-legend-item"><i class="ti ti-world"></i> สาธารณะ</span>
          <span class="privacy-legend-item"><i class="ti ti-users"></i> ผู้ติดตาม</span>
          <span class="privacy-legend-item"><i class="ti ti-lock"></i> ส่วนตัว</span>
        </div>
        <div class="privacy-fields">
          ${this.privacyFields.map(field => `
            <div class="privacy-field-row">
              <label class="privacy-field-label">${this.getFieldLabel(field)}</label>
              <div class="privacy-field-options">
                <button class="privacy-btn ${privacy[field] === 'public' ? 'active' : ''}" data-field="${field}" data-level="public" title="สาธารณะ">
                  <i class="ti ti-world"></i>
                </button>
                <button class="privacy-btn ${privacy[field] === 'followers' ? 'active' : ''}" data-field="${field}" data-level="followers" title="ผู้ติดตาม">
                  <i class="ti ti-users"></i>
                </button>
                <button class="privacy-btn ${privacy[field] === 'private' ? 'active' : ''}" data-field="${field}" data-level="private" title="ส่วนตัว">
                  <i class="ti ti-lock"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind privacy button events
    privacyContainer.querySelectorAll('.privacy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        const level = btn.dataset.level;

        // Update UI
        btn.parentElement.querySelectorAll('.privacy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Save privacy setting
        this.savePrivacySetting(field, level);
      });
    });
  },

  // Get field label in Thai
  getFieldLabel(field) {
    const labels = {
      name: 'ชื่อ',
      address: 'ที่อยู่',
      phone: 'เบอร์โทร',
      email: 'อีเมล',
      birthday: 'วันเกิด',
      facebook: 'Facebook',
      discord: 'Discord',
      instagram: 'Instagram',
      note: 'บันทึกเพิ่มเติม'
    };
    return labels[field] || field;
  },

  // Get privacy settings
  getPrivacySettings() {
    const profile = DB.get(this.storageKey);
    return profile?.privacy || { ...this.defaultPrivacy };
  },

  // Save privacy setting
  savePrivacySetting(field, level) {
    const profile = DB.get(this.storageKey) || {};
    profile.privacy = profile.privacy || { ...this.defaultPrivacy };
    profile.privacy[field] = level;
    DB.save(this.storageKey, profile);
  },

  // Check if a field can be viewed by someone
  canViewField(field, viewerUid, ownerUid) {
    const privacy = this.getPrivacySettings();

    // Owner can always see their own data
    if (viewerUid === ownerUid) return true;

    const level = privacy[field] || 'private';

    switch (level) {
      case 'public':
        return true;
      case 'followers':
        // Check if viewer is following owner
        return window.FollowSystem?.isFollowing?.(ownerUid) || false;
      case 'private':
      default:
        return false;
    }
  },

  // Get public profile data (respecting privacy settings)
  async getPublicProfile(uid, viewerUid) {
    const profile = await this.getUserProfile(uid);
    if (!profile) return null;

    const publicProfile = {};
    const isOwner = viewerUid === uid;

    for (const field of this.privacyFields) {
      if (isOwner || this.canViewField(field, viewerUid, uid)) {
        publicProfile[field] = profile[field];
      } else {
        publicProfile[field] = null; // Hidden
      }
    }

    publicProfile.photo = profile.photo;
    publicProfile.privacy = profile.privacy;

    return publicProfile;
  },

  // Get user profile from Firestore
  async getUserProfile(uid) {
    if (!window.LifePDB?.db) return null;

    try {
      const db = firebase.firestore();
      const doc = await db.collection('lifep').doc(uid).collection('data').doc('profile').get();
      return doc.exists ? doc.data().value : null;
    } catch {
      return null;
    }
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
      name: document.getElementById('profile-name')?.value.trim() || '',
      address: document.getElementById('profile-address')?.value.trim() || '',
      phone: document.getElementById('profile-phone')?.value.trim() || '',
      email: document.getElementById('profile-email')?.value.trim() || '',
      birthday: document.getElementById('profile-birthday')?.value || '',
      facebook: document.getElementById('profile-facebook')?.value.trim() || '',
      discord: document.getElementById('profile-discord')?.value.trim() || '',
      instagram: document.getElementById('profile-instagram')?.value.trim() || '',
      note: document.getElementById('profile-note')?.value.trim() || '',
      photo: this.getPhotoData(),
      privacy: this.getPrivacySettings(),
      updatedAt: new Date().toISOString()
    };

    DB.save(this.storageKey, profile);
    this.showSaveStatus('บันทึกแล้ว ✓');

    // Sync to user's public profile in users collection
    this.syncToUserDocument(profile);
  },

  // Sync profile to user document (for search/display)
  async syncToUserDocument(profile) {
    if (!window.LifePAuth?.user || !window.LifePDB?.db) return;

    try {
      const db = firebase.firestore();
      await db.collection('users').doc(window.LifePAuth.user.uid).update({
        displayName: profile.name,
        photoURL: profile.photo,
        bio: profile.note,
        facebook: profile.facebook,
        discord: profile.discord,
        instagram: profile.instagram
      });
    } catch (error) {
      console.warn('Could not sync profile to user document:', error);
    }
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
    const img = photoEl?.querySelector('img');
    return img ? img.src : null;
  },

  // Show save status
  showSaveStatus(message) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.textContent = '';
      }, 2000);
    }
  },

  // Show profile lock verification
  async verifyProfileLock() {
    const settings = window.Settings?.get();
    if (settings?.profileLockEnabled) {
      return await window.showVerifyPinModal?.();
    }
    return true;
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ProfileModule.init();
  DB.onReady(() => ProfileModule.load());
});

window.ProfileModule = ProfileModule;
