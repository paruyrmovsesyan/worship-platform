export function getSongCoverStyle() {
  return {
    backgroundImage: [
      'radial-gradient(circle at 8% 10%, rgba(94, 54, 255, 0.95) 0%, rgba(94, 54, 255, 0.55) 18%, rgba(94, 54, 255, 0) 42%)',
      'linear-gradient(135deg, #4d5fe6 0%, #4d86e0 52%, #46e58e 100%)',
    ].join(', '),
    boxShadow: '0 12px 28px rgba(77, 95, 230, 0.28)',
  };
}
