export function load() {
  const mainElt = document.querySelector("[data-testid=main]");
  mainElt?.addEventListener("click", () => {
    console.warn("click static");
  });
}
