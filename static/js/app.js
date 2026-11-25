(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast + clipboard ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
  }

  /* ---------- AI processing overlay ---------- */
  const proc = $('#processing');
  let procTimer = null;
  const FLOWS = {
    resume: {
      title: 'Preparing your interview',
      msgs: ['Reading your resume…', 'Identifying your skills and projects…', 'Generating personalized questions…']
    },
    evaluate: {
      title: 'Evaluating your answer',
      msgs: ['Analyzing your response…', 'Evaluating technical accuracy…', 'Reviewing answer structure…',
             'Identifying strengths…', 'Finding improvement opportunities…', 'Preparing your personalized feedback…']
    }
  };
  function showProcessing(kind) {
    const f = FLOWS[kind]; if (!proc || !f) return;
    const msg = $('#procMsg'); let i = 0;
    $('#procTitle').textContent = f.title;
    msg.textContent = f.msgs[0];
    proc.hidden = false;
    requestAnimationFrame(() => proc.classList.add('show'));
    clearInterval(procTimer);
    procTimer = setInterval(() => {
      if (i >= f.msgs.length - 1) return;
      i++; msg.classList.add('swap');
      setTimeout(() => { msg.textContent = f.msgs[i]; msg.classList.remove('swap'); }, 200);
    }, 2800);
  }
  function hideProcessing() {
    clearInterval(procTimer);
    if (!proc) return;
    proc.classList.remove('show'); proc.hidden = true;
  }

  /* ---------- Nav, reveal, count-up ---------- */
  function initNav() {
    const nav = $('#nav'), btn = $('#navToggle');
    if (!nav || !btn) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }
  function initReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  }
  function initCount() {
    $$('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      if (reduce || isNaN(target)) return;
      const start = performance.now(), dur = 1300;
      (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  }

  /* ---------- Dialog + copy helpers ---------- */
  function initDialogs() {
    document.addEventListener('click', async e => {
      const o = e.target.closest('[data-open]');
      if (o) { const d = document.getElementById(o.dataset.open); if (d) d.showModal(); return; }
      const c = e.target.closest('[data-close]');
      if (c) { const d = c.closest('dialog'); if (d) d.close(); return; }
      const cp = e.target.closest('[data-copy-target]');
      if (cp) {
        const el = $(cp.dataset.copyTarget);
        if (el) { await copyText(el.innerText.trim()); toast('Copied to clipboard'); }
      }
    });
    $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  }

  /* ---------- Resume upload ---------- */
  function initUpload() {
    const form = $('#uploadForm'); if (!form) return;
    const input = $('#resume'), zone = $('#dropzone'), chip = $('#fileChip'),
          nameEl = $('#fileName'), sizeEl = $('#fileSize'), err = $('#fileError'),
          btn = $('#uploadBtn'), rm = $('#fileRemove');
    btn.disabled = true;

    const fmt = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
    const isPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    const setError = m => { err.textContent = m; err.hidden = !m; };

    function reset() {
      input.value = ''; chip.hidden = true; zone.hidden = false; btn.disabled = true; setError('');
    }
    function accept(file) {
      if (!file) return reset();
      if (!isPdf(file)) {
        input.value = ''; chip.hidden = true; zone.hidden = false; btn.disabled = true;
        return setError('Only PDF resumes are supported. Please choose a .pdf file.');
      }
      if (file.size === 0) {
        input.value = ''; btn.disabled = true;
        return setError('That file is empty. Please choose another resume.');
      }
      setError('');
      nameEl.textContent = file.name; sizeEl.textContent = fmt(file.size);
      chip.hidden = false; zone.hidden = true; btn.disabled = false;
    }

    input.addEventListener('change', () => accept(input.files[0]));
    rm.addEventListener('click', reset);

    ['dragenter', 'dragover'].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(t => zone.addEventListener(t, () => zone.classList.remove('is-over')));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (!f) return;
      try { input.files = e.dataTransfer.files; } catch { /* older browsers */ }
      accept(f);
    });
    // stop the browser from opening a PDF dropped outside the zone
    ['dragover', 'drop'].forEach(t => window.addEventListener(t, e => e.preventDefault()));

    form.addEventListener('submit', e => {
      if (form.dataset.busy === '1') { e.preventDefault(); return; }
      if (!input.files.length) { e.preventDefault(); setError('Please choose a PDF resume first.'); return; }
      form.dataset.busy = '1';
      btn.classList.add('is-loading'); btn.disabled = true;
      showProcessing('resume');
    });
    form._reset = () => {
      form.dataset.busy = '0'; btn.classList.remove('is-loading'); btn.disabled = !input.files.length;
    };
  }

  /* ---------- Answer editor ---------- */
  function initAnswer() {
    const form = $('#answerForm'); if (!form) return;
    const ta = $('#answer'), btn = $('#submitBtn'), wc = $('#wordCount'), cc = $('#charCount'), err = $('#answerError');
    const isFinal = form.dataset.final === 'true';

    function update() {
      const v = ta.value, t = v.trim(), words = t ? t.split(/\s+/).length : 0;
      wc.textContent = words + (words === 1 ? ' word' : ' words');
      cc.textContent = v.length + (v.length === 1 ? ' character' : ' characters');
      btn.disabled = !t || form.dataset.busy === '1';
      if (t) err.hidden = true;
    }
    ta.addEventListener('input', update);
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault(); if (!btn.disabled) form.requestSubmit(btn);
      }
    });
    form.addEventListener('submit', e => {
      if (form.dataset.busy === '1') { e.preventDefault(); return; }
      if (!ta.value.trim()) {
        e.preventDefault(); err.textContent = 'Please write an answer before submitting.'; err.hidden = false; return;
      }
      form.dataset.busy = '1';
      btn.classList.add('is-loading'); btn.disabled = true; ta.readOnly = true;
      if (isFinal) showProcessing('evaluate');
    });
    form._reset = () => {
      form.dataset.busy = '0'; btn.classList.remove('is-loading'); ta.readOnly = false; update();
    };
    update();
    ta.focus({ preventScroll: true });
  }

  /* ---------- History ---------- */
  function initHistory() {
    const list = $('#historyList'); if (!list) return;
    const rows = $$('.h-row', list);
    const search = $('#hSearch'), sort = $('#hSort'), filter = $('#hFilter');
    const empty = $('#hEmpty'), info = $('#pageInfo'), count = $('#resultCount');
    const prev = $('#prevPage'), next = $('#nextPage'), pager = $('#pager');
    const detail = $('#detailDialog');
    const PER = 8; let page = 1;

    function apply(resetPage) {
      if (resetPage) page = 1;
      const q = search.value.trim().toLowerCase(), band = filter.value;
      let out = rows.filter(r => (!q || r.dataset.search.includes(q)) && (band === 'all' || r.dataset.band === band));

      const id = r => +r.dataset.id, sc = r => +r.dataset.score;
      const by = {
        newest: (a, b) => id(b) - id(a),
        oldest: (a, b) => id(a) - id(b),
        high: (a, b) => sc(b) - sc(a) || id(b) - id(a),
        low: (a, b) => (sc(a) < 0 ? 99 : sc(a)) - (sc(b) < 0 ? 99 : sc(b)) || id(b) - id(a)
      };
      out.sort(by[sort.value]);

      const pages = Math.max(1, Math.ceil(out.length / PER));
      page = Math.min(page, pages);
      rows.forEach(r => (r.hidden = true));
      out.forEach(r => list.append(r));
      out.slice((page - 1) * PER, page * PER).forEach(r => (r.hidden = false));

      empty.hidden = out.length > 0;
      pager.hidden = out.length === 0;
      count.textContent = `Showing ${out.length} of ${rows.length}`;
      info.textContent = `Page ${page} of ${pages}`;
      prev.disabled = page <= 1; next.disabled = page >= pages;
    }
    search.addEventListener('input', () => apply(true));
    sort.addEventListener('change', () => apply(true));
    filter.addEventListener('change', () => apply(true));
    prev.addEventListener('click', () => { page--; apply(); });
    next.addEventListener('click', () => { page++; apply(); });

    rows.forEach(r => {
      $('[data-view]', r).addEventListener('click', () => {
        $('#dId').textContent = 'Interview #' + r.dataset.id;
        $('#dDate').textContent = r.dataset.date;
        const sp = $('#dScore');
        sp.textContent = r.dataset.scoretext || 'N/A';
        sp.className = 'score-pill ' + r.dataset.band;
        $('#dAnswer').textContent = r.dataset.answer;
        $('#dEval').innerHTML = $('template.h-eval', r).innerHTML; // sanitized on the server
        detail.showModal();
      });
    });
    apply(true);
  }

  /* ---------- Boot ---------- */
  initNav(); initReveal(); initCount(); initDialogs();
  initUpload(); initAnswer(); initHistory();

  // Back/forward cache: undo any "loading" state
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    hideProcessing();
    $$('form').forEach(f => f._reset && f._reset());
  });
})();