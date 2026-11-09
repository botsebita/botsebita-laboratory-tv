'use strict';

const DEFAULT_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const MONCHO_CATALOGS = [
  { key: 'original', label: 'original_url.json', url: 'https://raw.githubusercontent.com/monchotv/MonchoApps/main/original_url.json' },
  { key: 'alternate', label: 'channels_alt.json', url: 'https://raw.githubusercontent.com/monchotv/MonchoApps/main/channels_alt.json' }
];
const t = window.botsebitaT || (key => key);
const CHANNEL_PAGE_SIZE = 120;

const SAMPLE_CHANNELS = [
  {
    id: 'demo-hls-mux',
    name: 'Demo HLS · Mux',
    group: 'Pruebas',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logo: '',
    isDemo: true
  },
  {
    id: 'demo-mp4-bunny',
    name: 'Demo MP4 · Big Buck Bunny',
    group: 'Pruebas',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    logo: '',
    isDemo: true
  }
];

const $ = (selector) => document.querySelector(selector);
const state = {
  channels: [],
  activeChannelId: null,
  view: 'all',
  category: 'all',
  country: 'all',
  filter: 'all',
  query: '',
  favorites: new Set(readArray('playtv-web-favorites')),
  recents: readArray('playtv-web-recents'),
  hls: null,
  shaka: null,
  shakaCleanup: Promise.resolve(),
  pendingDrmChannelId: null,
  monchoStats: null,
  playlistName: 'Cargando IPTV-org…',
  activeSource: 'iptv-org',
  sourceCache: { 'iptv-org': null, moncho: null, public: null },
  sourceLoadSequence: 0,
  loadingSource: null,
  connectionStatusKey: 'readyToTest',
  renderLimit: CHANNEL_PAGE_SIZE,
  visibleChannelCount: 0
};

const video = $('#videoPlayer');
const stage = $('#videoStage');
const emptyState = $('#emptyState');
const playerError = $('#playerError');
const playlistDialog = $('#playlistDialog');
const alternateDialog = $('#alternateDialog');
const drmDialog = $('#drmDialog');
const toast = $('#toast');
let toastTimer = null;

function readArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function saveArray(key, values) {
  try { localStorage.setItem(key, JSON.stringify(values)); }
  catch (_) { /* El modo privado puede bloquear el almacenamiento local. */ }
}

function readSetting(key, fallback) {
  try { return localStorage.getItem(key) || fallback; }
  catch (_) { return fallback; }
}

function saveSetting(key, value) {
  try { localStorage.setItem(key, value); }
  catch (_) { /* El almacenamiento puede estar deshabilitado. */ }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 18000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Tiempo de espera agotado tras ${Math.round(timeoutMs / 1000)} segundos.`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function stableId(value) {
  // ID de uso local: no guarda la URL completa ni sus posibles parámetros.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ch-${(hash >>> 0).toString(16)}`;
}

function initials(name) {
  const words = String(name || 'TV').replace(/[·|]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'TV';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function safeLogo(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.href);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch (_) { return ''; }
}

function logoMarkup(channel, large = false) {
  const logo = safeLogo(channel.logo);
  const klass = `channel-logo${large ? ' large-logo' : ''}`;
  if (logo) {
    return `<div class="${klass}"><img src="${escapeHtml(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;border-radius:inherit" onerror="this.remove()"><span style="display:none">${escapeHtml(initials(channel.name))}</span></div>`;
  }
  return `<div class="${klass}">${escapeHtml(initials(channel.name))}</div>`;
}

function currentChannel() {
  return state.channels.find(channel => channel.id === state.activeChannelId) || null;
}

function isFavorite(channel) { return state.favorites.has(channel.id); }

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function setConnectionStatus(key) {
  state.connectionStatusKey = key;
  $('#connectionText').textContent = t(key);
}

function setDialogFeedback(message, error = false) {
  const feedback = $('#dialogFeedback');
  feedback.textContent = message;
  feedback.hidden = false;
  feedback.classList.toggle('is-error', error);
}

function renderCounts() {
  $('#allCount').textContent = state.channels.length;
  $('#favCount').textContent = state.channels.filter(isFavorite).length;
  const locale = document.documentElement.lang || 'es';
  const formatted = new Intl.NumberFormat(locale).format(state.visibleChannelCount);
  $('#visibleCount').textContent = formatted;
  $('#footerChannelCount').textContent = formatted;
}

function updateSourceControls() {
  const buttons = {
    'iptv-org': $('#sourceList1Button'),
    moncho: $('#sourceList2Button'),
    public: $('#sourceList3Button')
  };
  const refresh = $('#refreshSourceButton');
  const label = $('#activeSourceLabel');
  if (!buttons['iptv-org'] || !buttons.moncho || !buttons.public || !refresh || !label) return;

  const sourceNames = {
    'iptv-org': 'IPTV-org',
    moncho: 'MonchoApps',
    public: 'Canales públicos'
  };
  const sourceNumbers = { 'iptv-org': 'Lista 1', moncho: 'Lista 2', public: 'Lista 3' };
  for (const [source, button] of Object.entries(buttons)) {
    const active = state.activeSource === source;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = state.loadingSource === source;
  }
  refresh.disabled = Boolean(state.loadingSource);

  const cache = state.sourceCache[state.activeSource];
  const sourceName = cache?.playlistName || sourceNames[state.activeSource] || sourceNames['iptv-org'];
  const total = state.channels.length;
  label.textContent = `${sourceNumbers[state.activeSource] || 'Lista 1'} · ${sourceName} · ${new Intl.NumberFormat(document.documentElement.lang || 'es').format(total)} canales`;
  if (state.loadingSource) {
    label.textContent = `${sourceNumbers[state.loadingSource] || 'Lista'} · ${sourceNames[state.loadingSource] || 'Cargando'} · Cargando…`;
  }
  refresh.title = state.loadingSource
    ? 'Cargando lista…'
    : state.activeSource === 'public'
      ? 'Volver a cargar la lista integrada'
      : 'Actualizar lista activa';
  refresh.setAttribute('aria-label', refresh.title);
}

function getChannelCategories(channel) {
  const raw = Array.isArray(channel.categories) ? channel.categories : [channel.group || 'Otros'];
  return [...new Set(raw.map(value => String(value || '').trim()).filter(Boolean))];
}

function getChannelCountries(channel) {
  const raw = Array.isArray(channel.countryCodes) ? channel.countryCodes : (channel.countryCode ? [channel.countryCode] : []);
  return [...new Set(raw.map(value => String(value || '').trim().toUpperCase()).filter(Boolean))];
}

function countryLabel(code) {
  const locale = document.documentElement.lang || 'es';
  try {
    if (/^[A-Z]{2}$/.test(code) && typeof Intl.DisplayNames === 'function') {
      return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code;
    }
  } catch (_) { /* Código no contemplado por la tabla regional del navegador. */ }
  return code;
}

function fillFilterSelect(select, allLabel, values, selectedValue, labelForValue) {
  const options = [`<option value="all">${escapeHtml(allLabel)}</option>`];
  for (const value of values) {
    options.push(`<option value="${escapeHtml(value)}">${escapeHtml(labelForValue(value))}</option>`);
  }
  select.innerHTML = options.join('');
  select.value = values.includes(selectedValue) ? selectedValue : 'all';
}

function renderCategories() {
  const categories = [...new Set(state.channels.flatMap(getChannelCategories))]
    .sort((a, b) => a.localeCompare(b, document.documentElement.lang || 'es'));
  const countries = [...new Set(state.channels.flatMap(getChannelCountries))]
    .sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), document.documentElement.lang || 'es'));
  fillFilterSelect($('#categoryFilter'), t('allCategories'), categories, state.category, value => value);
  fillFilterSelect($('#countryFilter'), t('allCountries'), countries, state.country, countryLabel);
}

