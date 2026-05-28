import { FeatureModule } from '../../registry.js';
import { state } from '../../state.js'; // 段階的な移行のため、既存のstateも一部参照する

// Feature-local state
export const diffState = {
  viewMode: 'table' as 'table' | 'category',
  categoryView: '',
  filterSection: '',
  filterType: '',
  filterSeverity: '',
  searchKeyword: ''
};

export const diffFeature: FeatureModule = {
  id: 'diff',
  
  init() {
    console.log('[DiffFeature] Initialized');
  },

  registerEvents(rootElement: HTMLElement) {
    console.log('[DiffFeature] Registering events');
    // POC: 既存のhandlers.tsから一部の軽量なイベントをこちらに委譲する例
    rootElement.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-act]');
      if (!target) return;
      
      const act = target.getAttribute('data-act');
      if (act === 'clearDiffFilters') {
        e.preventDefault();
        e.stopPropagation();
        clearDiffFilters();
      }
    });
  }
};

export function clearDiffFilters() {
  diffState.filterSection = '';
  diffState.filterType = '';
  diffState.filterSeverity = '';
  diffState.searchKeyword = '';

  // UIの更新 (DOMを直接触る既存の方式のまま、スコープだけ閉じる)
  const secSelect = document.getElementById('u_diffFilterSection') as HTMLSelectElement | null;
  const typeSelect = document.getElementById('u_diffFilterType') as HTMLSelectElement | null;
  const sevSelect = document.getElementById('u_diffFilterSeverity') as HTMLSelectElement | null;
  const searchInput = document.getElementById('u_diffSearch') as HTMLInputElement | null;

  if (secSelect) secSelect.value = '';
  if (typeSelect) typeSelect.value = '';
  if (sevSelect) sevSelect.value = '';
  if (searchInput) searchInput.value = '';

  console.log('[DiffFeature] Filters cleared via local feature handler');
  // TODO: 実際の再レンダリング呼び出し (renderResultRows などへの連携)
}
