(() => {
  const FRAME_COUNT = 96;
  const canvas = document.querySelector('#sequence-canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const heroTrack = document.querySelector('.hero-track');
  const stage = document.querySelector('.hero-stage');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frames = new Array(FRAME_COUNT);
  const loading = new Set();

  let targetFrame = 0;
  let currentFrame = 0;
  let drawnFrame = -1;
  let animationRequest = 0;
  let scrollTravel = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;

  function loadFrame(index) {
    if (index < 0 || index >= FRAME_COUNT || frames[index] || loading.has(index)) return;

    const image = new Image();
    loading.add(index);
    image.decoding = 'async';
    image.onload = () => {
      frames[index] = image;
      loading.delete(index);
      if (Math.abs(index - currentFrame) < 1.6) requestRender();
    };
    image.onerror = () => loading.delete(index);
    image.src = `./frames/frame_${String(index + 1).padStart(4, '0')}.png`;
  }

  function loadNearbyFrames(center) {
    const base = Math.round(center);
    loadFrame(base);
    for (let offset = 1; offset <= 8; offset += 1) {
      loadFrame(base + offset);
      if (offset <= 3) loadFrame(base - offset);
    }
  }

  function releaseDistantFrames(center) {
    const keepRadius = 10;
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      if (frames[index] && Math.abs(index - center) > keepRadius) frames[index] = null;
    }
  }

  function updateTarget() {
    const trackTop = heroTrack.getBoundingClientRect().top;
    const progress = !reducedMotion.matches && scrollTravel > 0
      ? Math.min(1, Math.max(0, -trackTop / scrollTravel))
      : 0;

    targetFrame = progress * (FRAME_COUNT - 1);
    loadNearbyFrames(targetFrame);
    requestRender();
  }

  function drawFrame(index) {
    const image = frames[index];
    if (!image) {
      loadFrame(index);
      return;
    }

    // Cover the hero stage without distorting the supplied 16:9 frames.
    const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;
    context.fillStyle = '#160304';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    // The supplied frame sequence has a fixed sparkle mark at the lower-right.
    // Clone the clean background just beside it over that small source region.
    context.drawImage(image, 1190, 558, 60, 76, drawX + 1130 * scale, drawY + 558 * scale, 60 * scale, 76 * scale);
    drawnFrame = index;
  }

  function render() {
    animationRequest = 0;
    currentFrame += (targetFrame - currentFrame) * 0.2;
    if (Math.abs(targetFrame - currentFrame) < 0.025) currentFrame = targetFrame;

    const index = Math.round(currentFrame);
    if (index !== drawnFrame) drawFrame(index);

    loadNearbyFrames(currentFrame);
    if (Math.abs(targetFrame - currentFrame) >= 12) loadNearbyFrames(targetFrame);
    if (Math.abs(targetFrame - currentFrame) < 12) releaseDistantFrames(currentFrame);

    if (Math.abs(targetFrame - currentFrame) >= 0.025) requestRender();
  }

  function requestRender() {
    if (!animationRequest) animationRequest = window.requestAnimationFrame(render);
  }

  function measureCanvas() {
    canvasWidth = stage.clientWidth;
    canvasHeight = stage.clientHeight;
    scrollTravel = Math.max(0, heroTrack.offsetHeight - canvasHeight);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawnFrame = -1;
    updateTarget();
  }

  function setupReveals() {
    const revealItems = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    revealItems.forEach((item) => observer.observe(item));
  }

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  setupReveals();
  loadNearbyFrames(0);
  measureCanvas();

  window.addEventListener('scroll', updateTarget, { passive: true });
  window.addEventListener('resize', measureCanvas, { passive: true });
  reducedMotion.addEventListener?.('change', () => {
    setupReveals();
    measureCanvas();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateTarget();
  });
})();
