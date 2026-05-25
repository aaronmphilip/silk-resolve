/**
 * Silk Resolve · Embeddable Voice Widget
 *
 * Usage:
 *   <script src="https://your-domain.com/widget.js"
 *     data-agent-id="YOUR_AGENT_ID"
 *     data-position="bottom-right"
 *     data-greeting="Talk to support"
 *     data-color="#0a0a0a">
 *   </script>
 *
 * Or programmatic (data-auto-open="false"):
 *   SilkResolve.start('agent-id')  // open widget
 *   SilkResolve.stop()             // close widget
 */
(function () {
  'use strict';

  // Locate the script tag — currentScript is null for deferred loads
  var script = document.currentScript || (function () {
    var tags = document.querySelectorAll('script[data-agent-id]');
    return tags[tags.length - 1] || null;
  })();

  if (!script) return;

  var agentId = script.getAttribute('data-agent-id');
  if (!agentId) return;

  // Derive the Silk Resolve origin from the script src so the widget always
  // points at the right deployment even when embedded cross-domain.
  var src = script.src || '';
  var origin = src ? src.replace(/\/widget\.js(\?.*)?$/, '') : window.location.origin;

  var cfg = {
    position:  script.getAttribute('data-position')  || 'bottom-right',
    color:     script.getAttribute('data-color')      || '#0a0a0a',
    label:     script.getAttribute('data-label')      || script.getAttribute('data-greeting') || 'Talk to support',
    voice:     normalizeVoice(script.getAttribute('data-voice') || script.getAttribute('data-voice-mode')),
    autoOpen:  script.getAttribute('data-auto-open')  === 'true',
  };

  function normalizeVoice(value) {
    return value === 'vapi' ? 'vapi' : 'silk';
  }

  function talkUrl(id) {
    return origin + '/talk/' + encodeURIComponent(id) + '?voice=' + encodeURIComponent(cfg.voice);
  }

  // Global API — populated once the DOM is ready
  window.SilkResolve = window.SilkResolve || {};

  // ── Position helpers ────────────────────────────────────────────────────────
  var POSITIONS = {
    'bottom-right': 'bottom:24px;right:24px;',
    'bottom-left':  'bottom:24px;left:24px;',
    'top-right':    'top:24px;right:24px;',
    'top-left':     'top:24px;left:24px;',
  };

  // ── Phone icon SVG ──────────────────────────────────────────────────────────
  var PHONE_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11 19.79 19.79 0 0 1 1.61 2.41 2 2 0 0 1 3.6.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';

  function mount() {
    if (document.getElementById('silk-resolve-btn')) return; // already mounted

    // ── Floating trigger button ───────────────────────────────────────────────
    var btn = document.createElement('button');
    btn.id = 'silk-resolve-btn';
    btn.setAttribute('aria-label', cfg.label);
    btn.style.cssText = [
      'position:fixed;',
      POSITIONS[cfg.position] || POSITIONS['bottom-right'],
      'z-index:2147483647;',
      'display:inline-flex;align-items:center;gap:9px;',
      'padding:13px 20px;',
      'background:' + cfg.color + ';',
      'color:#f0ebe0;',
      'border:none;cursor:pointer;',
      'font-family:system-ui,-apple-system,sans-serif;',
      'font-size:13px;font-weight:600;letter-spacing:0.01em;',
      'box-shadow:0 4px 28px rgba(0,0,0,0.22);',
      'transition:opacity 0.15s ease,transform 0.15s ease;',
      'user-select:none;',
    ].join('');

    btn.innerHTML = PHONE_SVG + '<span style="white-space:nowrap">' + _esc(cfg.label) + '</span>';
    btn.onmouseenter = function () { btn.style.opacity = '0.85'; };
    btn.onmouseleave = function () { btn.style.opacity = '1'; };

    // ── Backdrop overlay ──────────────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.id = 'silk-resolve-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', cfg.label);
    overlay.style.cssText = [
      'position:fixed;inset:0;',
      'z-index:2147483646;',
      'background:rgba(0,0,0,0.55);',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'display:none;align-items:center;justify-content:center;',
      'padding:16px;box-sizing:border-box;',
    ].join('');

    // ── Widget panel ──────────────────────────────────────────────────────────
    var panel = document.createElement('div');
    panel.style.cssText = [
      'position:relative;',
      'width:min(420px,100%);',
      'height:min(680px,calc(100vh - 32px));',
      'background:#0a0a0a;',
      'overflow:hidden;',
      'box-shadow:0 32px 96px rgba(0,0,0,0.55);',
      'display:flex;flex-direction:column;',
    ].join('');

    // ── Close (×) button ─────────────────────────────────────────────────────
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = [
      'position:absolute;top:10px;right:10px;z-index:1;',
      'width:30px;height:30px;',
      'display:flex;align-items:center;justify-content:center;',
      'background:rgba(240,235,224,0.1);',
      'border:1px solid rgba(240,235,224,0.15);',
      'cursor:pointer;color:rgba(240,235,224,0.7);',
      'font-size:18px;line-height:1;font-family:sans-serif;',
      'transition:background 0.1s;',
    ].join('');
    closeBtn.innerHTML = '&#215;';
    closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(240,235,224,0.18)'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(240,235,224,0.1)'; };

    // ── Iframe (the full PublicTalkClient lives here) ─────────────────────────
    var iframe = document.createElement('iframe');
    iframe.src = talkUrl(agentId);
    iframe.style.cssText = 'flex:1;width:100%;border:none;display:block;';
    iframe.allow = 'microphone; autoplay; clipboard-write';
    iframe.setAttribute('allowfullscreen', '');
    // Needed in some browsers so mic permission flows through the iframe
    iframe.setAttribute('allow', 'microphone; autoplay; clipboard-write');

    panel.appendChild(closeBtn);
    panel.appendChild(iframe);
    overlay.appendChild(panel);

    // ── State ─────────────────────────────────────────────────────────────────
    var isOpen = false;

    function open() {
      isOpen = true;
      overlay.style.display = 'flex';
      btn.style.display = 'none';
      panel.focus && panel.focus();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.style.display = 'none';
      btn.style.display = 'inline-flex';
      // Reset iframe so next open starts fresh (no lingering call state)
      iframe.src = iframe.src;
    }

    // ── Event wiring ──────────────────────────────────────────────────────────
    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    // Click outside the panel closes
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    // ── Mount to DOM ──────────────────────────────────────────────────────────
    document.body.appendChild(overlay);
    document.body.appendChild(btn);

    // ── Public API ────────────────────────────────────────────────────────────
    window.SilkResolve.start = function (id) {
      if (id && id !== agentId) {
        // Different agent — update iframe src before opening
        iframe.src = talkUrl(id);
      }
      open();
    };
    window.SilkResolve.stop = close;

    if (cfg.autoOpen) open();
  }

  // ── Tiny HTML escape helper ───────────────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Mount when DOM is available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
