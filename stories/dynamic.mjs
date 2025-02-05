let h1;

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const removedNode of mutation.removedNodes) {
      if (removedNode instanceof HTMLLinkElement) {
        console.warn("link removed");
      }
    }
  }
}).observe(document.head, { childList: true, subtree: true });

async function pageLoad() {
  h1 = document.createElement("h1");
  h1.textContent = "H1Dy";
  h1.dataset["testid"] = "main";
  document.body.appendChild(h1);

  await new Promise((resolve) => setTimeout(resolve, 10));

  h1.addEventListener("click", () => {
    console.warn("click dynamic");
  });
}

function pageUnload() {
  h1.remove();
}

export const hooks = [
  ["FreezePageLoad", pageLoad],
  ["FreezePageUnload", pageUnload],
];
