function onClick() {
  console.warn("click static");
}

export function load() {
  const mainElt = document.querySelector("[data-testid=main]");
  mainElt?.addEventListener("click", onClick);
}

export function unload() {
  const mainElt = document.querySelector("[data-testid=main]");
  mainElt?.removeEventListener("click", onClick);
}