function getVisibleChannels() {
  let channels = [...state.channels];
  if (state.view === 'favorites' || state.filter === 'favorites') channels = channels.filter(isFavorite);
  if (state.view === 'recent') channels = channels.filter(channel => state.recents.includes(channel.id));

  // Filtros adicionales disponibles únicamente cuando se consulta MonchoApps.
  if (state.activeSource === 'moncho') {
    if (state.filter === 'ready') channels = channels.filter(channel => channel.playable === true);
    if (state.filter === 'protected') channels = channels.filter(channel => channel.protected === true);
    if (state.filter === 'restricted') channels = channels.filter(channel => channel.playable !== true && channel.protected !== true);
  }

  if (state.category !== 'all' && state.view === 'all') {
    channels = channels.filter(channel => getChannelCategories(channel).includes(state.category));
  }
  if (state.country !== 'all' && state.view === 'all') {
    channels = channels.filter(channel => getChannelCountries(channel).includes(state.country));
  }
  if (state.query) {
    const locale = document.documentElement.lang || 'es';
    const term = state.query.toLocaleLowerCase(locale);
    channels = channels.filter(channel => {
      const searchable = [channel.name, channel.group, ...getChannelCategories(channel), ...getChannelCountries(channel).map(countryLabel), ...(channel.sources || [])].join(' ');
      return searchable.toLocaleLowerCase(locale).includes(term);
    });
  }
  channels.sort((a, b) => a.name.localeCompare(b.name, document.documentElement.lang || 'es'));
  if (state.view === 'recent') {
    channels.sort((a, b) => state.recents.indexOf(a.id) - state.recents.indexOf(b.id));
  }
  return channels;
}

function renderChannels() {
  const list = $('#channelList');
  const empty = $('#emptyList');
  const previousScrollTop = list.scrollTop;
  const channels = getVisibleChannels();
  state.visibleChannelCount = channels.length;
  const displayedChannels = channels.slice(0, state.renderLimit);
  const monchoSummary = $('#monchoSummary');
  if (monchoSummary) {
    monchoSummary.hidden = state.activeSource !== 'moncho';
    if (state.activeSource === 'moncho' && state.monchoStats) {
      const locale = document.documentElement.lang || 'es';
      const number = value => new Intl.NumberFormat(locale).format(value);
      $('#monchoSummaryText').textContent = t('monchoSummary', { total: number(state.monchoStats.uniqueCount), ready: number(state.monchoStats.playableCount), protected: number(state.monchoStats.protectedCount), restricted: number(state.monchoStats.restrictedCount) });
      $('#monchoFilterReadyCount').textContent = number(state.monchoStats.playableCount);
      $('#monchoFilterProtectedCount').textContent = number(state.monchoStats.protectedCount);
      $('#monchoFilterRestrictedCount').textContent = number(state.monchoStats.restrictedCount);
      $('#monchoFilterAllCount').textContent = number(state.monchoStats.uniqueCount);
    }
  }
  list.innerHTML = displayedChannels.map((channel, index) => {
    const active = channel.id === state.activeChannelId;
    const favorite = isFavorite(channel);
    return `
      <div class="channel-row ${active ? 'is-selected' : ''}" data-channel-id="${escapeHtml(channel.id)}" role="button" tabindex="0" aria-label="${escapeHtml(t('player'))}: ${escapeHtml(channel.name)}">
        <span class="remote-key-number">${String(index + 1).padStart(2, '0')}</span>
        ${logoMarkup(channel)}
        <div class="channel-row-copy"><strong>${escapeHtml(channel.name)}</strong><small>${escapeHtml(channel.group || 'Otros')}</small></div>
        <div class="channel-row-state">
          ${channel.source === 'Moncho' ? `<span class="channel-availability ${channel.playable ? 'is-ready' : 'is-blocked'}" title="${escapeHtml(channel.playbackReason || '')}">${escapeHtml(channel.statusShort || (channel.playable ? 'LISTO' : 'NO'))}</span>` : ''}
          ${active ? `<span class="playing-dot"></span><span>${escapeHtml(t('active'))}</span>` : ''}
        </div>
        <button class="row-fav ${favorite ? 'is-favorite' : ''}" data-favorite-id="${escapeHtml(channel.id)}" type="button" aria-label="${escapeHtml(t(favorite ? 'removeFavorite' : 'addFavorite'))}" title="${escapeHtml(t(favorite ? 'removeFavorite' : 'addFavorite'))}">${favorite ? '♥' : '♡'}</button>
      </div>`;
  }).join('');
  empty.hidden = channels.length > 0;
  list.hidden = channels.length === 0;
  list.scrollTop = previousScrollTop;
  $('#channelHeading').firstChild.textContent = state.view === 'favorites' || state.filter === 'favorites' ? `${t('favorites')} ` : state.view === 'recent' ? `${t('recent')} ` : `${t('channels')} `;
  $('#breadcrumbCurrent').textContent = state.view === 'favorites' ? t('favorites') : state.view === 'recent' ? t('recent') : state.country !== 'all' ? countryLabel(state.country) : state.category !== 'all' ? state.category : t('live');
  $('#emptyList strong').textContent = t('noChannels');
  $('#emptyList p').textContent = state.query ? t('searchEmpty') : t('emptyHint');
  renderCounts();

  list.querySelectorAll('.channel-row').forEach(row => {
    const selectRow = () => playChannel(row.dataset.channelId);
    row.addEventListener('click', event => {
      if (event.target.closest('[data-favorite-id]')) return;
      selectRow();
    });
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectRow(); }
    });
  });
  list.querySelectorAll('[data-favorite-id]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      toggleFavorite(button.dataset.favoriteId);
    });
  });
}

