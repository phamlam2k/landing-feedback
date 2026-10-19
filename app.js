(() => {
  'use strict';

  const CFG = window.TRAM_SAC_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MOODS = [
    { max: 20, emoji: '🪫', label: 'Cạn pin', msg: 'Ôi, cậu vất vả rồi. Vào trạm nghỉ một chút nhé!', color: '#F4A68F' },
    { max: 40, emoji: '😟', label: 'Pin yếu', msg: 'Không sao đâu, Trạm ở đây để sạc cùng cậu.', color: '#F6BB82' },
    { max: 60, emoji: '😐', label: 'Tạm ổn', msg: 'Bình thường cũng là một kiểu ổn đó!', color: '#F6D68F' },
    { max: 80, emoji: '🙂', label: 'Khá ổn', msg: 'Tuyệt! Giữ năng lượng tích cực này nha.', color: '#BFE3A8' },
    { max: 100, emoji: '😄', label: 'Đầy năng lượng', msg: 'Wow, pin căng đét! Chia bớt năng lượng cho mọi người nhé!', color: '#9ED6BE' },
  ];
  const moodOf = v => MOODS.find(m => v <= m.max) || MOODS[MOODS.length - 1];

  const form = $('#form');
  const steps = $$('.step', form);
  const TOTAL = 3; // Bước 1..3 (không tính check-in và trang cảm ơn)
  let current = 0;
  let busy = false;
  let department = '';

  /* ---------------- Reveal khi cuộn ---------------- */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 })
    : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  // Lưới an toàn: form không bao giờ bị ẩn nếu observer không kích hoạt
  setTimeout(() => $$('.reveal').forEach(el => el.classList.add('in')), 2500);

  /* ---------------- Hiệu ứng ripple cho nút ---------------- */
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.btn');
    if (!btn || reduceMotion) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  });

  /* ---------------- Trang 1: pin cảm xúc ---------------- */
  const slider = $('#battery');
  const batFill = $('#batFill');
  const batMouth = $('#batMouth');
  const batSvg = $('#batterySvg');
  const pctEl = $('#batPct');
  const moodLabel = $('#moodLabel');
  const moodMsg = $('#moodMsg');
  let lastMood = null;

  function renderBattery(v) {
    const m = moodOf(v);
    const w = Math.max(6, 176 * v / 100);
    batFill.setAttribute('width', w);
    batFill.setAttribute('fill', m.color);
    // miệng: cong xuống khi buồn, cong lên khi vui
    const curve = -10 + (v / 100) * 22;
    batMouth.setAttribute('d', `M92 ${84 - curve / 3} Q108 ${84 + curve} 124 ${84 - curve / 3}`);
    batSvg.classList.toggle('low', v <= 20);
    slider.style.setProperty('--p', v + '%');
    slider.setAttribute('aria-valuetext', `${v}% - ${m.label}`);
    pctEl.textContent = v + '%';
    moodLabel.textContent = `${m.emoji} ${m.label}`;
    $$('.mood-pick').forEach(b => b.classList.toggle('active', moodOf(+b.dataset.val) === m));
    if (lastMood !== m) {
      moodMsg.textContent = m.msg;
      restartAnim(moodMsg, 'swap');
      restartAnim(pctEl, 'bump');
      if (navigator.vibrate && lastMood) navigator.vibrate(8);
      lastMood = m;
    }
  }
  function restartAnim(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  slider.addEventListener('input', () => renderBattery(+slider.value));
  $$('.mood-pick').forEach(b => b.addEventListener('click', () => animateSliderTo(+b.dataset.val)));

  function animateSliderTo(target) {
    const start = +slider.value;
    if (reduceMotion) { slider.value = target; renderBattery(target); return; }
    const t0 = performance.now(), dur = 420;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round((start + (target - start) * e) / 5) * 5;
      slider.value = v; renderBattery(v);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  renderBattery(+slider.value);

  /* ---------------- Trang 2: bài thở ---------------- */
  const breatheBtn = $('#breatheBtn');
  const breatheText = $('#breatheText');
  let breathing = false;
  breatheBtn.addEventListener('click', async () => {
    if (breathing) return;
    breathing = true;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 2; i++) {
      breatheBtn.className = 'breathe inhale'; breatheText.textContent = 'Hít vào… 4'; await wait(4000);
      breatheBtn.className = 'breathe exhale'; breatheText.textContent = 'Thở ra… 4'; await wait(4000);
    }
    breatheBtn.className = 'breathe'; breatheText.textContent = 'Nhẹ lòng hơn chưa? 💜';
    breathing = false;
  });

  /* ---------------- Trang 3: bộ phận ---------------- */
  const deptWrap = $('#deptPicks');
  (CFG.DEPARTMENTS || ['Ban Tổng Giám đốc', 'Phòng HCNS', 'Phòng ban chuyên môn', 'Tất cả']).forEach(name => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dept'; b.textContent = name;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.addEventListener('click', () => {
      department = department === name ? '' : name;
      $$('.dept', deptWrap).forEach(d => d.setAttribute('aria-checked', String(d.textContent === department)));
      if (department) resolveError('dept', deptWrap);
    });
    deptWrap.appendChild(b);
  });

  /* ---------------- Bộ đếm ký tự ---------------- */
  $$('.counter').forEach(c => {
    const field = $('#' + c.dataset.for);
    c.update = () => {
      const n = field.value.length, max = +field.maxLength;
      const len = field.value.trim().length, min = +field.dataset.min || 0;
      const need = min && len < min;
      c.textContent = need ? (len ? `Thêm ${min - len} ký tự nữa ✍️` : `Tối thiểu ${min} ký tự`) : `${n}/${max}`;
      c.classList.toggle('need', !!need);
      c.classList.toggle('warn', !need && n > max * .9);
    };
    field.addEventListener('input', c.update); c.update();
  });

  /* ---------------- Validate dễ thương ---------------- */
  const CUTE = {
    idea: {
      empty: ['Ý tưởng nhỏ xíu cũng là ý tưởng đó, viết thử đi nè 💡', 'Bóng đèn đang chờ cậu bật sáng nè ✨', 'Thêm trà bánh cũng tính là góp ý nha 🍪'],
      short: k => `Gần sáng đèn rồi, thêm ${k} ký tự nữa nha 💡`,
    },
    senderName: {
      empty: ['Cậu là ai thế? Nhập tên giúp Trạm, hoặc chọn ẩn danh cũng được nha 🙈'],
      short: () => 'Tên ngắn xíu vậy, ghi rõ hơn chút nha 🙋',
    },
  };
  const OK = ['Tuyệt vời! ✨', 'Đỉnh chóp! 🙌', 'Trạm nghe rõ rồi nha 💚', 'Pin +10% 🔋'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const msgOf = key => $(`.v-msg[data-for="${key}"]`);

  function showError(key, text, el) {
    const m = msgOf(key);
    clearTimeout(m._t);
    m.classList.remove('ok');
    m.textContent = text;
    m.hidden = false;
    restartAnim(m, 'pop-in');
    el.classList.add('invalid');
    restartAnim(el, 'wiggle');
  }
  // Khi người dùng sửa đúng: khen một câu rồi ẩn bong bóng
  function resolveError(key, el) {
    const m = msgOf(key);
    el.classList.remove('invalid');
    if (m.hidden || m.classList.contains('ok')) return;
    m.textContent = pick(OK);
    m.classList.add('ok');
    restartAnim(m, 'pop-in');
    m._t = setTimeout(() => { m.hidden = true; m.classList.remove('ok'); }, 1400);
  }
  function hideAllErrors() {
    $$('.v-msg').forEach(m => { clearTimeout(m._t); m.hidden = true; m.classList.remove('ok'); });
    $$('.invalid').forEach(el => el.classList.remove('invalid'));
  }

  $$('[data-min]').forEach(f => f.addEventListener('input', () => {
    if (f.value.trim().length >= +f.dataset.min) resolveError(f.id, f);
  }));

  function validateStep(n) {
    const step = steps[n];
    const errs = [];
    const check = (f, min) => {
      const len = f.value.trim().length;
      if (len < min) errs.push([f.id, len ? CUTE[f.id].short(min - len) : pick(CUTE[f.id].empty), f]);
    };
    $$('[data-min]', step).forEach(f => check(f, +f.dataset.min));
    if (n === 3 && form.mode.value === 'named') check(nameInput, 2);
    if (!errs.length) return true;

    errs.forEach(([key, text, el]) => showError(key, text, el));
    restartAnim($('.step-icon', step), 'nudge');
    if (navigator.vibrate) navigator.vibrate([15, 40, 15]);
    const first = errs[0][2];
    first.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    (first.matches('input, textarea') ? first : $('.dept', first)).focus({ preventScroll: true });
    return false;
  }

  /* ---------------- Danh tính ---------------- */
  const nameBox = $('#nameBox');
  const nameInput = $('#senderName');
  $$('input[name=mode]').forEach(r => r.addEventListener('change', () => {
    const named = form.mode.value === 'named';
    nameBox.hidden = !named;
    if (!named) { msgOf('senderName').hidden = true; nameInput.classList.remove('invalid'); }
    if (named) setTimeout(() => nameInput.focus(), 50);
  }));
  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim().length >= 2) resolveError('senderName', nameInput);
  });

  /* ---------------- Điều hướng bước ---------------- */
  const progress = $('#progress');
  const progressFill = $('#progressFill');
  const progressLabel = $('#progressLabel');
  const progressPct = $('#progressPct');
  const progressBar = $('#progressBar');

  function renderProgress(n) {
    progress.classList.toggle('hide', n > TOTAL);
    const pct = Math.round(Math.min(n, TOTAL) / TOTAL * 100);
    progressFill.style.width = Math.max(4, pct) + '%';
    progressPct.textContent = pct + '%';
    progressLabel.textContent = n === 0 ? 'Khởi động · Check-in' : `Bước ${n}/${TOTAL}`;
    progressBar.setAttribute('aria-valuenow', Math.min(n, TOTAL));
    $$('.progress-steps li').forEach(li => {
      const p = +li.dataset.p;
      li.classList.toggle('done', p < n);
      li.classList.toggle('current', p === n);
    });
  }

  function go(n) {
    if (busy || n === current || n < 0 || n >= steps.length) return;
    const dir = n > current ? 'next' : 'prev';
    const from = steps[current], to = steps[n];
    busy = true;
    const swap = () => {
      from.className = 'step' + (from.classList.contains('step-thanks') ? ' step-thanks' : '');
      to.classList.add('is-active', 'enter-' + dir);
      to.addEventListener('animationend', function done(ev) {
        if (ev.target !== to) return;
        to.classList.remove('enter-' + dir);
        to.removeEventListener('animationend', done);
      });
      current = n;
      renderProgress(n);
      busy = false;
      const card = $('.card');
      const top = card.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * .4) card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      const focusable = to.querySelector('textarea, input[type=text]');
      if (focusable && window.matchMedia('(min-width: 860px)').matches) setTimeout(() => focusable.focus({ preventScroll: true }), 400);
    };
    if (reduceMotion) return swap();
    from.classList.remove('is-active');
    from.classList.add('leave-' + dir);
    setTimeout(swap, 200);
  }

  const next = () => { if (!busy && validateStep(current)) go(current + 1); };
  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-back]')) go(current - 1);
  });
  // Ctrl/Cmd + Enter để sang bước tiếp
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && current > 0 && current < TOTAL) { e.preventDefault(); next(); }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') e.preventDefault();
  });

  /* ---------------- Gửi dữ liệu ---------------- */
  const submitBtn = $('#submitBtn');
  const submitError = $('#submitError');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitBtn.classList.contains('loading')) return;
    submitError.hidden = true;

    if (!validateStep(3)) return;
    const named = form.mode.value === 'named';
    const senderName = nameInput.value.trim();

    const battery = +slider.value;
    const payload = {
      battery,
      mood: moodOf(battery).label,
      vent: $('#vent').value.trim(),
      department,
      idea: $('#idea').value.trim(),
      thanksTo: $('#thanksTo').value.trim(),
      thanksMsg: $('#thanksMsg').value.trim(),
      mode: named ? 'named' : 'anonymous',
      senderName: named ? senderName : '',
      website: form.website.value, // honeypot
    };

    submitBtn.classList.add('loading');
    try {
      const res = await send(payload);
      $('#receipt').textContent = res && res.id ? `Mã phản hồi: #${res.id}` : '';
      go(4);
      setTimeout(() => confetti(), 250);
    } catch (err) {
      console.error('[Trạm Sạc] Gửi thất bại:', err);
      submitError.textContent = 'Ối, Trạm đang mất sóng một chút 🥲 Cậu kiểm tra mạng rồi bấm gửi lại giúp Trạm nhé!';
      submitError.hidden = false;
      restartAnim(submitError, 'shake');
    } finally {
      submitBtn.classList.remove('loading');
    }
  });

  async function send(payload) {
    const url = (CFG.SHEET_ENDPOINT || '').trim();
    if (!url) {
      console.warn('[Trạm Sạc] Chưa cấu hình SHEET_ENDPOINT trong config.js. Đang chạy chế độ DEMO, dữ liệu:', payload);
      toast('Chế độ demo: chưa kết nối Google Sheet');
      await new Promise(r => setTimeout(r, 900));
      return { ok: true, id: 'DEMO' };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      // text/plain để tránh CORS preflight với Google Apps Script
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Server trả về lỗi');
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- Gửi thêm ---------------- */
  $('#againBtn').addEventListener('click', () => {
    form.reset();
    department = '';
    $$('.dept').forEach(d => d.setAttribute('aria-checked', 'false'));
    nameBox.hidden = true; submitError.hidden = true;
    hideAllErrors();
    $$('.counter').forEach(c => c.update());
    lastMood = null;
    renderBattery(+slider.value);
    go(0);
  });

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------------- Pháo giấy ---------------- */
  function confetti() {
    if (reduceMotion) return;
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width = innerWidth * dpr;
    const H = canvas.height = innerHeight * dpr;
    const colors = ['#E07A5F', '#F6D68F', '#9ED6BE', '#CDBEF0', '#F4A6A0', '#F0A35E'];
    const shapes = ['rect', 'circle', 'heart'];
    const parts = Array.from({ length: 170 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? W * .1 : W * .9, y: H * .75,
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * dpr,
        vy: -(10 + Math.random() * 12) * dpr,
        s: (6 + Math.random() * 7) * dpr,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
        c: colors[i % colors.length], shape: shapes[i % 3], life: 0,
      };
    });
    const t0 = performance.now();
    (function frame(now) {
      ctx.clearRect(0, 0, W, H);
      const elapsed = now - t0;
      parts.forEach(p => {
        p.vy += .32 * dpr; p.vx *= .985; p.vy *= .985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3800);
        ctx.fillStyle = p.c;
        if (p.shape === 'rect') ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, 7); ctx.fill(); }
        else { const s = p.s / 2; ctx.beginPath(); ctx.moveTo(0, s * .6); ctx.bezierCurveTo(-s * 1.4, -s * .4, -s * .5, -s * 1.4, 0, -s * .5); ctx.bezierCurveTo(s * .5, -s * 1.4, s * 1.4, -s * .4, 0, s * .6); ctx.fill(); }
        ctx.restore();
      });
      if (elapsed < 3800) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  renderProgress(0);
})();
