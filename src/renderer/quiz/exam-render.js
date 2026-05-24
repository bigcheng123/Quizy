'use strict';

/** Lightweight exam-paper markup → HTML (see .cursor/skills/pdf-exam-to-quizy/reference.md). */
const ExamRender = (() => {
  const TOKEN_RE = /\[\[img:([^\]|]+)(?:\|([^\]]*))?\]\]|\{\{pinyin:([^}|]+)\|([^}]+)\}\}|\{\{header:([^}]+)\}\}/g;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseImgAttrs(raw) {
    const out = { cls: 'exam-figure', alt: '' };
    if (!raw) return out;
    for (const part of raw.split('|')) {
      const i = part.indexOf(':');
      if (i < 0) continue;
      const k = part.slice(0, i);
      const v = part.slice(i + 1);
      if (k === 'class') out.cls += ` ${v}`;
      if (k === 'alt') out.alt = v;
    }
    return out;
  }

  function renderHeader(raw) {
    const bits = raw.split('|');
    const pinyin = bits.length >= 3 ? bits[0] : '';
    const title = bits.length >= 3 ? bits[1] : bits[0];
    const points = bits.length >= 3 ? bits[2] : bits[1] || '';
    const pointsHtml = points
      ? `<span class="exam-points">（${escapeHtml(points)}）</span>`
      : '';
    const pinyinHtml = pinyin
      ? `<span class="exam-section-pinyin">${escapeHtml(pinyin)}</span>`
      : '';
    return `<div class="exam-section-head">${pinyinHtml}<span class="exam-section-title">${escapeHtml(title)}${pointsHtml}</span></div>`;
  }

  function stylePlainText(text) {
    let s = escapeHtml(text);
    s = s.replace(/□/g, '<span class="exam-blank-box" aria-hidden="true">□</span>');
    s = s.replace(/○/g, '<span class="exam-circle" aria-hidden="true">○</span>');
    s = s.replace(/（\s*）/g, '<span class="exam-blank-paren">（&nbsp;&nbsp;）</span>');
    s = s.replace(/★/g, '<span class="exam-star">★</span>');
    return s;
  }

  function render(raw) {
    if (!raw) return '';
    let html = '';
    let last = 0;
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(raw)) !== null) {
      if (m.index > last) {
        html += stylePlainText(raw.slice(last, m.index));
      }
      if (m[1]) {
        const meta = parseImgAttrs(m[2]);
        html += `<figure class="${meta.cls}"><img src="${escapeHtml(m[1])}" alt="${escapeHtml(meta.alt)}"></figure>`;
      } else if (m[3]) {
        html += `<ruby class="exam-ruby"><rb>${escapeHtml(m[4])}</rb><rt>${escapeHtml(m[3])}</rt></ruby>`;
      } else if (m[5]) {
        html += renderHeader(m[5]);
      }
      last = m.index + m[0].length;
    }
    if (last < raw.length) html += stylePlainText(raw.slice(last));
    return html.replace(/\n/g, '<br>');
  }

  const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function optionLabel(index) {
    const letter = OPTION_LETTERS[index];
    return letter ? `${letter}.` : `${index + 1}.`;
  }

  /** Remove leading ①②… or A. from stored option text before display. */
  function stripOptionMarker(text) {
    return String(text)
      .replace(/^[①-⑩]\s*/, '')
      .replace(/^[A-H][.、)\s]\s*/, '')
      .trim();
  }

  return { render, optionLabel, stripOptionMarker, OPTION_LETTERS };
})();
