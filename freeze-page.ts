type RelPath = { pathname: string; search: string };

type Page = {
  cacheKey: string;
  headHtml: string;
  bodyHtml: string;
  bodyAttributes: [string, string][];
  scroll: number;
};

function currentUrl(): RelPath {
  return { pathname: location.pathname, search: location.search };
}

function getCache(): Page[] {
  return JSON.parse(sessionStorage.getItem("freeze-cache") ?? "[]") as Page[];
}

function getPageCache(url: RelPath): Page | undefined {
  const pageCache = getCache();

  for (const item of pageCache) {
    if (item.cacheKey === url.pathname + url.search) {
      return item;
    }
  }

  return undefined;
}

function invokeHooks(hooks: Hooks[], name: string): void {
  for (const [hookName, fn] of hooks) {
    if (hookName !== name) {
      continue;
    }
    try {
      fn();
    } catch (e) {
      console.error(`Error in ${name} hook:`, e);
    }
  }
}

type Hooks = [string, (...args: unknown[]) => unknown];

function getCssHref(el: Element): string | null {
  if (!(el instanceof HTMLLinkElement) || el.rel !== "stylesheet") {
    return null;
  }
  return el.href;
}

async function restorePage(url: RelPath, cache?: Page): Promise<void> {
  if (cache !== undefined) {
    document.body.innerHTML = cache.bodyHtml;

    for (const name of document.body.getAttributeNames()) {
      document.body.removeAttribute(name);
    }
    for (const [name, value] of cache.bodyAttributes) {
      document.body.setAttribute(name, value);
    }

    const cachedHeadDoc = new DOMParser().parseFromString(cache.headHtml, "text/html");
    const persistedCssHrefs = new Set<string>();

    for (const headElt of Array.from(cachedHeadDoc.head.children)) {
      const href = getCssHref(headElt);
      if (href !== null) {
        persistedCssHrefs.add(href);
        headElt.remove();
      }
    }

    for (const headElt of Array.from(document.head.children)) {
      const href = getCssHref(headElt);
      if (href === null || !persistedCssHrefs.has(href)) {
        headElt.remove();
      }
    }

    for (const headElt of Array.from(cachedHeadDoc.head.children)) {
      document.head.appendChild(headElt);
    }

    window.setTimeout(() => window.scrollTo(0, cache.scroll), 0);

    history.pushState("freeze", "", url.pathname + url.search);
  }

  const hookLoadPromises = Array.from(document.querySelectorAll("script"))
    .filter((script) => script.type === "module")
    .flatMap(async (script) => {
      const module = await import(script.src);
      if (!("hooks" in module && Array.isArray(module.hooks))) {
        return [];
      }
      return module.hooks as Hooks[];
    });

  const hookLoadResultsNested = await Promise.allSettled(hookLoadPromises);

  for (const hookLoadResult of hookLoadResultsNested) {
    if (hookLoadResult.status === "rejected") {
      console.error(hookLoadResult.reason);
    }
  }

  const hooks = hookLoadResultsNested
    .filter((hookLoadResults) => hookLoadResults.status === "fulfilled")
    .flatMap((hookLoadResults) => hookLoadResults.value);

  invokeHooks(hooks, "FreezePageLoad");

  const abortController = new AbortController();

  const shouldFreeze = document.body.hasAttribute("data-freeze-page");

  const anchors = document.body.querySelectorAll("a");
  for (const anchor of Array.from(anchors)) {
    anchor.addEventListener(
      "click",
      async (e) => {
        const urlRaw = new URL(anchor.href);
        const nextUrl = { pathname: urlRaw.pathname, search: urlRaw.search };
        const nextCache = getPageCache(nextUrl);
        if (nextCache === undefined) {
          return;
        }
        e.preventDefault();
        if (shouldFreeze) {
          freezePage(url, abortController, hooks);
        }
        await restorePage(nextUrl, nextCache);
      },
      { once: true },
    );
  }

  if (!shouldFreeze) {
    return;
  }

  window.addEventListener(
    "pagehide",
    () => {
      freezePage(url, abortController, hooks);
    },
    {
      signal: abortController.signal,
    },
  );

  window.addEventListener(
    "popstate",
    (event) => {
      freezePage(url, abortController, hooks);
      if (event.state !== "freeze") {
        window.location.reload();
        return;
      }
      const nextUrl = currentUrl();
      const nextPageCache = getPageCache(nextUrl);
      if (nextPageCache === undefined) {
        return;
      }
      restorePage(nextUrl, nextPageCache);
    },
    { signal: abortController.signal },
  );
}

function freezePage(url: RelPath, abortController: AbortController, hooks: Hooks[]): void {
  abortController.abort();

  invokeHooks(hooks, "FreezePageUnload");

  const bodyAttributes = Array.from(document.body.attributes).map((attr): [string, string] => [attr.name, attr.value]);

  const pageCache = getCache();
  const cacheKey = url.pathname + url.search;
  for (let i = 0; i < pageCache.length; i++) {
    if (pageCache[i]?.cacheKey === cacheKey) {
      pageCache.splice(i, 1);
      break;
    }
  }

  const newPage: Page = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes,
    cacheKey,
  };

  pageCache.push(newPage);

  // keep trying to save the cache until it succeeds or is empty
  while (pageCache.length > 0) {
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(pageCache));
      break;
    } catch {
      pageCache.shift(); // shrink the cache and retry
    }
  }
}

let loaded = false;

function onPageShow(event?: PageTransitionEvent): void {
  // Avoid race condition on first page load.
  // The race condition is kind of reproducible when the tests are run on 6 workers in parallel.
  if (event?.persisted === false && !loaded) {
    loaded = true;
    return;
  }

  const url = currentUrl();

  const perfNavigation = performance.getEntriesByType("navigation")[0];
  if (perfNavigation === undefined || !("type" in perfNavigation) || typeof perfNavigation.type !== "string") {
    throw new Error(`Unknown performance entry: ${JSON.stringify(perfNavigation)}`);
  }

  const restoreFromCache =
    (!event?.persisted && perfNavigation.type === "back_forward") ||
    (event?.persisted && perfNavigation.type === "navigate");

  if (restoreFromCache) {
    const cache = getPageCache(url);
    restorePage(url, cache);
    return;
  }

  restorePage(url);
}

export function load(): void {
  onPageShow();
  window.addEventListener("pageshow", onPageShow);
}
