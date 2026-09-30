let DATA = { cases: [], meta: {} };
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n) { return '$' + n.toLocaleString('en-US'); }
function fmtDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function stats() {
  const cs = DATA.cases;
  const total = cs.reduce((n, c) => n + c.amount, 0);
  const years = cs.map(c => +c.date.slice(0, 4));
  $('stats').innerHTML =
    '<div class="stat"><div class="stat-n">' + money(total) + '</div><div class="stat-l">announced settlements in this tracker</div></div>' +
    '<div class="stat"><div class="stat-n">' + cs.length + '</div><div class="stat-l">cases tracked</div></div>' +
    '<div class="stat"><div class="stat-n">' + Math.min(...years) + '–' + Math.max(...years) + '</div><div class="stat-l">date range</div></div>';
}

function filtered() {
  const q = $('search').value.trim().toLowerCase();
  const yf = $('yearFilter').value;
  let cs = DATA.cases.filter(c =>
    (!yf || c.date.slice(0, 4) === yf) &&
    (!q || (c.company + ' ' + c.what + ' ' + c.lesson).toLowerCase().includes(q)));
  const s = $('sortBy').value;
  cs = cs.slice().sort((a, b) =>
    s === 'date-asc' ? a.date.localeCompare(b.date)
    : s === 'amt-desc' ? b.amount - a.amount
    : s === 'amt-asc' ? a.amount - b.amount
    : b.date.localeCompare(a.date));
  return cs;
}

function render() {
  const cs = filtered();
  $('cases').innerHTML = cs.length ? cs.map(c =>
    '<div class="case"><div class="case-head"><strong>' + esc(c.company) + '</strong>' +
    '<span class="amt">' + money(c.amount) + '</span></div>' +
    '<div class="muted small">' + fmtDate(c.date) + ' · <a href="' + esc(c.source) + '" target="_blank" rel="noopener">source</a></div>' +
    '<p>' + esc(c.what) + '</p>' +
    '<p class="lesson"><strong>Lesson:</strong> ' + esc(c.lesson) + '</p></div>'
  ).join('') : '<p class="muted">No cases match.</p>';
}

function csvCell(v) {
  v = String(v == null ? '' : v).replace(/\r?\n/g, ' | ');
  return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

async function init() {
  const res = await fetch('data/fca-cases.json');
  DATA = await res.json();
  const years = [...new Set(DATA.cases.map(c => c.date.slice(0, 4)))].sort().reverse();
  years.forEach(y => {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    $('yearFilter').appendChild(o);
  });
  stats();
  render();
  $('dataNote').textContent = DATA.meta.note + ' Last updated ' + DATA.meta.last_updated + '.';
  ['search', 'yearFilter', 'sortBy'].forEach(id => $(id).addEventListener('input', render));
  $('exportCsv').addEventListener('click', () => {
    const lines = [['Company', 'Amount', 'Date announced', 'What happened', 'Lesson', 'Source'].join(',')]
      .concat(DATA.cases.map(c => [c.company, c.amount, c.date, c.what, c.lesson, c.source].map(csvCell).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = 'fca-cyber-settlements.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
}
init();
