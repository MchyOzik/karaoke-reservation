const Player = {
  ytPlayer: null,
  playlist: ['09R8_2nJtjg', 'hTWKbfoikeg', 'dQw4w9WgXcQ'],
  
  open() { document.getElementById('music-overlay').classList.add('active'); },
  close() { document.getElementById('music-overlay').classList.remove('active'); },
  
  init() {
    document.getElementById('yt-search-btn').onclick = () => this.playVideo();
    document.getElementById('yt-search-input').onkeypress = (e) => { if (e.key === 'Enter') this.playVideo(); };
    document.getElementById('ctrl-play').onclick = () => this.togglePlay();
  },

  onYouTubeIframeAPIReady() {
    this.ytPlayer = new YT.Player('yt-player', {
      height: '100%', width: '100%', videoId: this.playlist[0],
      playerVars: { 
        'autoplay': 0, 
        'controls': 1, // Aktifin kontrol biar user bisa gampang atur
        'modestbranding': 1, 
        'rel': 0, 
        'iv_load_policy': 3 
      },
      events: {
        'onReady': (e) => { e.target.unMute(); e.target.setVolume(80); },
        'onStateChange': (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            const title = this.ytPlayer.getVideoData().title;
            document.getElementById('now-playing').innerText = `📺 CH 01 - PLAYING : ${title.toUpperCase()}`;
            document.getElementById('ctrl-play').innerText = '⏸';
          } else {
            document.getElementById('ctrl-play').innerText = '▶';
          }
        }
      }
    });
  },

  playVideo() {
    const input = document.getElementById('yt-search-input').value.trim();
    if (!input || !this.ytPlayer) return;
    let videoId = input;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    if (match && match[2].length == 11) videoId = match[2];
    
    this.ytPlayer.loadVideoById(videoId);
    this.ytPlayer.playVideo();
    App.showToast("Signal Accepted! Tuning... 📺", "success");
  },

  togglePlay() {
    if(!this.ytPlayer) return;
    const state = this.ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      this.ytPlayer.pauseVideo();
    } else {
      this.ytPlayer.playVideo();
    }
  }
};

window.onYouTubeIframeAPIReady = () => Player.onYouTubeIframeAPIReady();
Player.init();