function renderCurrent() {
  const channel = currentChannel();
  const favoriteButton = $('#favoriteCurrent');
  if (!channel) {
    $('#currentLogo').textContent = 'TV';
    $('#nowKicker').textContent = t('noChannelSelected');
    $('#currentTitle').textContent = t('chooseWhat');
    $('#currentCategory').textContent = t('channelsHere');
    favoriteButton.disabled = true;
    favoriteButton.classList.remove('is-favorite');
    favoriteButton.textContent = '♡';
    return;
  }
  $('#currentLogo').innerHTML = safeLogo(channel.logo)
    ? `<img src="${escapeHtml(safeLogo(channel.logo))}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`
    : escapeHtml(initials(channel.name));
  $('#nowKicker').textContent = t('selected');
  $('#currentTitle').textContent = channel.name;
  $('#currentCategory').textContent = channel.group || 'Otros';
  favoriteButton.disabled = false;
  favoriteButton.classList.toggle('is-favorite', isFavorite(channel));
  favoriteButton.textContent = isFavorite(channel) ? '♥' : '♡';
  favoriteButton.setAttribute('aria-label', t(isFavorite(channel) ? 'removeFavorite' : 'addFavorite'));
  favoriteButton.title = t(isFavorite(channel) ? 'removeFavorite' : 'addFavorite');
}

function syncNavigation() {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.view === state.view);
  });
  document.querySelectorAll('.filter-tab').forEach(button => {
    button.classList.toggle('is-active', button.dataset.filter === state.filter);
  });
  document.querySelectorAll('.moncho-only').forEach(element => { element.hidden = state.activeSource !== 'moncho'; });
}

function render() {
  updateSourceControls();
  renderCategories();
  renderChannels();
  renderCurrent();
  syncNavigation();
}

function stopPlayback() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
  if (state.shaka) {
    const previousPlayer = state.shaka;
    state.shaka = null;
    state.shakaCleanup = previousPlayer.destroy().catch(() => {});
  }
  video.pause();
  video.removeAttribute('src');
  video.load();
  stage.classList.remove('is-playing');
  emptyState.hidden = false;
  playerError.hidden = true;
}

function showPlayerError(message) {
  playerError.textContent = message;
  playerError.hidden = false;
  stage.classList.add('is-playing');
  emptyState.hidden = true;
  setConnectionStatus('failedLoad');
}

function openDrmConsentDialog(channel) {
  state.pendingDrmChannelId = channel.id;
  $('#drmChannelName').textContent = channel.name;
  $('#drmConsent').checked = false;
  $('#drmLicenseUrl').value = '';
  $('#drmSystemSelect').value = channel.drmSystemGuess || 'org.w3.clearkey';
  $('#drmStartButton').disabled = true;
  const note = $('#drmAvailabilityNote');
  if (channel.canUseOfficialLicense) {
    note.textContent = t('drmReadyNote');
    note.classList.remove('is-error');
  } else {
    note.textContent = channel.playbackReason || t('drmNoManifest');
    note.classList.add('is-error');
  }
  drmDialog.showModal();
}

function validateDrmForm() {
  const channel = state.channels.find(item => item.id === state.pendingDrmChannelId);
  const consent = $('#drmConsent').checked;
  const rawLicense = $('#drmLicenseUrl').value.trim();
  let validLicense = false;
  try {
    const parsed = new URL(rawLicense);
    validLicense = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch (_) { /* URL incompleta o no válida. */ }
  $('#drmStartButton').disabled = !(channel?.canUseOfficialLicense && consent && validLicense);
}

async function playProtectedWithOfficialLicense(channel, keySystem, licenseUrl) {
  if (!window.shaka || !window.shaka.Player) {
    showPlayerError(t('drmNoShaka'));
    return;
  }
  shaka.polyfill.installAll();
  if (!shaka.Player.isBrowserSupported()) {
    showPlayerError(t('drmUnsupported'));
    return;
  }
  setConnectionStatus('connecting');
  try {
    await state.shakaCleanup;
    if (state.shaka) {
      const previousPlayer = state.shaka;
      state.shaka = null;
      await previousPlayer.destroy();
    }
    const player = new shaka.Player(video);
    state.shaka = player;
    player.addEventListener('error', event => {
      const detail = event.detail;
      const code = detail?.code ? ` (código ${detail.code})` : '';
      showPlayerError(`${t('drmLicenseFailed')}${code}`);
    });
    player.configure({ drm: { servers: { [keySystem]: licenseUrl } } });
    await player.load(channel.url);
    stage.classList.add('is-playing');
    emptyState.hidden = true;
    await video.play();
    setConnectionStatus('ready');
  } catch (error) {
    console.error('Fallo de reproducción DRM con licencia oficial:', error);
    showPlayerError(t('drmPlaybackFailed'));
  }
}

async function playClearDash(channel) {
  if (!window.shaka || !window.shaka.Player) {
    showPlayerError('No está disponible Shaka Player para reproducir este manifiesto DASH.');
    return;
  }
  shaka.polyfill.installAll();
  if (!shaka.Player.isBrowserSupported()) {
    showPlayerError('Este navegador no ofrece soporte para Shaka Player.');
    return;
  }

  setConnectionStatus('connecting');
  try {
    await state.shakaCleanup;
    if (state.shaka) {
      const previousPlayer = state.shaka;
      state.shaka = null;
      await previousPlayer.destroy();
    }
    const player = new shaka.Player(video);
    state.shaka = player;
    player.addEventListener('error', event => {
      const code = event.detail?.code ? ` (código ${event.detail.code})` : '';
      showPlayerError(`No se pudo reproducir el manifiesto DASH sin DRM${code}. Revisá CORS, disponibilidad y códecs.`);
    });
    // Solo se carga el manifiesto público HTTPS. No se adjuntan claves,
    // tokens, cookies ni cabeceras privadas del catálogo.
    await player.load(channel.url);
    stage.classList.add('is-playing');
    emptyState.hidden = true;
    try {
      await video.play();
    } catch (playError) {
      if (playError?.name === 'NotAllowedError') showToast(t('playHint'));
      else throw playError;
    }
    setConnectionStatus('ready');
  } catch (error) {
    console.error('Fallo al cargar DASH sin DRM:', error);
    showPlayerError('No se pudo cargar el stream DASH. Puede estar desconectado, protegido o bloquear solicitudes CORS.');
  }
}

function playChannel(id) {
  const channel = state.channels.find(item => item.id === id);
  if (!channel) return;
  state.activeChannelId = channel.id;
  state.recents = [channel.id, ...state.recents.filter(item => item !== channel.id)].slice(0, 30);
  saveArray('playtv-web-recents', state.recents);
  renderChannels();
  renderCurrent();
  stopPlayback();
  stage.classList.add('is-playing');
  emptyState.hidden = true;

  if (channel.protected) {
    openDrmConsentDialog(channel);
    return;
  }
  if (channel.playable === false) {
    showPlayerError(channel.playbackReason || 'Esta emisión no se puede reproducir en este navegador.');
    return;
  }

  setConnectionStatus('connecting');
  const source = String(channel.url || '').trim();
  if (!source) {
    showPlayerError('El catálogo no proporciona una dirección de reproducción para esta entrada.');
    return;
  }
  const isHls = /\.m3u8(?:$|[?#])/i.test(source) || channel.type === 'hls';
  if (channel.type === 'dash') {
    playClearDash(channel);
    return;
  }
  if (isHls) {
    if (window.Hls && Hls.isSupported()) {
      state.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30
      });
      state.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const reason = data.type === Hls.ErrorTypes.NETWORK_ERROR
          ? t('streamNetworkError')
          : data.type === Hls.ErrorTypes.MEDIA_ERROR
            ? t('streamMediaError')
            : t('streamError');
        showPlayerError(reason);
        state.hls?.destroy();
        state.hls = null;
      });
      state.hls.loadSource(source);
      state.hls.attachMedia(video);
      state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => showToast(t('playHint')));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.play().catch(() => showToast(t('playHint')));
    } else {
      showPlayerError(t('unsupportedBrowser'));
    }
  } else {
    video.src = source;
    video.play().catch(() => showToast(t('playHint')));
  }
  setConnectionStatus('ready');
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveArray('playtv-web-favorites', [...state.favorites]);
  render();
}

