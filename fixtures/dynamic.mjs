/**
 * @typedef {Function} Unsub
 * @returns {void}
 */

/**
 * @typedef {Object} VilInitEvent
 * @property {Element} element
 * @property {string} listId
 */

/**
 * @typedef {Function} InitChild
 * @param {VilInitEvent} _event
 * @returns {Promise<Unsub | undefined>}
 */
export async function freezePageLoad(_event) {
  const h1 = document.createElement("h1");
  h1.textContent = "H1Dy";
  h1.dataset["testid"] = "main";
  document.body.appendChild(h1);

  await new Promise((resolve) => setTimeout(resolve, 10));

  h1.addEventListener("click", () => {
    console.warn("click dynamic");
  });

  return () => {
    h1.remove();
  };
}
