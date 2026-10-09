(() => {
  const STORAGE_KEY = 'clipboard-clips-v1';
  const EXPIRY_MS = 60 * 60 * 1000;
  const HOLD_MS = 550;
  const grid = document.querySelector('#clip-grid');
  const form = document.querySelector('#clip-form');
  const input = document.querySelector('#clip-input');
  const count = document.querySelector('#clip-count');
  const searchInput = document.querySelector('#search-input');
  const toast = document.querySelector('#toast');
  const filterButtons = [...document.querySelectorAll('.filter-tab')];
  let activeFilter = 'all';
  let clips = loadClips();
  let toastTimeout;

  function loadClips() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter(
        clip =>
          clip &&
          typeof clip.id === 'string' &&
          typeof clip.text === 'string' &&
          Number.isFinite(clip.createdAt) &&
          typeof clip.pinned === 'boolean',
      );
    } catch {
      return [];
    }
  }

  function saveClips() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
      return true;
    } catch {
      showToast('Could not save clips on this device.');
      return false;
    }
  }

  function expireClips() {
    const now = Date.now();
    const active = clips.filter(clip => clip.pinned || now - clip.createdAt < EXPIRY_MS);
    if (active.length !== clips.length) {
      clips = active;
      saveClips();
      render();
    }
  }

  function getVisibleClips() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    return clips
      .filter(clip => activeFilter !== 'pinned' || clip.pinned)
      .filter(clip => !query || clip.text.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  }

  function render() {
    count.textContent = String(clips.length);
    grid.replaceChildren();
    const visibleClips = getVisibleClips();

    if (visibleClips.length === 0) {
      const isSearching = searchInput.value.trim().length > 0;
      const isPinnedFilter = activeFilter === 'pinned';
      const title = isSearching ? 'No clips found' : isPinnedFilter ? 'Nothing pinned yet' : 'Your clipboard is clear';
      const description = isSearching
        ? 'Try a different search.'
        : isPinnedFilter
          ? 'Touch and hold any clip to keep it around.'
          : 'Add a clip above and it’ll show up here.';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<span class="empty-icon" aria-hidden="true">✳</span>';
      const heading = document.createElement('strong');
      heading.textContent = title;
      const message = document.createElement('p');
      message.textContent = description;
      empty.append(heading, message);
      grid.append(empty);
      return;
    }

    visibleClips.forEach(clip => grid.append(createClipCard(clip)));
    updateTimers();
  }

  function createClipCard(clip) {
    const card = document.createElement('article');
    card.className = `clip-card${clip.pinned ? ' is-pinned' : ''}`;
    card.dataset.id = clip.id;

    const topline = document.createElement('div');
    topline.className = 'clip-topline';
    const type = document.createElement('span');
    type.className = 'clip-type';
    const dot = document.createElement('span');
    dot.className = `clip-type-dot${getClipType(clip.text).className}`;
    type.append(dot, document.createTextNode(getClipType(clip.text).label));

    const actions = document.createElement('div');
    actions.className = 'clip-actions';
    const pinButton = createIconButton(
      'pin-button',
      clip.pinned ? 'Unpin clip' : 'Pin clip',
      '<path d="m6 2.5 4 0 0 2.2 1.7 1.8v1H4.3v-1L6 4.7V2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="m8 7.5 0 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    );
    if (clip.pinned) pinButton.classList.add('is-pinned');
    pinButton.addEventListener('click', () => togglePin(clip.id));
    const copyButton = createIconButton(
      'copy-button',
      'Copy clip',
      '<rect x="6" y="6" width="8" height="10" rx="1.3" stroke="currentColor" stroke-width="1.3"/><path d="M9 4h5a2 2 0 0 1 2 2v7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    );
    copyButton.addEventListener('click', () => copyClip(clip.text));
    actions.append(pinButton, copyButton);
    topline.append(type, actions);

    const content = document.createElement('p');
    content.className = 'clip-text';
    content.textContent = clip.text;

    const hint = document.createElement('span');
    hint.className = 'hold-hint';
    hint.textContent = clip.pinned ? 'Hold to unpin' : 'Hold to pin';

    const bottom = document.createElement('div');
    bottom.className = 'clip-bottomline';
    const meta = document.createElement('span');
    meta.className = 'clip-meta';
    const age = formatAge(Date.now() - clip.createdAt);
    meta.textContent = age === 'just now' ? 'Added just now' : `Added ${age} ago`;
    const expiry = document.createElement('span');
    expiry.className = `clip-expiry${clip.pinned ? ' is-pinned' : ''}`;
    expiry.dataset.createdAt = String(clip.createdAt);
    expiry.dataset.pinned = String(clip.pinned);
    bottom.append(meta, expiry);

    card.append(topline, content, hint, bottom);
    addHoldToPin(card, clip.id);
    return card;
  }

  function getClipType(text) {
    if (/^https?:\/\/\S+$/i.test(text.trim())) return { label: 'Link', className: ' is-link' };
    if (/^(?:{|\[|function\b|const\b|let\b|import\b|<[\w/])/i.test(text.trim())) {
      return { label: 'Code', className: ' is-code' };
    }
    return { label: 'Text', className: ' is-text' };
  }

  function createIconButton(className, label, iconMarkup) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-button ${className}`;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">${iconMarkup}</svg>`;
    return button;
  }

  function addHoldToPin(card, id) {
    let holdTimeout;
    const cancelHold = () => {
      clearTimeout(holdTimeout);
      card.classList.remove('is-holding');
    };

    card.addEventListener('pointerdown', event => {
      if (event.target.closest('button') || event.button > 0) return;
      cancelHold();
      card.classList.add('is-holding');
      holdTimeout = setTimeout(() => {
        card.classList.remove('is-holding');
        togglePin(id);
        showToast(clips.find(clip => clip.id === id)?.pinned ? 'Clip pinned. It won’t expire.' : 'Clip unpinned.');
      }, HOLD_MS);
    });
    card.addEventListener('pointerup', cancelHold);
    card.addEventListener('pointerleave', cancelHold);
    card.addEventListener('pointercancel', cancelHold);
    card.addEventListener('contextmenu', event => event.preventDefault());
  }

  function togglePin(id) {
    const clip = clips.find(item => item.id === id);
    if (!clip) return;
    clip.pinned = !clip.pinned;
    saveClips();
    render();
    showToast(clip.pinned ? 'Clip pinned. It won’t expire.' : 'Clip unpinned.');
  }

  async function copyClip(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard.');
    } catch {
      showToast('Clipboard access isn’t available here.');
    }
  }

  function formatAge(milliseconds) {
    const minutes = Math.floor(Math.max(0, milliseconds) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }

  function updateTimers() {
    const now = Date.now();
    document.querySelectorAll('.clip-expiry').forEach(element => {
      if (element.dataset.pinned === 'true') {
        element.classList.add('is-pinned');
        element.textContent = 'Pinned';
        return;
      }
      const remaining = EXPIRY_MS - (now - Number(element.dataset.createdAt));
      const minutes = Math.max(0, Math.ceil(remaining / 60000));
      const seconds = Math.max(0, Math.ceil(remaining / 1000));
      const label = minutes <= 1 ? `${seconds}s left` : `${minutes}m left`;
      element.classList.toggle('is-soon', remaining < 10 * 60 * 1000);
      element.textContent = `↻ ${label}`;
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.focus();
      showToast('Add a little something first.');
      return;
    }
    clips.unshift({
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      text,
      createdAt: Date.now(),
      pinned: false,
    });
    saveClips();
    input.value = '';
    activeFilter = 'all';
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === activeFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    render();
    showToast('Clip saved. It’ll be here for an hour.');
  });

  document.querySelector('#paste-button').addEventListener('click', async () => {
    try {
      input.value = await navigator.clipboard.readText();
      input.focus();
      showToast(input.value ? 'Ready to save.' : 'Your clipboard is empty.');
    } catch {
      input.focus();
      showToast('Allow clipboard access, or paste into the box.');
    }
  });

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach(tab => {
        const selected = tab === button;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-pressed', String(selected));
      });
      render();
    });
  });

  searchInput.addEventListener('input', render);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
      render();
    }
  });

  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      clips = loadClips();
      expireClips();
      render();
    }
  });

  expireClips();
  render();
  setInterval(() => {
    expireClips();
    updateTimers();
  }, 1000);
})();