function parseAttributes(info) {
  const attrs = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(info)) !== null) attrs[match[1].toLowerCase()] = match[2];
  return attrs;
}

function parseM3U(text, baseUrl = '') {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
  const channels = [];
  let metadata = null;
  let pendingGroup = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      const info = comma >= 0 ? line.slice(0, comma) : line;
      const attrs = parseAttributes(info);
      const title = comma >= 0 ? line.slice(comma + 1).trim() : '';
      const tvgId = attrs['tvg-id'] || '';
      const countryCodes = String(attrs['tvg-country'] || attrs.country || '')
        .split(/[;,|\s]+/).map(code => code.trim().toUpperCase()).filter(code => /^[A-Z]{2}$/.test(code));
      // Algunas entradas antiguas no incluyen tvg-country; IPTV-org suele
      // codificar el país al final del tvg-id (por ejemplo: Sample.us@SD).
      if (!countryCodes.length) {
        const idCountry = tvgId.match(/\.([a-z]{2})(?:@[^.]*)?$/i)?.[1];
        if (idCountry) countryCodes.push(idCountry.toUpperCase());
      }
      metadata = {
        name: attrs['tvg-name'] || title || 'Canal sin nombre',
        group: attrs['group-title'] || pendingGroup || 'Otros',
        logo: attrs['tvg-logo'] || '',
        tvgId,
        countryCodes,
        categories: String(attrs['tvg-category'] || attrs['group-title'] || pendingGroup || 'Otros').split(';').map(value => value.trim()).filter(Boolean),
        attrs
      };
      pendingGroup = '';
      continue;
    }
    if (line.startsWith('#EXTGRP:')) {
      pendingGroup = line.slice(8).trim();
      if (metadata && !metadata.group) metadata.group = pendingGroup;
      continue;
    }
    if (line.startsWith('#') || !/^https?:\/\//i.test(line) && !baseUrl) continue;
    if (!metadata) metadata = { name: line.split('/').pop() || 'Canal', group: pendingGroup || 'Otros', logo: '', tvgId: '', countryCodes: [], categories: [pendingGroup || 'Otros'], attrs: {} };
    let resolvedUrl = line;
    try { if (baseUrl) resolvedUrl = new URL(line, baseUrl).href; } catch (_) { /* Se valida más abajo. */ }
    try {
      const parsedUrl = new URL(resolvedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) { metadata = null; continue; }
    } catch (_) { metadata = null; continue; }
    const name = metadata.name || 'Canal sin nombre';
    channels.push({
      id: stableId(`${name}|${resolvedUrl}`),
      name,
      group: metadata.group || 'Otros',
      categories: metadata.categories?.length ? metadata.categories : [metadata.group || 'Otros'],
      countryCodes: metadata.countryCodes || [],
      tvgId: metadata.tvgId || '',
      logo: metadata.logo,
      url: resolvedUrl,
      type: /\.m3u8(?:$|[?#])/i.test(resolvedUrl) ? 'hls' : 'video',
      isDemo: false
    });
    metadata = null;
  }
  return channels;
}

function activateSourceCache(source, cache, notify = true) {
  if (!cache?.channels?.length) return false;
  stopPlayback();
  state.channels = cache.channels;
  state.activeSource = source;
  state.monchoStats = source === 'moncho' ? cache.stats || null : null;
  state.activeChannelId = null;
  state.playlistName = cache.playlistName || (source === 'moncho' ? 'MonchoApps · catálogo completo' : 'IPTV-org');
  state.view = 'all';
  state.category = 'all';
  state.country = 'all';
  state.filter = 'all';
  state.query = '';
  state.renderLimit = CHANNEL_PAGE_SIZE;
  $('#searchInput').value = '';
  $('#channelList').scrollTop = 0;
  saveSetting('botsebita-lab-tv-active-source', source);
  render();
  setConnectionStatus('playlistLoaded');
  if (notify) {
    const label = source === 'moncho' ? 'Lista 2 · MonchoApps' : source === 'public' ? 'Lista 3 · Canales públicos' : 'Lista 1';
    showToast(`${label}: ${cache.channels.length} canales`);
  }
  return true;
}

function replacePlaylist(channels, name, options = {}) {
  if (!channels.length) {
    setDialogFeedback(t('invalidM3U'), true);
    return false;
  }
  const source = options.source || 'iptv-org';
  const cache = { channels, playlistName: name, stats: null, refreshUrl: options.refreshUrl || null };
  state.sourceCache[source] = cache;
  stopPlayback();
  state.channels = channels;
  state.activeSource = source;
  state.monchoStats = null;
  state.filter = 'all';
  state.renderLimit = CHANNEL_PAGE_SIZE;
  state.activeChannelId = null;
  state.view = 'all';
  state.category = 'all';
  state.country = 'all';
  state.query = '';
  state.playlistName = name;
  $('#searchInput').value = '';
  saveSetting('botsebita-lab-tv-active-source', source);
  render();
  setConnectionStatus('playlistLoaded');
  $('#emptyList strong').textContent = t('noChannels');
  $('#emptyList p').textContent = t('emptyHint');
  if (playlistDialog.open) playlistDialog.close();
  showToast(t('importSuccess', { count: new Intl.NumberFormat(document.documentElement.lang || 'es').format(channels.length) }));
  return true;
}

async function importRemotePlaylist(url) {
  setDialogFeedback(t('downloading'));
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(t('invalidURL'));
    const response = await fetchWithTimeout(parsed.href, { method: 'GET', mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
    const text = await response.text();
    if (!text.trimStart().startsWith('#EXTM3U')) throw new Error(t('invalidPlaylist'));
    const channels = parseM3U(text, parsed.href);
    replacePlaylist(channels, parsed.hostname, { refreshUrl: parsed.href });
  } catch (error) {
    const message = error instanceof TypeError
      ? t('playlistCorsError')
      : error.message || t('failedLoad');
    setDialogFeedback(message, true);
  }
}

function openPlaylistDialog() {
  $('#dialogFeedback').hidden = true;
  $('#playlistUrl').value = DEFAULT_PLAYLIST_URL;
  $('#directStreamUrl').value = '';
  playlistDialog.showModal();
}

/**
 * MonchoApps publica catálogos mixtos. Esta capa solo normaliza metadatos para
 * mostrar todas las entradas; nunca copia ni utiliza claves, tokens, cookies o
 * cabeceras del proveedor. Los accesos protegidos requieren autorización real.
 */
function collectMonchoEntries(catalog) {
  const collected = [];
  const seen = new WeakSet();
  const collectionKeys = new Set([
    'categories', 'groups', 'channels', 'streams', 'items', 'entries', 'samples',
    'data', 'results', 'stations', 'canales', 'contents', 'list', 'playlist'
  ]);
  const channelMarkers = new Set([
    'original_url', 'url', 'stream_url', 'play_url', 'src', 'type', 'format',
    'globalindex', 'drm_license_uri', 'license', 'license_type', 'drm_type', 'headers'
  ]);

  const visit = (node, groupName = 'Moncho', depth = 0) => {
    if (!node || depth > 12) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, groupName, depth + 1);
      return;
    }
    if (typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    const keys = Object.keys(node);
    const isChannel = keys.some(key => channelMarkers.has(key.toLowerCase()));
    if (isChannel) collected.push({ entry: node, groupName });
    const hasNestedCollections = keys.some(key => collectionKeys.has(key.toLowerCase()));
    const nestedGroupName = hasNestedCollections
      ? getMonchoField(node, ['category', 'categoria', 'group', 'grupo', 'name', 'title'], groupName)
      : groupName;

    for (const key of keys) {
      const normalizedKey = key.toLowerCase();
      const value = node[key];
      if (!collectionKeys.has(normalizedKey) && !Array.isArray(value)) continue;
      if (normalizedKey === 'categories' || normalizedKey === 'groups') {
        visit(value, groupName, depth + 1);
      } else {
        visit(value, nestedGroupName, depth + 1);
      }
    }

    // Algunos catálogos representan las categorías como propiedades cuyo valor
    // es una lista, en lugar de usar una matriz "categories".
    for (const [key, value] of Object.entries(node)) {
      if (collectionKeys.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) visit(value, key, depth + 1);
    }
  };

  visit(catalog);
  return collected;
}

function getMonchoField(entry, keys, fallback = '') {
  for (const key of keys) {
    const value = entry?.[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function monchoPlaybackInfo(entry) {
  const rawUrl = getMonchoField(entry, ['original_url', 'url', 'stream_url', 'play_url', 'src']);
  const type = getMonchoField(entry, ['type', 'format', 'stream_type']).toUpperCase();
  const licenseType = getMonchoField(entry, ['license_type', 'drm_type', 'drm_system']).toUpperCase();
  const protectionType = String(entry.protection?.type || entry.protection?.scheme || '').toUpperCase();
  const drmDescriptor = [type, licenseType, protectionType].filter(Boolean).join(' ');
  const drm = Boolean(
    entry.drm_license_uri || entry.license || entry.license_uri || entry.licensedetails ||
    /CLEARKEY|WIDEVINE|PLAYREADY|FAIRPLAY|CENC|\bDRM\b/.test(drmDescriptor)
  );
  const headerObject = entry.headers || entry.http_headers || entry.request_headers || entry.required_headers;
  const hasHeaders = Boolean(headerObject && typeof headerObject === 'object' && Object.values(headerObject).some(value => String(value || '').trim()));
  const tokenized = Boolean(entry.token || entry.access_token || entry.signature || entry.jwt || entry.authorization) ||
    /(?:^|\/)tok_[^/]+|[?&](?:token|auth|sig|signature|jwt|access_token)=/i.test(rawUrl);
  const absoluteHttps = /^https:\/\//i.test(rawUrl);
  const hasManifest = /\.(?:mpd|m3u8)(?:$|[?#])/i.test(rawUrl);
  const drmSystemGuess = /WIDEVINE|PLAYREADY|FAIRPLAY/.test(drmDescriptor) ? 'com.widevine.alpha' : 'org.w3.clearkey';

  if (drm) {
    const reasons = ['Emisión marcada como protegida por DRM.'];
    if (!rawUrl) reasons.push('El registro no contiene una dirección de manifiesto.');
    else if (!absoluteHttps) reasons.push('La dirección es relativa o no usa HTTPS; la app no inventa una ruta de servidor.');
    else if (!hasManifest) reasons.push('No se reconoce un manifiesto DASH o HLS directo.');
    if (tokenized) reasons.push('El origen requiere un token o firma de acceso que no se genera ni se reutiliza.');
    if (hasHeaders) reasons.push('El catálogo declara cabeceras del proveedor que no se completan automáticamente.');
    if (absoluteHttps && hasManifest && !tokenized && !hasHeaders) reasons.push('Hace falta una licencia oficial del proveedor y autorización válida.');
    return {
      playable: false, protected: true,
      canUseOfficialLicense: absoluteHttps && hasManifest && !tokenized && !hasHeaders,
      drmSystemGuess, type: 'drm', statusShort: 'DRM', reason: reasons.join(' '),
      requiresHeaders: hasHeaders, requiresToken: tokenized
    };
  }

  if (!rawUrl) return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'SIN URL', reason: 'El registro no contiene una URL de reproducción.', requiresHeaders: hasHeaders, requiresToken: tokenized };
  if (!absoluteHttps) return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'RUTA', reason: 'La dirección es relativa o no usa HTTPS. Se muestra en el catálogo, pero no se construye una URL de acceso.', requiresHeaders: hasHeaders, requiresToken: tokenized };
  if (tokenized) return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'TOKEN', reason: 'La URL depende de un token o firma de acceso que la app no genera ni reutiliza.', requiresHeaders: hasHeaders, requiresToken: true };
  if (hasHeaders) return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'HDR', reason: 'La fuente declara cabeceras del proveedor. No se completan ni se envían automáticamente.', requiresHeaders: true, requiresToken: false };

  let parsed;
  try { parsed = new URL(rawUrl); } catch (_) {
    return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'URL', reason: 'La URL del registro no es válida.' };
  }
  if (parsed.protocol !== 'https:') return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'URL', reason: 'El reproductor solo habilita enlaces HTTPS directos.' };

  const hasPlaylist = /\.(?:m3u8|m3u)(?:$|[?#])/i.test(rawUrl);
  const radioCategory = /RADIO/i.test(String(entry.category || ''));
  const audio = /\.(?:mp3|aac|m4a|ogg|opus|wav)(?:$|[?#])/i.test(rawUrl) || /^(?:AUDIO|MP3|AAC)$/.test(type) || (radioCategory && !hasPlaylist);
  const hls = /^(?:HLS|M3U8)$/.test(type) || hasPlaylist;
  const video = /\.(?:mp4|webm|ogv)(?:$|[?#])/i.test(rawUrl) || /^(?:VIDEO|DIRECT|MP4)$/.test(type);
  const dash = /\.mpd(?:$|[?#])/i.test(rawUrl) || /^(?:DASH|MPD)$/.test(type);
  if (audio) return { playable: true, protected: false, canUseOfficialLicense: false, type: 'audio', statusShort: 'AUDIO', reason: 'Audio HTTPS directo. La reproducción depende de CORS y del formato compatible.' };
  if (hls) return { playable: true, protected: false, canUseOfficialLicense: false, type: 'hls', statusShort: 'HLS', reason: 'HLS HTTPS directo sin protección ni credenciales declaradas. La reproducción depende de CORS y disponibilidad.' };
  if (video) return { playable: true, protected: false, canUseOfficialLicense: false, type: 'video', statusShort: 'VIDEO', reason: 'Video HTTPS directo. La reproducción depende del códec, CORS y disponibilidad.' };
  if (dash) return { playable: true, protected: false, canUseOfficialLicense: false, type: 'dash', statusShort: 'DASH', reason: 'Manifiesto DASH HTTPS sin indicadores de DRM, tokens ni cabeceras especiales. Se probará con Shaka Player; la reproducción depende de CORS, códecs y disponibilidad.' };
  return { playable: false, protected: false, canUseOfficialLicense: false, type: 'blocked', statusShort: 'FORMATO', reason: 'Formato no reconocido como stream directo compatible.' };
}

function extractMonchoChannels(catalogRecords) {
  const unique = new Map();
  let rawCount = 0;
  const categoryNames = new Set();
  const perSource = {};

  for (const sourceRecord of catalogRecords) {
    const entries = collectMonchoEntries(sourceRecord.catalog);
    perSource[sourceRecord.label] = entries.length;
    rawCount += entries.length;
    for (const { entry, groupName } of entries) {
      const name = getMonchoField(entry, ['name', 'nombre', 'title', 'channel', 'canal', 'id'], `Canal ${rawCount}`);
      const group = getMonchoField(entry, ['category', 'categoria', 'group', 'grupo'], groupName || 'Moncho');
      categoryNames.add(group);
      const url = getMonchoField(entry, ['original_url', 'url', 'stream_url', 'play_url', 'src']);
      const globalIndex = entry.globalIndex ?? entry.global_index ?? '';
      const identity = url
        ? `${name.toLocaleLowerCase()}|${url.toLocaleLowerCase()}`
        : `${name.toLocaleLowerCase()}|${group.toLocaleLowerCase()}|${globalIndex || rawCount}`;
      const key = identity;
      const playback = monchoPlaybackInfo({ ...entry, category: entry.category || group });
      const existing = unique.get(key);

      if (existing) {
        if (!existing.sources.includes(sourceRecord.label)) existing.sources.push(sourceRecord.label);
        if (!existing.categories.includes(group)) existing.categories.push(group);
        // Ante discrepancias entre copias, conservar la clasificación más restrictiva.
        if (!playback.playable && existing.playable) Object.assign(existing, playback);
        continue;
      }

      unique.set(key, {
        id: `moncho-${stableId(key)}`,
        name,
        group,
        categories: [group],
        // No conservar URLs que transportan tokens o firmas de acceso.
        url: playback.requiresToken ? '' : url,
        logo: getMonchoField(entry, ['icono', 'logo', 'icon', 'image']),
        type: playback.type,
        source: 'Moncho',
        sources: [sourceRecord.label],
        playable: playback.playable,
        protected: Boolean(playback.protected),
        canUseOfficialLicense: Boolean(playback.canUseOfficialLicense),
        drmSystemGuess: playback.drmSystemGuess || null,
        requiresHeaders: Boolean(playback.requiresHeaders),
        requiresToken: Boolean(playback.requiresToken),
        statusShort: playback.statusShort,
        playbackReason: playback.reason,
        globalIndex: globalIndex || null
      });
    }
  }

  const channels = [...unique.values()].sort((a, b) =>
    a.group.localeCompare(b.group, 'es') || a.name.localeCompare(b.name, 'es')
  );
  const playableCount = channels.filter(channel => channel.playable).length;
  const protectedCount = channels.filter(channel => channel.protected).length;
  const restrictedCount = channels.filter(channel => !channel.playable && !channel.protected).length;
  return {
    channels,
    stats: {
      rawCount,
      uniqueCount: channels.length,
      duplicateCount: Math.max(0, rawCount - channels.length),
      playableCount,
      protectedCount,
      restrictedCount,
      blockedCount: channels.length - playableCount,
      categoryCount: categoryNames.size,
      perSource
    }
  };
}

async function loadMonchoCatalog() {
  const requestId = ++state.sourceLoadSequence;
  state.loadingSource = 'moncho';
  updateSourceControls();
  setConnectionStatus('connecting');
  try {
    const results = await Promise.allSettled(MONCHO_CATALOGS.map(async source => {
      const response = await fetchWithTimeout(`${source.url}?v=${Date.now()}`, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error(`${source.label}: HTTP ${response.status}`);
      return { label: source.label, catalog: await response.json() };
    }));
    if (requestId !== state.sourceLoadSequence) return;
    const catalogs = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    if (!catalogs.length) {
      const reasons = results.map(result => result.status === 'rejected' ? result.reason?.message : '').filter(Boolean);
      throw new Error(reasons.join(' · ') || 'No se pudo descargar ningún catálogo de MonchoApps.');
    }

    const { channels, stats } = extractMonchoChannels(catalogs);
    if (!channels.length) throw new Error('Los catálogos se descargaron, pero no contienen registros de canales reconocibles.');
    const cache = { channels, stats, playlistName: 'MonchoApps · catálogo completo', refreshUrl: null };
    state.sourceCache.moncho = cache;
    activateSourceCache('moncho', cache, false);
    const loadedLabels = catalogs.map(item => item.label).join(' + ');
    const warning = results.some(result => result.status === 'rejected') ? ' (un catálogo no respondió)' : '';
    showToast(`Lista 2 · MonchoApps: ${stats.uniqueCount} registros · ${stats.playableCount} reproducibles · ${stats.protectedCount} DRM${warning}`);
    console.info('MonchoApps v1.10', { loadedLabels, ...stats, catalogsLoaded: catalogs.length });
  } catch (error) {
    if (requestId !== state.sourceLoadSequence) return;
    console.error('No se pudo cargar MonchoApps:', error);
    setConnectionStatus('failedLoad');
    showToast(error.message || 'No se pudo cargar Moncho. Revisá la conexión o el catálogo.');
  } finally {
    if (requestId === state.sourceLoadSequence) {
      state.loadingSource = null;
      updateSourceControls();
    }
  }
}

async function loadDefaultPlaylist(options = {}) {
  const requestId = ++state.sourceLoadSequence;
  const url = options.url || DEFAULT_PLAYLIST_URL;
  const playlistName = options.name || 'IPTV-org · Todos los canales';
  state.loadingSource = 'iptv-org';
  updateSourceControls();
  setConnectionStatus('loadingChannels');
  $('#emptyList strong').textContent = t('loadingChannels');
  $('#emptyList p').textContent = t('heroSubtitle');
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-cache'
    });
    if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
    const playlistText = await response.text();
    if (!playlistText.trimStart().startsWith('#EXTM3U')) throw new Error(t('invalidPlaylist'));
    const channels = parseM3U(playlistText, url);
    if (!channels.length) throw new Error('La lista se descargó, pero no contiene canales válidos.');
    if (requestId !== state.sourceLoadSequence) return;
    replacePlaylist(channels, playlistName, { refreshUrl: url });
    setConnectionStatus('playlistLoaded');
  } catch (error) {
    if (requestId !== state.sourceLoadSequence) return;
    if (!state.channels.length) {
      state.channels = [...SAMPLE_CHANNELS];
      state.playlistName = 'Canales de demostración (respaldo)';
      state.sourceCache['iptv-org'] = { channels: state.channels, playlistName: state.playlistName, stats: null, refreshUrl: null };
      render();
    }
    setConnectionStatus('failedLoad');
    showToast(error.message || t('failedLoad'));
    console.error('Error al cargar la playlist:', error);
  } finally {
    if (requestId === state.sourceLoadSequence) {
      state.loadingSource = null;
      updateSourceControls();
    }
  }
}

function loadPublicPlaylist(showNotification = true) {
  // Esta lista se procesa localmente; invalida cualquier descarga remota anterior.
  ++state.sourceLoadSequence;
  state.loadingSource = null;
  const playlistText = window.BOTSEBITA_LIST3_M3U;
  if (typeof playlistText !== 'string' || !playlistText.trimStart().startsWith('#EXTM3U')) {
    setConnectionStatus('failedLoad');
    showToast('La Lista 3 no está disponible dentro del paquete.');
    return false;
  }
  const channels = parseM3U(playlistText);
  if (!channels.length) {
    setConnectionStatus('failedLoad');
    showToast('La Lista 3 no contiene canales válidos.');
    return false;
  }
  const cache = {
    channels,
    playlistName: 'Canales públicos · lista integrada',
    stats: null,
    refreshUrl: null
  };
  state.sourceCache.public = cache;
  const activated = activateSourceCache('public', cache, false);
  if (activated && showNotification) {
    showToast(`Lista 3 · Canales públicos: ${channels.length} canales`);
  }
  console.info('Lista 3 · Canales públicos', { channels: channels.length });
  return activated;
}

async function switchSource(source) {
  if (!['iptv-org', 'moncho', 'public'].includes(source)) return;
  if (state.activeSource === source && state.channels.length) return;
  const cached = state.sourceCache[source];
  if (cached?.channels?.length) {
    ++state.sourceLoadSequence; // Invalida una descarga anterior que aún esté pendiente.
    state.loadingSource = null;
    activateSourceCache(source, cached);
    return;
  }
  if (source === 'moncho') return loadMonchoCatalog();
  if (source === 'public') return loadPublicPlaylist();
  return loadDefaultPlaylist();
}

async function refreshActiveSource() {
  if (state.loadingSource) return;
  if (state.activeSource === 'moncho') return loadMonchoCatalog();
  if (state.activeSource === 'public') return loadPublicPlaylist(true);
  const cache = state.sourceCache['iptv-org'];
  if (!cache?.refreshUrl) {
    showToast('La Lista 1 es local. Volvé a importar el archivo para actualizarla.');
    return;
  }
  await loadDefaultPlaylist({ url: cache.refreshUrl, name: cache.playlistName || 'Lista 1' });
}

// La lista global contiene muchos canales: se muestran por bloques para no
// crear miles de elementos en el DOM durante la carga inicial.
$('#channelList').addEventListener('scroll', () => {
  const list = $('#channelList');
  const total = state.visibleChannelCount;
  if (list.scrollTop + list.clientHeight >= list.scrollHeight - 100 && state.renderLimit < total) {
    state.renderLimit = Math.min(state.renderLimit + CHANNEL_PAGE_SIZE, total);
    renderChannels();
  }
});

// Eventos de navegación y filtros.
document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    state.renderLimit = CHANNEL_PAGE_SIZE;
    state.category = 'all';
    state.country = 'all';
    state.filter = 'all';
    render();
    $('#sidebar').classList.remove('is-open');
  });
});

document.querySelectorAll('.filter-tab').forEach(button => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    state.renderLimit = CHANNEL_PAGE_SIZE;
    state.view = 'all';
    state.category = 'all';
    state.country = 'all';
    render();
  });
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value.trim();
  state.renderLimit = CHANNEL_PAGE_SIZE;
  $('#channelList').scrollTop = 0;
  renderChannels();
});

