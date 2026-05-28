// ===== MUSIC MODULE =====

const MusicModule = {
  storageKey: 'myspace-music',
  playlist: [],
  currentTrack: null,
  audioPlayer: null,

  // Initialize
  init() {
    this.audioPlayer = document.getElementById('audio-player');
    this.playlist = this.loadPlaylist();
    this.bindEvents();
    this.render();
  },

  // Bind events
  bindEvents() {
    // Tab switching
    document.querySelectorAll('.music-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.music-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Add music file
    document.getElementById('btn-add-music-file').addEventListener('click', () => {
      document.getElementById('music-file-input').click();
    });

    document.getElementById('music-file-input').addEventListener('change', (e) => {
      this.handleFileUpload(e);
    });

    // Add YouTube
    document.getElementById('btn-add-youtube').addEventListener('click', () => {
      this.addYouTube();
    });

    document.getElementById('youtube-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addYouTube();
    });

    // Add Spotify
    document.getElementById('btn-add-spotify').addEventListener('click', () => {
      this.addSpotify();
    });

    document.getElementById('spotify-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addSpotify();
    });

    // Audio ended
    this.audioPlayer.addEventListener('ended', () => {
      this.playNext();
    });

    // Lyrics edit toggle
    document.getElementById('btn-edit-lyrics')?.addEventListener('click', () => {
      this.toggleLyricsEdit();
    });

    // Lyrics save on blur
    document.getElementById('lyrics-input')?.addEventListener('blur', () => {
      this.saveLyrics();
    });
  },

  // Handle file upload
  handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('audio/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const track = {
          id: Date.now() + Math.random(),
          type: 'file',
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'ไม่ทราบศิลปิน',
          data: event.target.result,
          lyrics: '',
          createdAt: new Date().toISOString()
        };

        this.playlist.push(track);
        this.savePlaylist();
        this.render();

        if (this.playlist.length === 1) {
          this.playTrack(track.id);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  },

  // Add YouTube
  addYouTube() {
    const input = document.getElementById('youtube-url');
    const url = input.value.trim();

    if (!url) return;

    const videoId = this.extractYouTubeId(url);
    if (!videoId) {
      alert('ลิงก์ YouTube ไม่ถูกต้อง');
      return;
    }

    const track = {
      id: Date.now(),
      type: 'youtube',
      title: 'YouTube Video',
      artist: 'YouTube',
      videoId: videoId,
      lyrics: '',
      createdAt: new Date().toISOString()
    };

    this.playlist.push(track);
    this.savePlaylist();
    this.render();

    input.value = '';
  },

  // Extract YouTube video ID
  extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  // Add Spotify
  addSpotify() {
    const input = document.getElementById('spotify-url');
    const url = input.value.trim();

    if (!url) return;

    const spotifyInfo = this.extractSpotifyInfo(url);
    if (!spotifyInfo) {
      alert('ลิงก์ Spotify ไม่ถูกต้อง');
      return;
    }

    const track = {
      id: Date.now(),
      type: 'spotify',
      title: 'Spotify ' + spotifyInfo.type,
      artist: 'Spotify',
      spotifyType: spotifyInfo.type,
      spotifyId: spotifyInfo.id,
      lyrics: '',
      createdAt: new Date().toISOString()
    };

    this.playlist.push(track);
    this.savePlaylist();
    this.render();

    input.value = '';
  },

  // Extract Spotify info from URL
  extractSpotifyInfo(url) {
    const patterns = [
      { type: 'track', regex: /spotify\.com\/track\/([^?\s]+)/ },
      { type: 'playlist', regex: /spotify\.com\/playlist\/([^?\s]+)/ },
      { type: 'album', regex: /spotify\.com\/album\/([^?\s]+)/ },
      { type: 'artist', regex: /spotify\.com\/artist\/([^?\s]+)/ }
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        return { type: pattern.type, id: match[1] };
      }
    }
    return null;
  },

  // Play track
  playTrack(id) {
    const track = this.playlist.find(t => t.id === id);
    if (!track) return;

    this.currentTrack = track;
    this.audioPlayer.pause();
    this.audioPlayer.src = '';

    document.querySelectorAll('.playlist-item').forEach(item => {
      item.classList.toggle('playing', item.dataset.id == id);
    });

    document.getElementById('now-playing-title').textContent = track.title;
    document.getElementById('now-playing-artist').textContent = track.artist;

    // Show lyrics section
    const lyricsSection = document.getElementById('lyrics-section');
    lyricsSection.style.display = 'block';
    document.getElementById('lyrics-display').textContent = track.lyrics || 'ยังไม่มีเนื้อเพลง กด "แก้ไข" เพื่อเพิ่ม';
    document.getElementById('lyrics-input').value = track.lyrics || '';
    document.getElementById('lyrics-input').style.display = 'none';
    document.getElementById('lyrics-display').style.display = 'block';

    if (track.type === 'file') {
      document.getElementById('now-playing-cover').innerHTML = '<i class="ti ti-music"></i>';
      this.audioPlayer.src = track.data;
      this.audioPlayer.play();
    } else if (track.type === 'youtube') {
      document.getElementById('now-playing-cover').innerHTML = `
        <iframe
          style="border-radius:12px"
          src="https://www.youtube.com/embed/${track.videoId}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      `;
    } else if (track.type === 'spotify') {
      document.getElementById('now-playing-cover').innerHTML = `
        <iframe
          style="border-radius:12px"
          src="https://open.spotify.com/embed/${track.spotifyType}/${track.spotifyId}?utm_source=generator&theme=0"
          width="100%"
          height="100%"
          frameBorder="0"
          allowfullscreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy">
        </iframe>
      `;
    }
  },

  // Toggle lyrics edit mode
  toggleLyricsEdit() {
    const display = document.getElementById('lyrics-display');
    const input = document.getElementById('lyrics-input');
    const btn = document.getElementById('btn-edit-lyrics');

    if (input.style.display === 'none') {
      input.style.display = 'block';
      display.style.display = 'none';
      input.focus();
      btn.textContent = 'บันทึก';
    } else {
      this.saveLyrics();
    }
  },

  // Save lyrics
  saveLyrics() {
    if (!this.currentTrack) return;

    const input = document.getElementById('lyrics-input');
    const display = document.getElementById('lyrics-display');
    const btn = document.getElementById('btn-edit-lyrics');

    this.currentTrack.lyrics = input.value;
    this.savePlaylist();

    display.textContent = input.value || 'ยังไม่มีเนื้อเพลง';
    input.style.display = 'none';
    display.style.display = 'block';
    btn.textContent = 'แก้ไข';
  },

  // Play next track
  playNext() {
    if (!this.currentTrack || this.playlist.length === 0) return;

    const currentIndex = this.playlist.findIndex(t => t.id === this.currentTrack.id);
    const nextIndex = (currentIndex + 1) % this.playlist.length;

    this.playTrack(this.playlist[nextIndex].id);
  },

  // Delete track
  deleteTrack(id) {
    this.playlist = this.playlist.filter(t => t.id !== id);
    this.savePlaylist();
    this.render();

    if (this.currentTrack && this.currentTrack.id === id) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.currentTrack = null;
      document.getElementById('now-playing-title').textContent = 'ไม่มีเพลงเล่น';
      document.getElementById('now-playing-artist').textContent = '-';
      document.getElementById('now-playing-cover').innerHTML = '<i class="ti ti-music"></i>';
      document.getElementById('lyrics-section').style.display = 'none';
    }
  },

  // Render playlist
  render() {
    const container = document.getElementById('playlist');

    if (this.playlist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ti ti-music-off"></i>
          <p>ยังไม่มีเพลง เพิ่มเพลงใหม่ได้เลย 🎵</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.playlist.map(track => `
      <div class="playlist-item ${this.currentTrack?.id === track.id ? 'playing' : ''}" data-id="${track.id}">
        <div class="playlist-item-cover">
          ${track.type === 'youtube'
            ? `<img src="https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg" alt="">`
            : track.type === 'spotify'
              ? '<i class="ti ti-brand-spotify" style="color:#1DB954;font-size:24px"></i>'
              : '<i class="ti ti-music"></i>'
          }
        </div>
        <div class="playlist-item-info">
          <div class="playlist-item-title">${this.escapeHtml(track.title)}</div>
          <div class="playlist-item-artist">${this.escapeHtml(track.artist)}</div>
        </div>
        ${this.currentTrack?.id === track.id ? '<div class="sound-bars"><span></span><span></span><span></span><span></span></div>' : ''}
        <div class="playlist-item-actions">
          <button data-action="play" title="เล่น"><i class="ti ti-player-play"></i></button>
          <button data-action="delete" title="ลบ"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      const id = Number(item.dataset.id);

      item.addEventListener('click', (e) => {
        if (!e.target.closest('[data-action]')) {
          this.playTrack(id);
        }
      });

      item.querySelector('[data-action="play"]')?.addEventListener('click', () => {
        this.playTrack(id);
      });

      item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
        this.deleteTrack(id);
      });
    });
  },

  // Load playlist from storage
  loadPlaylist() {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return [];

    const tracks = JSON.parse(data);
    return tracks.filter(t => t.type === 'youtube' || t.type === 'spotify');
  },

  // Save playlist to storage
  savePlaylist() {
    const streamingTracks = this.playlist.filter(t => t.type === 'youtube' || t.type === 'spotify');
    localStorage.setItem(this.storageKey, JSON.stringify(streamingTracks));
  },

  // Escape HTML
  escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  MusicModule.init();
});
