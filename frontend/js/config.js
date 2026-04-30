// ============================================================
// Karaoke Reservation - Runtime Config
// EC2 UserData auto-replaces __API_GATEWAY_URL__ at boot.
// After terraform apply, update manually if testing locally.
// ============================================================
window.APP_CONFIG = {
  API_GATEWAY_URL: '__API_GATEWAY_URL__',
  S3_PAYMENT_BUCKET: '__S3_PAYMENT_BUCKET__',

  // YouTube Player Config
  // Leave empty to use fallback playlist
  YOUTUBE_API_KEY: '',

  // Fallback karaoke playlist (YouTube video IDs)
  KARAOKE_PLAYLIST: [
    'dQw4w9WgXcQ',  // placeholder - will be real karaoke songs
    '60ItHLz5WEA',
    '09R8_2nJtjg',
    'JGwWNGJdvx8',
    'kXYiU_JCYtU',
    'hTWKbfoikeg',
    'M-y_LsG3EH8',
    'OPf0YbXqDm0'
  ],

  // Available time slots
  TIME_SLOTS: [
    '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00', '23:00'
  ]
};
