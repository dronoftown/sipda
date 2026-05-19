(() => {
  const btn = document.getElementById('periodFilter');
  const popover = document.getElementById('periodPopover');
  const label = document.getElementById('periodFilterLabel');
  const monthLabel = document.getElementById('periodMonthLabel');
  const daysGrid = document.getElementById('periodDays');
  const closeBtn = document.getElementById('periodClose');
  const cancelBtn = document.getElementById('periodCancel');
  const applyBtn = document.getElementById('periodApply');
  const prevBtn = document.getElementById('periodPrev');
  const nextBtn = document.getElementById('periodNext');
  const chips = Array.from(document.querySelectorAll('[data-period-preset]'));
  if (!btn || !popover || !daysGrid || !monthLabel) return;

  const fmtMonth = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('ca-ES', { day: '2-digit', month: '2-digit' });
  let view = new Date();
  view.setDate(1);
  let selected = new Date();

  const sameDay = (a,b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const formatRangeLabel = (preset, date = selected) => {
    if (preset === 'today') return 'Avui';
    if (preset === '7d') return '7 dies';
    if (preset === '30d') return '30 dies';
    return fmtShort.format(date);
  };

  function positionPopover(){
    const r = btn.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, r.right - width));
    popover.style.left = left + 'px';
    popover.style.right = 'auto';
    popover.style.top = (r.bottom + 10) + 'px';
  }

  function renderCalendar(){
    monthLabel.textContent = fmtMonth.format(view);
    daysGrid.innerHTML = '';
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    const today = new Date();
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const day = document.createElement('button');
      day.type = 'button';
      day.className = 'period-day';
      day.textContent = d.getDate();
      if (d.getMonth() !== month) day.classList.add('is-muted');
      if (sameDay(d, today)) day.classList.add('is-today');
      if (sameDay(d, selected)) day.classList.add('is-selected');
      if (d.getMonth() === month) {
        day.addEventListener('click', () => {
          selected = d;
          chips.forEach(c => c.classList.remove('active'));
          renderCalendar();
        });
      } else {
        day.disabled = true;
      }
      daysGrid.appendChild(day);
    }
  }

  function openPopover(){
    positionPopover();
    renderCalendar();
    popover.hidden = false;
    btn.setAttribute('aria-expanded','true');
  }
  function closePopover(){
    popover.hidden = true;
    btn.setAttribute('aria-expanded','false');
  }
  function togglePopover(){ popover.hidden ? openPopover() : closePopover(); }

  btn.setAttribute('aria-haspopup','dialog');
  btn.setAttribute('aria-expanded','false');
  btn.addEventListener('click', togglePopover);
  closeBtn?.addEventListener('click', closePopover);
  cancelBtn?.addEventListener('click', closePopover);
  prevBtn?.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
  nextBtn?.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
  applyBtn?.addEventListener('click', () => {
    if (label) label.textContent = formatRangeLabel('custom', selected);
    closePopover();
  });
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const preset = chip.dataset.periodPreset;
    if (label) label.textContent = formatRangeLabel(preset);
    if (preset === 'today') selected = new Date();
    renderCalendar();
  }));
  document.addEventListener('click', (e) => {
    if (popover.hidden) return;
    if (popover.contains(e.target) || btn.contains(e.target)) return;
    closePopover();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });
  window.addEventListener('resize', () => { if (!popover.hidden) positionPopover(); });
})();