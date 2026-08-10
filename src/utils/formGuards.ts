type EnterKeyEvent = {
  key: string;
  preventDefault: () => void;
  target?: EventTarget | null;
  currentTarget?: EventTarget | null;
};

export function preventEnterDefault(event: EnterKeyEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
  }
}

export function preventEnterFormSubmit(event: EnterKeyEvent) {
  if (event.key !== "Enter") return;

  const target = event.target;
  const currentForm = event.currentTarget;

  if (!(target instanceof HTMLElement) || !(currentForm instanceof HTMLFormElement)) {
    return;
  }

  const closestForm = target.closest("form");
  if (closestForm !== currentForm) return;

  if (target.tagName === "TEXTAREA") return;

  event.preventDefault();
}
