export async function freezePageLoad() {
  const h1 = document.createElement("h1");
  h1.textContent = "H1Dy";
  h1.dataset.testid = "main";
  document.body.appendChild(h1);

  await new Promise((resolve) => setTimeout(resolve, 10));

  h1.addEventListener("click", () => {
    console.warn("click dynamic");
  });

  return () => {
    h1.remove();
  };
}
