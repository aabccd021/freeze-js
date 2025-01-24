const mainElt = document.querySelector("[data-testid=main]");
if (mainElt !== null) {
  mainElt.addEventListener("click", () => {
    console.warn("click static");
  });
}
