function onClick() {
  console.warn("click increment");
}

let incrementElt;

function pageLoad() {
  incrementElt = document.querySelector("[data-testid=main]");
  if (incrementElt === null) {
    throw new Error("Absurd");
  }

  const count = Number(incrementElt.textContent) + 1;
  incrementElt.textContent = String(count);
  incrementElt.addEventListener("click", onClick);
}

function pageUnload() {
  incrementElt.removeEventListener("click", onClick);
}

export function freezeHooks() {
  return {
    pageLoad,
    pageUnload,
  };
}
