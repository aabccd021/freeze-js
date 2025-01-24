function onClick() {
  console.warn("click increment");
}

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
 * @returns {Promise<Unsub | undefined> | Unsub | undefined}
 */
export function freezePageLoad(_event) {
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
