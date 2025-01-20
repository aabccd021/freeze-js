function onClick() {
  console.warn("click increment");
}

export function freezePageLoad() {
  const incrementElt = document.querySelector("[data-testid=main]");
  if (incrementElt === null) {
    throw new Error("Absurd");
  }

  const count = Number(incrementElt.textContent) + 1;
  incrementElt.textContent = String(count);

  incrementElt.addEventListener("click", onClick);

  return () => {
    incrementElt.removeEventListener("click", onClick);
  };
}
