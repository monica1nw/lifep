// ===== FOLLOW SYSTEM MODULE =====
const FollowSystem = {
  // Local storage key for follows
  STORAGE_KEY: 'myspace-follows',

  // Get all follows for current user
  getFollows() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Get following list (users I follow)
  getFollowingList() {
    return this.getFollows().filter(f => f.type === 'following');
  },

  // Get followers list (users who follow me)
  getFollowersList() {
    return this.getFollows().filter(f => f.type === 'follower');
  },

  // Check if current user is following a specific user
  isFollowing(uid) {
    const follows = this.getFollowingList();
    return follows.some(f => f.uid === uid);
  },

  // Follow a user
  async followUser(uid) {
    if (!window.LifePAuth?.user) {
      return { success: false, error: 'กรุณาล็อกอินก่อน' };
    }

    if (uid === window.LifePAuth.user.uid) {
      return { success: false, error: 'ไม่สามารถ follow ตัวเองได้' };
    }

    if (this.isFollowing(uid)) {
      return { success: false, error: 'คุณ follow ผู้ใช้นี้แล้ว' };
    }

    try {
      const db = firebase.firestore();
      const currentUid = window.LifePAuth.user.uid;

      // Create follow document
      await db.collection('follows').add({
        followerId: currentUid,
        followingId: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update local storage
      const follows = this.getFollows();
      follows.push({
        uid,
        type: 'following',
        followedAt: new Date().toISOString()
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(follows));

      // Update follower count on target user
      await db.collection('users').doc(uid).update({
        followerCount: firebase.firestore.FieldValue.increment(1)
      });

      // Update following count on current user
      await db.collection('users').doc(currentUid).update({
        followingCount: firebase.firestore.FieldValue.increment(1)
      });

      // Log activity
      if (window.LifePDB) {
        await window.LifePDB.logActivity('follow', `Followed user: ${uid}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Follow error:', error);
      return { success: false, error: error.message };
    }
  },

  // Unfollow a user
  async unfollowUser(uid) {
    if (!window.LifePAuth?.user) {
      return { success: false, error: 'กรุณาล็อกอินก่อน' };
    }

    if (!this.isFollowing(uid)) {
      return { success: false, error: 'คุณไม่ได้ follow ผู้ใช้นี้' };
    }

    try {
      const db = firebase.firestore();
      const currentUid = window.LifePAuth.user.uid;

      // Find and delete follow document
      const snapshot = await db.collection('follows')
        .where('followerId', '==', currentUid)
        .where('followingId', '==', uid)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Update local storage
      const follows = this.getFollows();
      const filtered = follows.filter(f => !(f.uid === uid && f.type === 'following'));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

      // Update follower count on target user
      await db.collection('users').doc(uid).update({
        followerCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Update following count on current user
      await db.collection('users').doc(currentUid).update({
        followingCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Log activity
      if (window.LifePDB) {
        await window.LifePDB.logActivity('unfollow', `Unfollowed user: ${uid}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Unfollow error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sync follows from cloud
  async syncFromCloud() {
    if (!window.LifePAuth?.user) return;

    try {
      const db = firebase.firestore();
      const currentUid = window.LifePAuth.user.uid;

      // Get following
      const followingSnapshot = await db.collection('follows')
        .where('followerId', '==', currentUid)
        .get();

      // Get followers
      const followersSnapshot = await db.collection('follows')
        .where('followingId', '==', currentUid)
        .get();

      const follows = [];

      followingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        follows.push({
          uid: data.followingId,
          type: 'following',
          followedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      followersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        follows.push({
          uid: data.followerId,
          type: 'follower',
          followedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(follows));
    } catch (error) {
      console.warn('Follow sync error:', error);
    }
  },

  // Get user's follower count
  async getFollowerCount(uid) {
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? (doc.data().followerCount || 0) : 0;
    } catch {
      return 0;
    }
  },

  // Get user's following count
  async getFollowingCount(uid) {
    try {
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(uid).get();
      return doc.exists ? (doc.data().followingCount || 0) : 0;
    } catch {
      return 0;
    }
  },

  // Get list of followers with user data
  async getFollowersWithData() {
    const followers = this.getFollowersList();
    if (followers.length === 0) return [];

    const users = [];
    for (const f of followers) {
      const userData = await window.LifePAuth?.getUserProfile(f.uid);
      if (userData) {
        users.push({ ...userData, followedAt: f.followedAt });
      }
    }
    return users;
  },

  // Get list of following with user data
  async getFollowingWithData() {
    const following = this.getFollowingList();
    if (following.length === 0) return [];

    const users = [];
    for (const f of following) {
      const userData = await window.LifePAuth?.getUserProfile(f.uid);
      if (userData) {
        users.push({ ...userData, followedAt: f.followedAt });
      }
    }
    return users;
  },

  // Render follow button
  renderFollowButton(uid, container) {
    const isFollowing = this.isFollowing(uid);
    const btn = document.createElement('button');
    btn.className = `follow-btn ${isFollowing ? 'following' : ''}`;
    btn.dataset.uid = uid;
    btn.innerHTML = isFollowing
      ? '<i class="ti ti-user-minus"></i> เลิกติดตาม'
      : '<i class="ti ti-user-plus"></i> ติดตาม';

    btn.addEventListener('click', async () => {
      btn.disabled = true;

      const result = isFollowing
        ? await this.unfollowUser(uid)
        : await this.followUser(uid);

      if (result.success) {
        // Refresh button
        this.renderFollowButton(uid, container);
      } else {
        alert(result.error);
        btn.disabled = false;
      }
    });

    container.innerHTML = '';
    container.appendChild(btn);
  }
};

// ===== FOLLOW LIST UI =====
function showFollowListModal(type, uid) {
  const modal = document.createElement('div');
  modal.className = 'follow-list-modal';
  modal.innerHTML = `
    <div class="follow-list-content">
      <div class="follow-list-header">
        <h3>${type === 'followers' ? 'ผู้ติดตาม' : 'กำลังติดตาม'}</h3>
        <button class="follow-list-close"><i class="ti ti-x"></i></button>
      </div>
      <div class="follow-list-body" id="follow-list-body">
        <div class="follow-list-loading"><i class="ti ti-loader-2 ti-spin"></i> โหลด...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.follow-list-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Load data
  (async () => {
    const body = document.getElementById('follow-list-body');
    const users = type === 'followers'
      ? await FollowSystem.getFollowersWithData()
      : await FollowSystem.getFollowingWithData();

    if (users.length === 0) {
      body.innerHTML = '<div class="follow-list-empty">ยังไม่มี' + (type === 'followers' ? 'ผู้ติดตาม' : 'การติดตาม') + '</div>';
      return;
    }

    body.innerHTML = users.map(user => `
      <div class="follow-list-item" data-uid="${user.uid}">
        <div class="follow-list-avatar">${(user.displayName || 'U').charAt(0).toUpperCase()}</div>
        <div class="follow-list-info">
          <div class="follow-list-name">${user.displayName || 'Unknown'}</div>
          <div class="follow-list-email">${user.email || ''}</div>
        </div>
      </div>
    `).join('');

    // Click to view profile
    body.querySelectorAll('.follow-list-item').forEach(item => {
      item.addEventListener('click', () => {
        modal.remove();
        if (typeof showPublicProfile === 'function') {
          showPublicProfile(item.dataset.uid);
        }
      });
    });
  })();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Sync follows when auth is ready
  if (window.LifePAuth) {
    window.LifePAuth.onReady(() => {
      if (window.LifePAuth.user) {
        FollowSystem.syncFromCloud();
      }
    });
  }
});

window.FollowSystem = FollowSystem;
