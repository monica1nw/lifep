// ===== AUTHENTICATION MODULE =====
const Auth = {
  user: null,
  auth: null,
  db: null,
  ready: false,
  listeners: [],

  async init() {
    // Wait for Firebase to be available
    if (!window.firebase) {
      console.warn('Auth: Firebase not available');
      this.showLoginOnly();
      return;
    }

    try {
      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // Listen for auth state changes
      this.auth.onAuthStateChanged((user) => {
        this.user = user;
        this.updateUI();
        this.notify();

        if (user) {
          console.log('Auth: User signed in', user.email);
          this.saveUserToFirestore(user);
          this.migrateOldData(user);
        } else {
          console.log('Auth: User signed out');
        }
      });

      this.ready = true;
    } catch (error) {
      console.error('Auth: Init failed', error);
      this.showLoginOnly();
    }
  },

  onReady(callback) {
    if (this.ready) callback();
    else this.listeners.push(callback);
  },

  notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.warn('Auth callback error:', e); }
    });
  },

  // ===== UI UPDATES =====
  updateUI() {
    const authOverlay = document.getElementById('auth-overlay');
    const userSection = document.getElementById('user-section');
    const loginPrompt = document.getElementById('login-prompt');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');

    if (this.user) {
      // User is logged in
      if (authOverlay) authOverlay.classList.add('hidden');
      if (userSection) userSection.style.display = 'block';
      if (loginPrompt) loginPrompt.style.display = 'none';

      // Update user info
      const displayName = this.user.displayName || this.user.email?.split('@')[0] || 'User';
      const initial = displayName.charAt(0).toUpperCase();
      const photoURL = this.user.photoURL;

      if (userAvatar) {
        if (photoURL) {
          userAvatar.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
        } else {
          userAvatar.innerHTML = initial;
        }
      }

      if (userName) userName.textContent = displayName;
      if (userEmail) userEmail.textContent = this.user.email;

    } else {
      // User is not logged in - allow app usage but show login prompt
      if (authOverlay) authOverlay.classList.add('hidden');
      if (userSection) userSection.style.display = 'none';
      if (loginPrompt) loginPrompt.style.display = 'block';
    }
  },

  showLoginOnly() {
    const authOverlay = document.getElementById('auth-overlay');
    const userSection = document.getElementById('user-section');

    if (authOverlay) authOverlay.classList.remove('hidden');
    if (userSection) userSection.style.display = 'none';
  },

  // ===== AUTH ACTIONS =====
  async login(email, password) {
    try {
      await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  async register(name, email, password) {
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);

      // Update display name
      if (result.user) {
        await result.user.updateProfile({ displayName: name });
        await this.saveUserToFirestore(result.user);
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await this.auth.signInWithPopup(provider);

      if (result.user) {
        await this.saveUserToFirestore(result.user);
      }

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  },

  async logout() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== USER DATA =====
  async saveUserToFirestore(user) {
    if (!this.db || !user) return;

    try {
      const userRef = this.db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        // New user - create profile
        await userRef.set({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          photoURL: user.photoURL || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          public: false,
          bio: ''
        });
      } else {
        // Update last login
        await userRef.update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.warn('Auth: Could not save user to Firestore', error);
    }
  },

  // ===== MIGRATE OLD DATA =====
  async migrateOldData(user) {
    if (!this.db || !user) return;

    const oldKeys = [
      'myspace-todos', 'myspace-notes', 'myspace-events',
      'myspace-profile', 'myspace-music', 'myspace-movies',
      'myspace-diary', 'myspace-games', 'myspace-gallery'
    ];

    const collectionNames = ['todos', 'notes', 'events', 'profile', 'music', 'movies', 'diary', 'games', 'gallery'];

    let migrated = [];

    try {
      // Check if user already has data in Firestore
      const userDocRef = this.db.collection('lifep').doc(user.uid).collection('data').doc('profile');
      const existingDoc = await userDocRef.get();

      if (existingDoc.exists) {
        console.log('Auth: User already has cloud data, skipping migration');
        return;
      }

      // Migrate each collection
      for (let i = 0; i < oldKeys.length; i++) {
        const key = oldKeys[i];
        const collection = collectionNames[i];
        const dataStr = localStorage.getItem(key);

        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            const hasData = Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;

            if (hasData) {
              // Save to user's Firestore path
              const docRef = this.db.collection('lifep').doc(user.uid).collection('data').doc(collection);
              await docRef.set({
                value: data,
                migratedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              migrated.push(collection);
              console.log(`Auth: Migrated ${collection}`);
            }
          } catch (e) {
            console.warn(`Auth: Failed to migrate ${collection}:`, e);
          }
        }
      }

      if (migrated.length > 0) {
        console.log(`Auth: Migration complete! Migrated: ${migrated.join(', ')}`);
        // Show success message
        this.showMigrationSuccess(migrated);
      }
    } catch (error) {
      console.error('Auth: Migration failed:', error);
    }
  },

  showMigrationSuccess(migrated) {
    const toast = document.createElement('div');
    toast.className = 'migration-toast';
    toast.innerHTML = `
      <i class="ti ti-cloud-upload"></i>
      <span>ย้ายข้อมูล ${migrated.length} รายการไปยังบัญชีของคุณแล้ว!</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 5000);
  },

  async getUserProfile(uid) {
    if (!this.db) return null;

    try {
      const doc = await this.db.collection('users').doc(uid).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.warn('Auth: Could not get user profile', error);
      return null;
    }
  },

  async updateUserProfile(data) {
    if (!this.db || !this.user) return { success: false, error: 'Not logged in' };

    try {
      await this.db.collection('users').doc(this.user.uid).update(data);
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== SEARCH USERS =====
  async searchUsers(query) {
    if (!this.db || !query) return [];

    try {
      const snapshot = await this.db.collection('users')
        .where('public', '==', true)
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '')
        .limit(10)
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('Search error:', error);
      return [];
    }
  },

  // ===== ERROR MESSAGES =====
  getErrorMessage(code) {
    const messages = {
      'auth/invalid-email': 'อีเมลไม่ถูกต้อง',
      'auth/user-disabled': 'บัญชีนี้ถูกระงับ',
      'auth/user-not-found': 'ไม่พบบัญชีผู้ใช้',
      'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
      'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
      'auth/weak-password': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      'auth/popup-closed-by-user': 'การล็อกอินถูกยกเลิก',
      'auth/popup-blocked': 'หน้าต่างป๊อปอัพถูกบล็อก กรุณาอนุญาตในเบราว์เซอร์',
      'auth/network-request-failed': 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่',
      'auth/too-many-requests': 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่'
    };

    return messages[code] || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  }
};

// ===== UI EVENT HANDLERS =====
function initAuthUI() {
  const loginForm = document.getElementById('login-form');
  const authError = document.getElementById('auth-error');
  const authOverlay = document.getElementById('auth-overlay');

  // Show login button in sidebar
  const btnShowLogin = document.getElementById('btn-show-login');
  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', () => {
      if (authOverlay) authOverlay.classList.remove('hidden');
    });
  }

  // Close auth overlay (skip login)
  const btnCloseAuth = document.getElementById('btn-close-auth');
  if (btnCloseAuth) {
    btnCloseAuth.addEventListener('click', () => {
      if (authOverlay) authOverlay.classList.add('hidden');
    });
  }

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById('tab-' + tabName)?.classList.add('active');

      if (authError) authError.textContent = '';
    });
  });

  // Login
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;

      if (!email || !password) {
        authError.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
        return;
      }

      btnLogin.disabled = true;
      btnLogin.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> กำลังเข้าสู่ระบบ...';

      const result = await Auth.login(email, password);

      if (!result.success) {
        authError.textContent = result.error;
      }

      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="ti ti-login"></i> เข้าสู่ระบบ';
    });
  }

  // Register
  const btnRegister = document.getElementById('btn-register');
  if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
      const name = document.getElementById('register-name')?.value.trim();
      const email = document.getElementById('register-email')?.value.trim();
      const password = document.getElementById('register-password')?.value;

      if (!name || !email || !password) {
        authError.textContent = 'กรุณากรอกข้อมูลให้ครบ';
        return;
      }

      if (password.length < 6) {
        authError.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        return;
      }

      btnRegister.disabled = true;
      btnRegister.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> กำลังสมัครสมาชิก...';

      const result = await Auth.register(name, email, password);

      if (!result.success) {
        authError.textContent = result.error;
      }

      btnRegister.disabled = false;
      btnRegister.innerHTML = '<i class="ti ti-user-plus"></i> สมัครสมาชิก';
    });
  }

  // Google Login (from login tab)
  const btnGoogleLogin = document.getElementById('btn-google-login');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      btnGoogleLogin.disabled = true;
      btnGoogleLogin.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> กำลังเชื่อมต่อ...';

      const result = await Auth.loginWithGoogle();

      if (!result.success) {
        authError.textContent = result.error;
      }

      btnGoogleLogin.disabled = false;
      btnGoogleLogin.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      `;
    });
  }

  // Google Register (from register tab)
  const btnGoogleRegister = document.getElementById('btn-google-register');
  if (btnGoogleRegister) {
    btnGoogleRegister.addEventListener('click', async () => {
      btnGoogleRegister.disabled = true;
      btnGoogleRegister.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> กำลังเชื่อมต่อ...';

      const result = await Auth.loginWithGoogle();

      if (!result.success) {
        authError.textContent = result.error;
      }

      btnGoogleRegister.disabled = false;
      btnGoogleRegister.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        สมัครด้วย Google
      `;
    });
  }

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('ต้องการออกจากระบบ?')) {
        await Auth.logout();
      }
    });
  }

  // Search Users
  const btnSearchUser = document.getElementById('btn-search-user');
  const searchModal = document.getElementById('search-modal');
  const searchInput = document.getElementById('user-search-input');
  const searchResults = document.getElementById('search-results');
  const searchClose = document.getElementById('search-close');

  if (btnSearchUser && searchModal) {
    btnSearchUser.addEventListener('click', () => {
      searchModal.style.display = 'flex';
      searchInput?.focus();
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', () => {
      searchModal.style.display = 'none';
      if (searchInput) searchInput.value = '';
      if (searchResults) searchResults.innerHTML = '';
    });
  }

  if (searchModal) {
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        searchModal.style.display = 'none';
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
      }
    });
  }

  // Search input
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();

      if (query.length < 2) {
        searchResults.innerHTML = '<div class="search-empty">พิมพ์อย่างน้อย 2 ตัวอักษร</div>';
        return;
      }

      searchResults.innerHTML = '<div class="search-empty"><i class="ti ti-loader-2 ti-spin"></i> ค้นหา...</div>';

      searchTimeout = setTimeout(async () => {
        const users = await Auth.searchUsers(query);

        if (users.length === 0) {
          searchResults.innerHTML = '<div class="search-empty">ไม่พบผู้ใช้</div>';
          return;
        }

        searchResults.innerHTML = users.map(user => `
          <div class="search-result-item" data-uid="${user.uid}">
            <div class="search-result-avatar">${(user.displayName || 'U').charAt(0).toUpperCase()}</div>
            <div>
              <div class="search-result-name">${user.displayName || 'Unknown'}</div>
              <div class="search-result-email">${user.email || ''}</div>
            </div>
          </div>
        `).join('');

        // Click on result
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
          item.addEventListener('click', async () => {
            const uid = item.dataset.uid;
            await showPublicProfile(uid);
            searchModal.style.display = 'none';
            searchInput.value = '';
            searchResults.innerHTML = '';
          });
        });
      }, 300);
    });
  }

  // Profile Modal close
  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-close');

  if (profileClose) {
    profileClose.addEventListener('click', () => {
      profileModal.style.display = 'none';
    });
  }

  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        profileModal.style.display = 'none';
      }
    });
  }
}

// ===== SHOW PUBLIC PROFILE =====
async function showPublicProfile(uid) {
  const profileModal = document.getElementById('profile-modal');
  const publicProfile = document.getElementById('public-profile');

  if (!profileModal || !publicProfile) return;

  publicProfile.innerHTML = '<div class="search-empty"><i class="ti ti-loader-2 ti-spin"></i> โหลด...</div>';
  profileModal.style.display = 'flex';

  const user = await Auth.getUserProfile(uid);

  if (!user) {
    publicProfile.innerHTML = '<div class="search-empty">ไม่พบโปรไฟล์</div>';
    return;
  }

  const initial = (user.displayName || 'U').charAt(0).toUpperCase();
  const photoHTML = user.photoURL
    ? `<img src="${user.photoURL}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : initial;

  const socialLinks = [];
  if (user.facebook) socialLinks.push(`<a href="${user.facebook}" target="_blank"><i class="ti ti-brand-facebook"></i> Facebook</a>`);
  if (user.discord) socialLinks.push(`<a href="https://discord.com/users/${user.discord}" target="_blank"><i class="ti ti-brand-discord"></i> Discord</a>`);
  if (user.instagram) socialLinks.push(`<a href="https://instagram.com/${user.instagram.replace('@', '')}" target="_blank"><i class="ti ti-brand-instagram"></i> Instagram</a>`);

  publicProfile.innerHTML = `
    <div class="public-profile-avatar">${photoHTML}</div>
    <div class="public-profile-name">${user.displayName || 'Unknown'}</div>
    <div class="public-profile-bio">${user.bio || 'ยังไม่มีคำแนะนำตัว'}</div>
    ${socialLinks.length ? `<div class="public-profile-links">${socialLinks.join('')}</div>` : ''}
  `;
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase to be ready
  const checkFirebase = setInterval(() => {
    if (window.firebase?.auth) {
      clearInterval(checkFirebase);
      Auth.init();
      initAuthUI();
    }
  }, 100);

  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkFirebase);
    if (!Auth.ready) {
      console.warn('Auth: Firebase Auth not available after timeout');
      Auth.showLoginOnly();
    }
  }, 5000);
});

// Export for other modules
window.LifePAuth = Auth;
