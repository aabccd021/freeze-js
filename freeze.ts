type RelPath = { pathname: string; search: string };

type Page = {
  cacheKey: string;
  bodyHtml: string;
  bodyAttributes: [string, string][];
  title: string;
  scroll: number;
  scripts: string[];
};

function currentUrl(): RelPath {
  return { pathname: location.pathname, search: location.search };
}

function getPageCache(): Page[] {
  return JSON.parse(sessionStorage.getItem("freeze-cache") ?? "[]") as Page[];
}

function getCachedPage(url: RelPath): Page | null {
  const pageCache = getPageCache();

  for (const item of pageCache) {
    if (item.cacheKey === url.pathname + url.search) {
      return item;
    }
  }

  return null;
}

type Unsub = () => void;

const unsubs = new Set<Unsub>();

async function restorePage(url: RelPath, cache?: Page): Promise<void> {
  if (cache !== undefined) {
    document.body.innerHTML = cache.bodyHtml;

    for (const [name, value] of cache.bodyAttributes) {
      document.body.setAttribute(name, value);
    }

    const titleElt = document.querySelector("title");
    if (titleElt) {
      titleElt.innerHTML = cache.title;
    } else {
      window.document.title = cache.title;
    }

    window.setTimeout(() => window.scrollTo(0, cache.scroll), 0);

    subscribedScripts.clear();
    for (const script of cache.scripts) {
      subscribedScripts.add(script);
    }
  }

  const shouldFreeze = document.body.hasAttribute("data-freeze");

  const anchors = document.body.querySelectorAll("a");
  for (const anchor of Array.from(anchors)) {
    anchor.addEventListener(
      "click",
      async (e) => {
        const urlRaw = new URL(anchor.href);
        const nextUrl = { pathname: urlRaw.pathname, search: urlRaw.search };
        const nextCache = getCachedPage(nextUrl);
        if (nextCache === null) {
          return;
        }
        e.preventDefault();
        if (shouldFreeze) {
          freezePage(url);
        }
        await restorePage(nextUrl, nextCache);
      },
      { once: true },
    );
  }

  if (shouldFreeze) {
    abortController.abort();
    abortController = new AbortController();

    if (cache === undefined) {
      const scripts = Array.from(document.querySelectorAll("script"));
      for (const script of Array.from(scripts)) {
        const src = script.getAttribute("src");
        if (src !== null && script.getAttribute("type") === "module") {
          subscribedScripts.add(src);
        }
      }
    }

    const modules = await Promise.all(
      Array.from(subscribedScripts.values()).map((src): Promise<unknown> => import(src)),
    );

    for (const module of modules) {
      if (typeof module === "object" && module !== null && "init" in module && typeof module.init === "function") {
        const unsub = await Promise.resolve(module.init());
        if (typeof unsub === "function") {
          unsubs.add(unsub);
        }
      }
    }

    window.addEventListener("pagehide", () => freezePage(url), {
      signal: abortController.signal,
    });

    window.addEventListener(
      "popstate",
      async (event) => {
        if (event.state !== "freeze") {
          window.location.reload();
          return;
        }
        const nextUrl = currentUrl();
        const nextPageCache = getCachedPage(nextUrl);
        if (nextPageCache !== null) {
          freezePage(url);
          await restorePage(nextUrl, nextPageCache);
        }
      },
      { signal: abortController.signal },
    );
  }

  if (cache !== undefined) {
    history.pushState("freeze", "", url.pathname + url.search);
  }
}

const subscribedScripts = new Set<string>();

function freezePage(url: RelPath): void {
  for (const unsub of unsubs) {
    Promise.resolve(unsub());
  }
  unsubs.clear();

  const bodyHtml = document.body.innerHTML;
  const bodyAttributes = Array.from(document.body.attributes).map((attr): [string, string] => [attr.name, attr.value]);
  const title = document.title;
  const scripts = Array.from(subscribedScripts);

  const pageCache = getPageCache();
  const cacheKey = url.pathname + url.search;
  for (let i = 0; i < pageCache.length; i++) {
    if (pageCache[i]?.cacheKey === cacheKey) {
      pageCache.splice(i, 1);
      break;
    }
  }

  const newPage: Page = {
    bodyHtml,
    bodyAttributes,
    title,
    scripts,
    cacheKey,
    scroll: window.scrollY,
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

let abortController = new AbortController();

window.addEventListener("pageshow", async (event) => {
  const url = currentUrl();

  const perfNavigation = performance.getEntriesByType("navigation")[0];
  if (perfNavigation === undefined || !("type" in perfNavigation) || typeof perfNavigation.type !== "string") {
    throw new Error(`Unknown performance entry: ${JSON.stringify(perfNavigation)}`);
  }

  const shouldRestoreWithCache =
    (!event.persisted && perfNavigation.type === "back_forward") ||
    (event.persisted && perfNavigation.type === "navigate");

  if (!shouldRestoreWithCache) {
    await restorePage(url);
    return;
  }

  const cache = getCachedPage(url);
  if (cache === null) {
    await restorePage(url);
    return;
  }

  await restorePage(url, cache);
  return;
});