$('#countryFilter').addEventListener('change', event => {
  state.country = event.target.value;
  state.view = 'all';
  state.filter = 'all';
  state.renderLimit = CHANNEL_PAGE_SIZE;
  $('#channelList').scrollTop = 0;
  render();
});

$('#categoryFilter').addEventListener('change', event => {
  state.category = event.target.value;
  state.view = 'all';
  state.filter = 'all';
  state.renderLimit = CHANNEL_PAGE_SIZE;
  $('#channelList').scrollTop = 0;
  render();
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !playlistDialog.open && !alternateDialog.open) {
    event.preventDefault();
    $('#searchInput').focus();
  }
});

$('#favoriteCurrent').addEventListener('click', () => {
  const channel = currentChannel();
  if (channel) toggleFavorite(channel.id);
});

$('#openPlaylistButton').addEventListener('click', openPlaylistDialog);
$('#importAuthorizedListButton').addEventListener('click', () => {
  alternateDialog.close();
  openPlaylistDialog();
});
$('#stageAddButton').addEventListener('click', openPlaylistDialog);
$('#emptyAddButton').addEventListener('click', openPlaylistDialog);
$('#playlistFile').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (!text.trimStart().startsWith('#EXTM3U')) throw new Error('El archivo no comienza con #EXTM3U.');
    const channels = parseM3U(text);
    replacePlaylist(channels, file.name);
  } catch (error) {
    setDialogFeedback(error.message || 'No se pudo leer el archivo.', true);
  } finally { event.target.value = ''; }
});

