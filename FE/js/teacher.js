/**
 * Teacher page — loads and displays student messages as a card grid,
 * with per-card and full-page PNG download via html2canvas.
 */

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

async function loadMessages() {
  try {
    const res = await fetch('/api/messages');
    const data = await res.json();

    if (data.success) {
      renderCards(data.data);
    }
  } catch (err) {
    console.error('메시지를 불러오는 데 실패했습니다:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function renderCards(messages) {
  var grid = document.getElementById('cardsGrid');
  var emptyState = document.getElementById('emptyState');

  if (!messages || messages.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  grid.style.display = '';
  emptyState.style.display = 'none';
  grid.innerHTML = '';

  messages.forEach(function (msg, index) {
    var card = document.createElement('div');
    card.className = 'message-card';
    card.id = 'card-' + msg.id;
    card.style.animationDelay = (index * 0.05) + 's';

    var imageUrl = msg.image_url || 'assets/carnation.png';
    var isDefault = !msg.image_url;

    card.innerHTML =
      '<div class="card-image-wrapper">' +
        '<img src="' + imageUrl + '"' +
          ' alt="' + escapeHtml(msg.name) + '"' +
          ' class="card-img ' + (isDefault ? 'default-img' : 'uploaded-img') + '"' +
          ' onerror="this.src=\'assets/carnation.png\'; this.className=\'card-img default-img\';">' +
        '<button class="card-download-btn" onclick="saveCard(' + msg.id + ')" title="이 카드 저장">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3E2723" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
            '<polyline points="7 10 12 15 17 10"/>' +
            '<line x1="12" y1="15" x2="12" y2="3"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<div class="card-content">' +
        '<p class="card-name">' + escapeHtml(msg.name) + '</p>' +
        '<p class="card-message">' + escapeHtml(msg.message) + '</p>' +
      '</div>';

    grid.appendChild(card);
  });
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  PNG download helpers                                               */
/* ------------------------------------------------------------------ */

var SAVE_ALL_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
  'style="margin-right:6px;vertical-align:middle;">' +
  '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
  '<polyline points="7 10 12 15 17 10"/>' +
  '<line x1="12" y1="15" x2="12" y2="3"/></svg>';

/**
 * Save the entire teacher page (captureArea) as a PNG.
 */
async function saveFullPage() {
  var btn = document.getElementById('saveAllBtn');
  btn.disabled = true;
  btn.textContent = '저장 중...';

  // Temporarily hide all download buttons so they don't appear in the capture
  var buttons = document.querySelectorAll('.card-download-btn, .save-all-btn');
  buttons.forEach(function (el) { el.style.visibility = 'hidden'; });

  try {
    var canvas = await html2canvas(document.getElementById('captureArea'), {
      backgroundColor: '#FFF8F0',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    var link = document.createElement('a');
    link.download = '스승의날_롤링페이퍼.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('저장에 실패했습니다.');
    console.error(err);
  } finally {
    buttons.forEach(function (el) { el.style.visibility = ''; });
    btn.disabled = false;
    btn.innerHTML = SAVE_ALL_SVG + '전체 저장';
  }
}

/**
 * Save an individual message card as a PNG.
 */
async function saveCard(cardId) {
  var card = document.getElementById('card-' + cardId);
  if (!card) return;

  var downloadBtn = card.querySelector('.card-download-btn');
  if (downloadBtn) downloadBtn.style.visibility = 'hidden';

  try {
    var canvas = await html2canvas(card, {
      backgroundColor: '#FFFFFF',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    var nameEl = card.querySelector('.card-name');
    var name = nameEl ? nameEl.textContent : 'card';
    var link = document.createElement('a');
    link.download = name + '_메시지.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('저장에 실패했습니다.');
    console.error(err);
  } finally {
    if (downloadBtn) downloadBtn.style.visibility = '';
  }
}

/* ------------------------------------------------------------------ */
/*  Init: load once, then auto-refresh every 30 s                      */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', function () {
  loadMessages();
  setInterval(loadMessages, 30000);
});
