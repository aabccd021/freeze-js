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

type Unsub = () => void;

const unsubs = new Set<Unsub>();

async function restorePage(url: RelPath, cache?: Page): Promise<void> {
  // TODO: move this block to its own function
  if (cache !== undefined) {
    document.body.innerHTML = cache.bodyHtml;

    for (const name of document.body.getAttributeNames()) {
      document.body.removeAttribute(name);
    }
    for (const [name, value] of cache.bodyAttributes) {
      document.body.setAttribute(name, value);
    }

    document.head.innerHTML = cache.headHtml;

    window.setTimeout(() => window.scrollTo(0, cache.scroll), 0);

    // TODO: wake up scripts here
    history.pushState("freeze", "", url.pathname + url.search);
  }

  const shouldFreeze = document.body.hasAttribute("data-freeze");

  const abortController = new AbortController();

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
          freezePage(url, abortController);
        }
        await restorePage(nextUrl, nextCache);
      },
      { once: true },
    );
  }

  if (!shouldFreeze) {
    return;
  }
  const scripts = Array.from(document.querySelectorAll("script"));
  const subscribedScripts = scripts.map((script) => {
    const src = script.getAttribute("src");
    if (src !== null && script.getAttribute("type") === "module") {
      return import(src);
    }
    return null;
  });

  const modules = await Promise.all(subscribedScripts);

  const initPromises = modules
    .map((module) => {
      if (typeof module === "object" && module !== null && "init" in module && typeof module.init === "function") {
        return module.init();
      }
      return null;
    })
    .map((init) => Promise.resolve(init));

  const newUnsubs = await Promise.all(initPromises);
  for (const newUnsub of newUnsubs) {
    if (typeof newUnsub === "function") {
      unsubs.add(newUnsub);
    }
  }

  window.addEventListener("pagehide", () => freezePage(url, abortController), {
    signal: abortController.signal,
  });

  window.addEventListener(
    "popstate",
    (event) => {
      freezePage(url, abortController);
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

function freezePage(url: RelPath, abortController: AbortController): void {
  abortController.abort();
  for (const unsub of unsubs) {
    unsub();
  }
  unsubs.clear();

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

window.addEventListener("pageshow", (event) => {
  const url = currentUrl();

  const perfNavigation = performance.getEntriesByType("navigation")[0];
  if (perfNavigation === undefined || !("type" in perfNavigation) || typeof perfNavigation.type !== "string") {
    throw new Error(`Unknown performance entry: ${JSON.stringify(perfNavigation)}`);
  }

  const shouldRestoreFromCache =
    (!event.persisted && perfNavigation.type === "back_forward") ||
    (event.persisted && perfNavigation.type === "navigate");

  if (!shouldRestoreFromCache) {
    restorePage(url);
    return;
  }

  const cache = getPageCache(url);
  restorePage(url, cache);
});
