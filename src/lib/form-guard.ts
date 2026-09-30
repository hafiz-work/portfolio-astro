
interface ModalInterface {
  show: () => Promise<boolean>;
  hide: () => void;
}

declare global {
  interface Window {
    unsavedChangesModal?: ModalInterface;
  }
}

export function setupFormGuard(form: HTMLFormElement) {
  let initialData = new FormData(form);
  let isDirty = false;
  let historyPushed = false;

  // Helper to serialize FormData for comparison
  const serialize = (formData: FormData) => {
    const obj: Record<string, any> = {};
    formData.forEach((value, key) => {
      // Simple serialization handling multiple values
      if (obj[key] !== undefined) {
        if (!Array.isArray(obj[key])) {
          obj[key] = [obj[key]];
        }
        obj[key].push(value);
      } else {
        obj[key] = value;
      }
    });
    return JSON.stringify(obj);
  };

  let initialString = serialize(initialData);

  const updateInitialState = () => {
    initialData = new FormData(form);
    initialString = serialize(initialData);
    isDirty = false;
    // Don't remove history state here as it might be complex to revert, 
    // but we reset the dirty flag so guards won't trigger.
  };

  const pushHistoryState = () => {
    if (!historyPushed) {
      history.pushState({ tag: 'form-guard' }, document.title, window.location.href);
      historyPushed = true;
    }
  };

  const checkDirty = () => {
    const currentData = new FormData(form);
    const currentString = serialize(currentData);
    const wasDirty = isDirty;
    isDirty = currentString !== initialString;

    if (isDirty && !wasDirty) {
      pushHistoryState();
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else if (!isDirty && wasDirty) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  };

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      (e as unknown as { returnValue: string }).returnValue = '';
      return '';
    }
  };

  const confirmLeave = async () => {
    const ok = window.unsavedChangesModal
      ? await window.unsavedChangesModal.show()
      : window.confirm("You have unsaved changes. Leave?");
    if (ok) {
      isDirty = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return ok;
  };

  // Browser Back while dirty. History is [..., page, guard] (pushed on first
  // edit), so Back lands on `page` - same URL. With <ClientRouter> active, its
  // own popstate listener always runs first (window listeners fire in the order
  // they were added) and would re-render the page, wiping the form and the modal.
  // So we take over the router's loader instead: park that transition (the next
  // navigation aborts it), ask, then either go back for real or restore the guard.
  const routerActive = () => !!document.querySelector('[name="astro-view-transitions-enabled"]');

  const handleBeforePreparation = (e: Event) => {
    const ev = e as Event & { navigationType?: string; loader: () => Promise<void> };
    if (!isDirty || ev.navigationType !== 'traverse') return;
    ev.loader = () => new Promise<void>(() => { });
    void confirmLeave().then((ok) => {
      if (ok) history.back();
      else history.pushState({ tag: 'form-guard' }, document.title, window.location.href);
    });
  };

  // Same flow for pages without <ClientRouter> (no router events fire there).
  const handlePopState = async () => {
    if (!isDirty || routerActive()) return;
    history.pushState({ tag: 'form-guard' }, document.title, window.location.href);
    if (await confirmLeave()) history.go(-2);
  };

  const handleLinkClick = async (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.toLowerCase().startsWith('javascript:') || target.target === '_blank') return;

    if (isDirty) {
      e.preventDefault();
      e.stopPropagation();
      if (await confirmLeave()) window.location.href = href;
    }
  };

  // Add listeners
  form.addEventListener('input', checkDirty);
  form.addEventListener('change', checkDirty);
  // Also listen for keyup to catch text inputs faster if needed, but input is usually sufficient

  window.addEventListener('popstate', handlePopState);
  document.addEventListener('astro:before-preparation', handleBeforePreparation);
  document.addEventListener('click', handleLinkClick, true);

  return {
    updateInitialState,
    cleanup: () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
      document.removeEventListener('click', handleLinkClick, true);
      form.removeEventListener('input', checkDirty);
      form.removeEventListener('change', checkDirty);
    }
  };
}
