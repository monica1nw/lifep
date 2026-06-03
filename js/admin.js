// ===== ADMIN MODULE =====
const Admin = {
  // Check if current user is admin
  async isAdmin() {
    const user = window.LifePAuth?.user;
    if (!user) return false;

    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(user.uid).get();
      return doc.exists && doc.data().admin === true;
    } catch {
      return false;
    }
  },

  // Get all users
  async getAllUsers(limit = 50, lastDoc = null) {
    try {
      const db = firebase.firestore();
      let query = db.collection('users').orderBy('createdAt', 'desc').limit(limit);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));

      return {
        users,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === limit
      };
    } catch (error) {
      console.error('Get users error:', error);
      return { users: [], lastDoc: null, hasMore: false };
    }
  },

  // Search users
  async searchUsers(query) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('users')
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '')
        .limit(20)
        .get();

      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  },

  // Get user by ID
  async getUser(uid) {
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? { uid: doc.id, ...doc.data() } : null;
    } catch {
      return null;
    }
  },

  // Ban user
  async banUser(uid, reason) {
    if (!await this.isAdmin()) {
      return { success: false, error: 'ไม่มีสิทธิ์ admin' };
    }

    try {
      const db = firebase.firestore();

      await db.collection('users').doc(uid).update({
        banned: true,
        bannedReason: reason,
        bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
        bannedBy: window.LifePAuth.user.uid
      });

      await this.logAdminAction('ban_user', { uid, reason });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Unban user
  async unbanUser(uid) {
    if (!await this.isAdmin()) {
      return { success: false, error: 'ไม่มีสิทธิ์ admin' };
    }

    try {
      const db = firebase.firestore();

      await db.collection('users').doc(uid).update({
        banned: false,
        bannedReason: null,
        bannedAt: null,
        bannedBy: null
      });

      await this.logAdminAction('unban_user', { uid });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete user data
  async deleteUserData(uid) {
    if (!await this.isAdmin()) {
      return { success: false, error: 'ไม่มีสิทธิ์ admin' };
    }

    try {
      const db = firebase.firestore();

      // Delete user's data collections
      const collections = ['todos', 'notes', 'events', 'profile', 'music', 'movies', 'diary', 'games', 'gallery', 'settings', 'follows'];
      const batch = db.batch();

      for (const collection of collections) {
        const docRef = db.collection('lifep').doc(uid).collection('data').doc(collection);
        batch.delete(docRef);
      }

      await batch.commit();

      await this.logAdminAction('delete_user_data', { uid });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set admin role
  async setAdminRole(uid, isAdmin) {
    if (!await this.isAdmin()) {
      return { success: false, error: 'ไม่มีสิทธิ์ admin' };
    }

    try {
      const db = firebase.firestore();
      await db.collection('users').doc(uid).update({
        admin: isAdmin
      });

      await this.logAdminAction('set_admin', { uid, isAdmin });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get activity logs
  async getActivityLogs(limit = 50, uid = null) {
    if (!await this.isAdmin()) {
      return [];
    }

    try {
      const db = firebase.firestore();
      let query = db.collection('admin_logs').orderBy('timestamp', 'desc').limit(limit);

      if (uid) {
        query = db.collection('users').doc(uid).collection('logs').orderBy('timestamp', 'desc').limit(limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch {
      return [];
    }
  },

  // Log admin action
  async logAdminAction(action, details) {
    try {
      const db = firebase.firestore();
      await db.collection('admin_logs').add({
        action,
        details,
        adminId: window.LifePAuth.user.uid,
        adminEmail: window.LifePAuth.user.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.warn('Log admin action error:', error);
    }
  },

  // Get system stats
  async getSystemStats() {
    if (!await this.isAdmin()) {
      return null;
    }

    try {
      const db = firebase.firestore();

      // Count users
      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;

      // Count active users (logged in within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activeUsers = usersSnapshot.docs.filter(doc => {
        const lastLogin = doc.data().lastLogin?.toDate?.();
        return lastLogin && lastLogin >= sevenDaysAgo;
      }).length;

      // Count banned users
      const bannedUsers = usersSnapshot.docs.filter(doc => doc.data().banned === true).length;

      // Count admin users
      const adminUsers = usersSnapshot.docs.filter(doc => doc.data().admin === true).length;

      return {
        totalUsers,
        activeUsers,
        bannedUsers,
        adminUsers
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }
};

// ===== RENDER ADMIN PAGE =====
async function renderAdminPage() {
  const container = document.getElementById('admin-container');
  if (!container) return;

  const isAdmin = await Admin.isAdmin();

  if (!isAdmin) {
    container.innerHTML = `
      <div class="admin-no-access">
        <i class="ti ti-lock"></i>
        <h3>ไม่มีสิทธิ์เข้าถึง</h3>
        <p>หน้านี้สำหรับ Admin เท่านั้น</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="admin-header">
      <h2><i class="ti ti-shield"></i> Admin Panel</h2>
      <p class="admin-subtitle">จัดการระบบและผู้ใช้</p>
    </div>

    <!-- Stats -->
    <div class="admin-stats" id="admin-stats">
      <div class="admin-stat-card">
        <div class="admin-stat-icon"><i class="ti ti-users"></i></div>
        <div class="admin-stat-content">
          <div class="admin-stat-value" id="stat-total-users">-</div>
          <div class="admin-stat-label">ผู้ใช้ทั้งหมด</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon green"><i class="ti ti-user-check"></i></div>
        <div class="admin-stat-content">
          <div class="admin-stat-value" id="stat-active-users">-</div>
          <div class="admin-stat-label">ผู้ใช้ที่ใช้งานล่าสุด</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon red"><i class="ti ti-user-off"></i></div>
        <div class="admin-stat-content">
          <div class="admin-stat-value" id="stat-banned-users">-</div>
          <div class="admin-stat-label">ผู้ใช้ที่ถูกแบน</div>
        </div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-icon purple"><i class="ti ti-crown"></i></div>
        <div class="admin-stat-content">
          <div class="admin-stat-value" id="stat-admin-users">-</div>
          <div class="admin-stat-label">Admin</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="users"><i class="ti ti-users"></i> ผู้ใช้</button>
      <button class="admin-tab" data-tab="logs"><i class="ti ti-history"></i> Logs</button>
    </div>

    <!-- Users Tab -->
    <div class="admin-tab-content active" id="tab-users">
      <div class="admin-search">
        <input type="text" id="admin-search-input" placeholder="ค้นหาผู้ใช้...">
        <button class="btn" id="admin-search-btn"><i class="ti ti-search"></i></button>
      </div>

      <div class="admin-users-table-container">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>อีเมล</th>
              <th>สถานะ</th>
              <th>สมัครเมื่อ</th>
              <th>การกระทำ</th>
            </tr>
          </thead>
          <tbody id="admin-users-list">
            <tr>
              <td colspan="5" class="admin-loading"><i class="ti ti-loader-2 ti-spin"></i> โหลด...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="admin-pagination">
        <button class="btn-outline" id="admin-prev-page" disabled><i class="ti ti-chevron-left"></i></button>
        <span id="admin-page-info">หน้า 1</span>
        <button class="btn-outline" id="admin-next-page"><i class="ti ti-chevron-right"></i></button>
      </div>
    </div>

    <!-- Logs Tab -->
    <div class="admin-tab-content" id="tab-logs">
      <div class="admin-logs" id="admin-logs-list">
        <div class="admin-loading"><i class="ti ti-loader-2 ti-spin"></i> โหลด...</div>
      </div>
    </div>
  `;

  // Load stats
  loadAdminStats();

  // Load users
  loadAdminUsers();

  // Load logs
  loadAdminLogs();

  // Bind events
  bindAdminEvents();
}

// ===== LOAD ADMIN STATS =====
async function loadAdminStats() {
  const stats = await Admin.getSystemStats();
  if (stats) {
    document.getElementById('stat-total-users').textContent = stats.totalUsers;
    document.getElementById('stat-active-users').textContent = stats.activeUsers;
    document.getElementById('stat-banned-users').textContent = stats.bannedUsers;
    document.getElementById('stat-admin-users').textContent = stats.adminUsers;
  }
}

// ===== LOAD ADMIN USERS =====
let adminLastDoc = null;
let adminPage = 1;

async function loadAdminUsers(searchQuery = '') {
  const tbody = document.getElementById('admin-users-list');
  if (!tbody) return;

  let result;
  if (searchQuery) {
    const users = await Admin.searchUsers(searchQuery);
    result = { users, lastDoc: null, hasMore: false };
  } else {
    result = await Admin.getAllUsers(20, adminLastDoc);
  }

  if (result.users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="admin-empty">ไม่พบผู้ใช้</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = result.users.map(user => `
    <tr class="${user.banned ? 'banned' : ''} ${user.admin ? 'admin-row' : ''}">
      <td>
        <div class="admin-user-cell">
          <div class="admin-user-avatar">${(user.displayName || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <div class="admin-user-name">${user.displayName || 'Unknown'}</div>
            <div class="admin-user-uid">${user.uid?.slice(0, 8)}...</div>
          </div>
        </div>
      </td>
      <td>${user.email || '-'}</td>
      <td>
        ${user.banned
          ? '<span class="admin-badge banned">ถูกแบน</span>'
          : user.admin
            ? '<span class="admin-badge admin">Admin</span>'
            : '<span class="admin-badge active">ปกติ</span>'}
      </td>
      <td>${user.createdAt?.toDate?.()?.toLocaleDateString('th-TH') || '-'}</td>
      <td>
        <div class="admin-actions">
          <button class="admin-action-btn" data-action="view" data-uid="${user.uid}" title="ดูรายละเอียด">
            <i class="ti ti-eye"></i>
          </button>
          ${!user.admin && window.LifePAuth?.user?.uid !== user.uid ? `
            ${user.banned
              ? `<button class="admin-action-btn success" data-action="unban" data-uid="${user.uid}" title="ปลดแบน">
                  <i class="ti ti-check"></i>
                </button>`
              : `<button class="admin-action-btn warning" data-action="ban" data-uid="${user.uid}" title="แบน">
                  <i class="ti ti-ban"></i>
                </button>`
            }
          ` : ''}
          ${window.LifePAuth?.user?.uid !== user.uid ? `
            <button class="admin-action-btn danger" data-action="delete" data-uid="${user.uid}" title="ลบข้อมูล">
              <i class="ti ti-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  adminLastDoc = result.lastDoc;

  // Update pagination
  document.getElementById('admin-prev-page').disabled = adminPage === 1;
  document.getElementById('admin-next-page').disabled = !result.hasMore;
  document.getElementById('admin-page-info').textContent = `หน้า ${adminPage}`;

  // Bind action buttons
  tbody.querySelectorAll('.admin-action-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAdminAction(btn.dataset.action, btn.dataset.uid));
  });
}

// ===== LOAD ADMIN LOGS =====
async function loadAdminLogs() {
  const container = document.getElementById('admin-logs-list');
  if (!container) return;

  const logs = await Admin.getActivityLogs(50);

  if (logs.length === 0) {
    container.innerHTML = '<div class="admin-empty">ไม่มี logs</div>';
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="admin-log-item">
      <div class="admin-log-icon">
        <i class="ti ${getLogIcon(log.action)}"></i>
      </div>
      <div class="admin-log-content">
        <div class="admin-log-action">${log.action}</div>
        <div class="admin-log-details">${JSON.stringify(log.details || {})}</div>
      </div>
      <div class="admin-log-meta">
        <div class="admin-log-admin">${log.adminEmail}</div>
        <div class="admin-log-time">${log.timestamp?.toDate?.()?.toLocaleString('th-TH') || '-'}</div>
      </div>
    </div>
  `).join('');
}

// ===== GET LOG ICON =====
function getLogIcon(action) {
  const icons = {
    'ban_user': 'ti-ban',
    'unban_user': 'ti-check',
    'delete_user_data': 'ti-trash',
    'set_admin': 'ti-crown'
  };
  return icons[action] || 'ti-info-circle';
}

// ===== HANDLE ADMIN ACTION =====
async function handleAdminAction(action, uid) {
  switch (action) {
    case 'view':
      const user = await Admin.getUser(uid);
      if (user) {
        showUserDetailModal(user);
      }
      break;

    case 'ban':
      const reason = prompt('เหตุผลที่แบนผู้ใช้:');
      if (reason) {
        const result = await Admin.banUser(uid, reason);
        if (result.success) {
          loadAdminUsers();
        } else {
          alert('เกิดข้อผิดพลาด: ' + result.error);
        }
      }
      break;

    case 'unban':
      if (confirm('ยืนยันการปลดแบนผู้ใช้นี้?')) {
        const result = await Admin.unbanUser(uid);
        if (result.success) {
          loadAdminUsers();
        } else {
          alert('เกิดข้อผิดพลาด: ' + result.error);
        }
      }
      break;

    case 'delete':
      if (confirm('ยืนยันการลบข้อมูลผู้ใช้นี้? (ข้อมูลจะหายถาวร)')) {
        const result = await Admin.deleteUserData(uid);
        if (result.success) {
          alert('ลบข้อมูลสำเร็จ');
        } else {
          alert('เกิดข้อผิดพลาด: ' + result.error);
        }
      }
      break;
  }
}

// ===== SHOW USER DETAIL MODAL =====
function showUserDetailModal(user) {
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <div class="admin-modal-header">
        <h3><i class="ti ti-user"></i> รายละเอียดผู้ใช้</h3>
        <button class="admin-modal-close"><i class="ti ti-x"></i></button>
      </div>
      <div class="admin-modal-body">
        <div class="admin-detail-grid">
          <div class="admin-detail-item">
            <label>UID</label>
            <div>${user.uid}</div>
          </div>
          <div class="admin-detail-item">
            <label>ชื่อ</label>
            <div>${user.displayName || '-'}</div>
          </div>
          <div class="admin-detail-item">
            <label>อีเมล</label>
            <div>${user.email || '-'}</div>
          </div>
          <div class="admin-detail-item">
            <label>สถานะ</label>
            <div>${user.banned ? 'ถูกแบน' : user.admin ? 'Admin' : 'ปกติ'}</div>
          </div>
          <div class="admin-detail-item">
            <label>สมัครเมื่อ</label>
            <div>${user.createdAt?.toDate?.()?.toLocaleString('th-TH') || '-'}</div>
          </div>
          <div class="admin-detail-item">
            <label>เข้าสู่ระบบล่าสุด</label>
            <div>${user.lastLogin?.toDate?.()?.toLocaleString('th-TH') || '-'}</div>
          </div>
          <div class="admin-detail-item">
            <label>ผู้ติดตาม</label>
            <div>${user.followerCount || 0}</div>
          </div>
          <div class="admin-detail-item">
            <label>กำลังติดตาม</label>
            <div>${user.followingCount || 0}</div>
          </div>
        </div>

        <div class="admin-modal-actions">
          <button class="btn-outline" id="btn-toggle-admin">
            <i class="ti ti-crown"></i> ${user.admin ? 'ถอด Admin' : 'ตั้งเป็น Admin'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.admin-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector('#btn-toggle-admin').addEventListener('click', async () => {
    const result = await Admin.setAdminRole(user.uid, !user.admin);
    if (result.success) {
      modal.remove();
      loadAdminUsers();
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.error);
    }
  });
}

// ===== BIND ADMIN EVENTS =====
function bindAdminEvents() {
  // Tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Search
  const searchInput = document.getElementById('admin-search-input');
  const searchBtn = document.getElementById('admin-search-btn');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      adminLastDoc = null;
      adminPage = 1;
      loadAdminUsers(searchInput.value.trim());
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        adminLastDoc = null;
        adminPage = 1;
        loadAdminUsers(searchInput.value.trim());
      }
    });
  }

  // Pagination
  document.getElementById('admin-prev-page')?.addEventListener('click', () => {
    adminPage = Math.max(1, adminPage - 1);
    loadAdminUsers();
  });

  document.getElementById('admin-next-page')?.addEventListener('click', () => {
    adminPage++;
    loadAdminUsers();
  });
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  // Check admin status when auth is ready
  if (window.LifePAuth) {
    window.LifePAuth.onReady(async () => {
      const isAdmin = await Admin.isAdmin();
      // Show/hide admin nav item
      const adminNav = document.querySelector('[data-page="admin"]');
      if (adminNav) {
        adminNav.style.display = isAdmin ? 'flex' : 'none';
      }
    });
  }
});

window.Admin = Admin;
