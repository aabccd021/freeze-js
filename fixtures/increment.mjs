function onClick() {
  console.warn("click increment");
}

let incrementElt;

export function load() {
  incrementElt = document.querySelector("[data-testid=main]");
  if (incrementElt === null) {
    throw new Error("Absurd");
  }

  const count = Number(incrementElt.textContent) + 1;
  incrementElt.textContent = String(count);
  incrementElt.addEventListener("click", onClick);
}

export function unload() {
  incrementElt.removeEventListener("click", onClick);
}
