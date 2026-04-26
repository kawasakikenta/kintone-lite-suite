'use strict';

import { setComponentUi } from '../ui/components.js';
import { setRootElement } from '../ui/dialog.js';

const PANEL_STYLE =
  'position:fixed;z-index:999999;top:max(16px,2vh);right:max(16px,2vw);width:min(440px,94vw);max-height:min(92vh,880px);overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.2);font:12px/1.5 system-ui,sans-serif;';

export interface MountKusLitePanelOptions {
  id: string;
  title: string;
  note?: string;
}

export interface MountKusLitePanelHandles {
  root: HTMLElement;
  status: HTMLElement;
  bodySlot: HTMLElement;
  result: HTMLElement;
}

export function mountKusLitePanel(opts: MountKusLitePanelOptions): MountKusLitePanelHandles {
  const { id, title, note } = opts;
  const old = document.getElementById(id);
  if (old) old.remove();

  const root = document.createElement('div');
  root.id = id;
  root.style.cssText = PANEL_STYLE;

  const head = document.createElement('div');
  head.style.cssText =
    'flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:linear-gradient(125deg,#1d4ed8,#2563eb);color:#fff';
  const t = document.createElement('div');
  t.textContent = title;
  t.style.cssText = 'font-weight:700;font-size:14px';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '閉じる';
  close.style.cssText =
    'padding:5px 10px;font-size:11px;border:1px solid rgba(255,255,255,.5);border-radius:8px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-weight:600';
  close.addEventListener('click', () => {
    root.remove();
    setRootElement(null);
  });
  head.appendChild(t);
  head.appendChild(close);
  root.appendChild(head);

  const scroll = document.createElement('div');
  scroll.style.cssText = 'padding:12px 14px 14px;overflow-y:auto;flex:1;min-height:0';

  if (note) {
    const n = document.createElement('div');
    n.style.cssText = 'color:#64748b;font-size:11px;line-height:1.5;margin-bottom:10px;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0';
    n.textContent = note;
    scroll.appendChild(n);
  }

  const status = document.createElement('div');
  status.style.cssText =
    'padding:8px 10px;font-size:11px;background:#f1f5f9;border-radius:8px;margin-bottom:8px;min-height:1.2em;color:#0f172a';

  const bodySlot = document.createElement('div');
  scroll.appendChild(status);
  scroll.appendChild(bodySlot);

  const result = document.createElement('div');
  result.style.cssText =
    'margin-top:8px;max-height:180px;overflow:auto;font-size:11px;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;display:none';
  scroll.appendChild(result);

  const busyText = document.createElement('span');
  setComponentUi({ status, result, busyText });
  setRootElement(root);
  root.appendChild(scroll);
  document.body.appendChild(root);

  return { root, status, bodySlot, result };
}
