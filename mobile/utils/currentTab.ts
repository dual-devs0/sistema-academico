export let activeTabIndex = 0;
export let goToFirstTab: (() => void) | null = null;

export function setActiveTabIndex(index: number) {
  activeTabIndex = index;
}

export function registerGoToFirstTab(fn: (() => void) | null) {
  goToFirstTab = fn;
}