$('#playlistUrlForm').addEventListener('submit', event => {
  event.preventDefault();
  importRemotePlaylist($('#playlistUrl').value.trim());
});

$('#directStreamForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#directStreamUrl').value.trim();
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t('invalidURL'));
    const name = url.pathname.split('/').filter(Boolean).pop() || 'Stream directo';
    const channel = { id: stableId(`direct|${value}`), name: decodeURIComponent(name), group: 'Stream directo', categories: ['Stream directo'], countryCodes: [], url: url.href, type: /\.m3u8(?:$|[?#])/i.test(url.href) ? 'hls' : 'video', logo: '' };
    state.channels = [channel, ...state.channels.filter(item => item.id !== channel.id)];
    {
      const activeSource = state.activeSource;
      const currentCache = state.sourceCache[activeSource];
      const defaultName = activeSource === 'moncho' ? 'MonchoApps · catálogo completo' : activeSource === 'public' ? 'Canales públicos · lista integrada' : 'Lista 1 · Stream agregado';
      state.sourceCache[activeSource] = { ...(currentCache || {}), channels: state.channels, playlistName: currentCache?.playlistName || defaultName, refreshUrl: currentCache?.refreshUrl || null };
    }
    state.view = 'all'; state.category = 'all'; state.country = 'all'; state.filter = 'all'; state.query = '';
    render();
    playlistDialog.close();
    playChannel(channel.id);
  } catch (_) { setDialogFeedback(t('invalidURL'), true); }
});

