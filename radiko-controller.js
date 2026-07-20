(() => {
  'use strict';

  const ROOT_ID = 'radiko-stable-controller';
  const RATE_KEY = 'radikoStableController.rate';
  const MIN_RATE = 0.25;
  const MAX_RATE = 4;
  const SKIPS = [-600, -120, -20, -5, 5, 20, 120, 600];

  if (window.__radikoStableControllerInstalled) return;
  window.__radikoStableControllerInstalled = true;

  let selectedMedia = null;
  let desiredRate = loadRate();

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadRate() {
    const value = Number(localStorage.getItem(RATE_KEY));
    return Number.isFinite(value) ? clamp(value, MIN_RATE, MAX_RATE) : 1;
  }

  function mediaCandidates() {
    return [...document.querySelectorAll('audio, video')].filter((media) =>
      media.currentSrc || media.src || media.readyState > HTMLMediaElement.HAVE_NOTHING
    );
  }

  function getMedia() {
    const candidates = mediaCandidates();
    if (selectedMedia?.isConnected && candidates.includes(selectedMedia)) return selectedMedia;

    selectedMedia = candidates.find((media) => !media.paused && !media.ended)
      || candidates.find((media) => media.currentTime > 0 && !media.ended)
      || candidates.at(-1)
      || null;
    return selectedMedia;
  }

  function applyRate(media = getMedia()) {
    if (!media) return false;
    if (media.playbackRate !== desiredRate) media.playbackRate = desiredRate;
    if (media.defaultPlaybackRate !== desiredRate) media.defaultPlaybackRate = desiredRate;
    return true;
  }

  function setRate(value) {
    desiredRate = Number(clamp(value, MIN_RATE, MAX_RATE).toFixed(2));
    localStorage.setItem(RATE_KEY, String(desiredRate));
    applyRate();
    updateStatus();
  }

  function seekBy(seconds) {
    const media = getMedia();
    if (!media) {
      updateStatus('再生を開始してください');
      return;
    }

    const ranges = media.seekable;
    let min = 0;
    let max = Number.isFinite(media.duration) ? media.duration : Infinity;
    if (ranges?.length) {
      min = ranges.start(0);
      max = ranges.end(ranges.length - 1);
    }

    const target = clamp(media.currentTime + seconds, min, max);
    if (!Number.isFinite(target)) {
      updateStatus('この番組はシークできません');
      return;
    }

    try {
      if (typeof media.fastSeek === 'function') media.fastSeek(target);
      else media.currentTime = target;
      updateStatus(`${seconds > 0 ? '+' : ''}${formatSeconds(seconds)}`);
    } catch {
      updateStatus('シークに失敗しました');
    }
  }

  function formatSeconds(seconds) {
    const sign = seconds < 0 ? '-' : '';
    const value = Math.abs(seconds);
    return value >= 60 ? `${sign}${value / 60}分` : `${sign}${value}秒`;
  }

  function updateStatus(message = '') {
    const root = document.getElementById(ROOT_ID);
    if (!root?.shadowRoot) return;
    const rate = root.shadowRoot.querySelector('[data-rate]');
    const status = root.shadowRoot.querySelector('[data-status]');
    if (rate) rate.textContent = `${desiredRate.toFixed(2)}×`;
    if (status) {
      status.textContent = message;
      if (message) window.setTimeout(() => {
        if (status.textContent === message) status.textContent = '';
      }, 1800);
    }
  }

  function makeButton(label, title, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.addEventListener('click', handler);
    return button;
  }

  function mount() {
    if (!document.body || document.getElementById(ROOT_ID)) return;
    const host = document.createElement('div');
    host.id = ROOT_ID;
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .panel { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
          width: min(440px, calc(100vw - 32px)); box-sizing: border-box; padding: 10px; border: 1px solid #555;
          border-radius: 10px; background: rgba(24, 24, 27, .94); color: #fff;
          box-shadow: 0 4px 18px #0008; font: 13px/1.4 system-ui, sans-serif; }
        .row { display: flex; align-items: center; gap: 5px; margin-top: 7px; }
        .seek { flex-wrap: wrap; }
        .label { width: 38px; color: #bbb; font-weight: 700; }
        button { min-width: 34px; padding: 5px 7px; border: 1px solid #666; border-radius: 5px;
          background: #35353a; color: #fff; font: inherit; cursor: pointer; }
        button:hover { background: #4b4b52; } button:focus-visible { outline: 2px solid #f39800; }
        [data-rate] { min-width: 45px; text-align: center; font-weight: 700; color: #ffb020; }
        [data-status] { flex: 1; color: #bfe0ff; text-align: right; min-height: 1em; }
        .close { margin-left: auto; min-width: 26px; padding: 2px 6px; }
      </style>
      <section class="panel" aria-label="radiko 安定コントローラー">
        <div class="row"><strong>radiko controller</strong><span data-status aria-live="polite"></span><button class="close" title="閉じる" aria-label="閉じる">×</button></div>
        <div class="row seek"><span class="label">移動</span></div>
        <div class="row rate"><span class="label">速度</span><span data-rate></span></div>
      </section>`;

    const seekRow = shadow.querySelector('.seek');
    for (const seconds of SKIPS) {
      seekRow.append(makeButton(formatSeconds(seconds), `${formatSeconds(seconds)}移動`, () => seekBy(seconds)));
    }
    const rateRow = shadow.querySelector('.rate');
    rateRow.append(
      makeButton('−0.1', '0.1倍遅く', () => setRate(desiredRate - 0.1)),
      makeButton('+0.1', '0.1倍速く', () => setRate(desiredRate + 0.1)),
      makeButton('1.0', '標準速度', () => setRate(1))
    );
    shadow.querySelector('.close').addEventListener('click', () => host.remove());
    document.body.append(host);
    updateStatus();
  }

  document.addEventListener('play', (event) => {
    if (event.target instanceof HTMLMediaElement) {
      selectedMedia = event.target;
      applyRate(event.target);
    }
  }, true);
  document.addEventListener('loadedmetadata', (event) => {
    if (event.target instanceof HTMLMediaElement) applyRate(event.target);
  }, true);
  document.addEventListener('ratechange', (event) => {
    if (event.target instanceof HTMLMediaElement && event.target === getMedia()
        && event.target.playbackRate !== desiredRate) applyRate(event.target);
  }, true);

  const observer = new MutationObserver(() => {
    mount();
    applyRate();
  });
  const start = () => {
    mount();
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setInterval(() => applyRate(), 1500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
