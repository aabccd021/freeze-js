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

async function restorePage(url: RelPath, cache?: Page): Promise<void> {
  if (cache !== undefined) {
    document.body = document.createElement("body");
    document.body.innerHTML = cache.bodyHtml;

    for (const name of document.body.getAttributeNames()) {
      document.body.removeAttribute(name);
    }
    for (const [name, value] of cache.bodyAttributes) {
      document.body.setAttribute(name, value);
    }

    document.head.innerHTML = cache.headHtml;

    window.setTimeout(() => window.scrollTo(0, cache.scroll), 0);

    history.pushState("freeze", "", url.pathname + url.search);
  }

  const pageLoads = Array.from(document.querySelectorAll("script"))
    .filter((script) => script.type === "module")
    .map(async (script) => {
      const module = await import(script.src);
      if (
        typeof module === "object" &&
        module !== null &&
        "freezePageLoad" in module &&
        typeof module.freezePageLoad === "function"
      ) {
        return await module.freezePageLoad();
      }
      return undefined;
    });

  const pageLoadResults = await Promise.allSettled(pageLoads);

  const unsubs = pageLoadResults
    .map((unsub) => {
      if (unsub.status === "fulfilled" && typeof unsub.value === "function") {
        return unsub.value;
      }
      return undefined;
    })
    .filter((unsub) => unsub !== undefined);

  const abortController = new AbortController();

  const shouldFreeze = document.body.hasAttribute("data-freeze");

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
          freezePage(url, abortController, unsubs);
        }
        await restorePage(nextUrl, nextCache);
      },
      { once: true },
    );
  }

  if (!shouldFreeze) {
    return;
  }

  window.addEventListener("pagehide", () => freezePage(url, abortController, unsubs), {
    signal: abortController.signal,
  });

  const originalPopstate = window.onpopstate ? window.onpopstate.bind(window) : null;
  window.addEventListener(
    "popstate",
    (event) => {
      freezePage(url, abortController, unsubs);
      if (event.state !== "freeze") {
        if (originalPopstate !== null) {
          originalPopstate(event);
          return;
        }
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

function freezePage(url: RelPath, abortController: AbortController, unsubs: Unsub[]): void {
  abortController.abort();
  for (const unsub of unsubs) {
    unsub();
  }

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
