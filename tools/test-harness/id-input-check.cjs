'use strict';

// アプリID・ゲストスペースID・スペースIDの入力欄で、日本語入力のまま入れた全角数字・全角カンマが
// 半角に直ることを、画面にある欄をすべて調べて確かめる（12 ツール共通の makeInput({ idInput: true })）。
// 欄はラベル（aria-label・placeholder）で見つける。アプリ名で探す検索語の欄・複数行の欄は対象外。
const ID_LABEL = /アプリID|ゲストID|ゲストスペースID|スペースID/;
const NOT_ID_LABEL = /アプリ名|検索語/;
const TYPED = '１２３，４５';
const EXPECTED = '123,45';

/** 画面の ID 欄に全角数字を入れ、半角に直った欄（checked）と直らなかった欄（failed）を返す。値は元に戻す。 */
async function checkIdInputsNormalize(page) {
  return page.evaluate(({ idSource, notSource, typed, expected }) => {
    const idLabel = new RegExp(idSource);
    const notIdLabel = new RegExp(notSource);
    const skipTypes = new Set(['radio', 'checkbox', 'file', 'number', 'hidden', 'button', 'submit']);
    const checked = [];
    const failed = [];
    for (const el of document.querySelectorAll('input')) {
      if (skipTypes.has(el.type)) continue;
      const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`.trim();
      if (!idLabel.test(label) || notIdLabel.test(label)) continue;
      const before = el.value;
      el.value = typed;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: typed }));
      (el.value === expected ? checked : failed).push(`${label} => ${el.value}`);
      el.value = before;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
    }
    return { checked, failed };
  }, { idSource: ID_LABEL.source, notSource: NOT_ID_LABEL.source, typed: TYPED, expected: EXPECTED });
}

module.exports = { checkIdInputsNormalize };
