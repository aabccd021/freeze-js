function onClick() {
  console.warn("click increment");
}

export function init() {
  const incrementElt = document.querySelector("[data-testid=main]");
  if (incrementElt === null) {
    throw new Error("Absurd");
  }

  const count = Number(incrementElt.textContent) + 1;
  incrementElt.textContent = String(count);

  incrementElt.addEventListener("click", onClick);

  // biome-ignore lint/suspicious/useAwait: <explanation>
  return async () => {
    // return () => {
    // await new Promise((resolve) => setTimeout(resolve, 10));
    incrementElt.removeEventListener("click", onClick);
  };
}