$('#drmConsent').addEventListener('change', validateDrmForm);
$('#drmLicenseUrl').addEventListener('input', validateDrmForm);
$('#drmSystemSelect').addEventListener('change', validateDrmForm);
$('#drmCancelButton').addEventListener('click', () => {
  state.pendingDrmChannelId = null;
  drmDialog.close();
  showPlayerError('Reproducción protegida cancelada.');
});
$('#drmConsentForm').addEventListener('submit', async event => {
  event.preventDefault();
  validateDrmForm();
  const channel = state.channels.find(item => item.id === state.pendingDrmChannelId);
  const licenseUrl = $('#drmLicenseUrl').value.trim();
  const keySystem = $('#drmSystemSelect').value;
  if (!channel || !channel.canUseOfficialLicense || !$('#drmConsent').checked || $('#drmStartButton').disabled) return;
  state.pendingDrmChannelId = null;
  drmDialog.close();
  await playProtectedWithOfficialLicense(channel, keySystem, licenseUrl);
});

$('#fullscreenButton').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch (_) { showToast(t('fullscreenError')); }
});

$('#clearSearchButton').addEventListener('click', () => {
  state.query = '';
  state.renderLimit = CHANNEL_PAGE_SIZE;
  $('#searchInput').value = '';
  $('#channelList').scrollTop = 0;
  renderChannels();
});

