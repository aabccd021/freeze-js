let h1;

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
  ["freezePageLoad", pageLoad],
  ["freezePageUnload", pageUnload],
];