$('#sourceList1Button').addEventListener('click', () => switchSource('iptv-org'));
$('#sourceList2Button').addEventListener('click', () => switchSource('moncho'));
$('#sourceList3Button').addEventListener('click', () => switchSource('public'));
$('#refreshSourceButton').addEventListener('click', refreshActiveSource);

$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('is-open'));
$('#aboutButton').addEventListener('click', () => $('#aboutDialog').showModal());
$('#channelOptionsButton').addEventListener('click', openPlaylistDialog);

// Atajos: Escape cierra el menú móvil.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') $('#sidebar').classList.remove('is-open');
});

// Restaurar el idioma elegido en esta PC y aplicar las traducciones iniciales.
let initialLanguage = 'es';
try { initialLanguage = localStorage.getItem('botsebita-lab-tv-language') || 'es'; } catch (_) {}
if (window.botsebitaApplyLanguage) window.botsebitaApplyLanguage(initialLanguage);
setConnectionStatus(state.connectionStatusKey);
$('#languageSelect')?.addEventListener('change', event => {
  if (window.botsebitaApplyLanguage) window.botsebitaApplyLanguage(event.target.value);
  setConnectionStatus(state.connectionStatusKey);
  render();
  if (currentChannel()) renderCurrent();
});

// Se restaura la última lista utilizada. La fuente se vuelve a consultar al iniciar;
// las dos listas quedan en caché de memoria mientras la pestaña permanece abierta.
const preferredSource = readSetting('botsebita-lab-tv-active-source', 'iptv-org');
state.activeSource = ['moncho', 'public'].includes(preferredSource) ? preferredSource : 'iptv-org';
state.playlistName = state.activeSource === 'moncho' ? 'MonchoApps · catálogo completo' : state.activeSource === 'public' ? 'Canales públicos · lista integrada' : 'Cargando IPTV-org…';
render();
if (state.activeSource === 'moncho') loadMonchoCatalog();
else if (state.activeSource === 'public') loadPublicPlaylist();
else loadDefaultPlaylist();
