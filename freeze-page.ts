type RelPath = { pathname: string; search: string };

type Page = {
  cacheKey: string;
  headHtml: string;
  bodyHtml: string;
  bodyAttributes: [string, string][];
  scroll: number;
};

type Hook = (...args: unknown[]) => unknown;

type LoadHooks = <T extends string[]>(hookNames: T) => Promise<{ [K in keyof T]: Hook[] }>;

type HookLoaderModule = {
  loadHooks: LoadHooks;
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

function getCssHref(el: Element): string | undefined {
  if (!(el instanceof HTMLLinkElement) || el.rel !== "stylesheet") {
    return undefined;
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

    const cachedHeads = new DOMParser().parseFromString(cache.headHtml, "text/html").head.children;
    const cachedHrefElts = Array.from(cachedHeads).map((el) => [getCssHref(el), el] as const);
    const cachedHrefs = cachedHrefElts.map(([href]) => href);
    const currentHrefElts = Array.from(document.head.children).map((el) => [getCssHref(el), el] as const);
    const intersectingHrefs = currentHrefElts
      .map(([href]) => href)
      .filter((href) => cachedHrefs.includes(href))
      .filter((href) => href !== undefined);

    // Replacing stylesheet link with the same href may cause a white flash,
    // so keep the old one instead of replacing it.
    for (const [href, elt] of currentHrefElts) {
      if (href === undefined || !intersectingHrefs.includes(href)) {
        elt.remove();
      }
    }
    for (const [href, elt] of cachedHrefElts) {
      if (href === undefined || !intersectingHrefs.includes(href)) {
        document.head.appendChild(elt);
      }
    }

    window.setTimeout(() => window.scrollTo(0, cache.scroll), 0);

    history.pushState("freeze", "", url.pathname + url.search);
  }

  let pageLoadHooks: Hook[] = [];
  let pageUnloadHooks: Hook[] = [];

  const hookLoader = document.querySelector<HTMLScriptElement>("script[data-hook-loader]");
  if (hookLoader !== null) {
    const hookLoaderModule: HookLoaderModule = await import(hookLoader.src);
    [pageLoadHooks, pageUnloadHooks] = await hookLoaderModule.loadHooks([
      "FreezePageLoad",
      "FreezePageUnload",
    ] as const);
  }

  for (const pageLoadHook of pageLoadHooks) {
    pageLoadHook();
  }

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
          freezePage(url, abortController, pageUnloadHooks);
        }
        await restorePage(nextUrl, nextCache);
      },
      { once: true },
    );
  }

  if (!shouldFreeze) {
    return;
  }

  window.addEventListener("pagehide", () => freezePage(url, abortController, pageUnloadHooks), {
    signal: abortController.signal,
  });

  window.addEventListener(
    "popstate",
    (event) => {
      freezePage(url, abortController, pageUnloadHooks);
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

function freezePage(url: RelPath, abortController: AbortController, pageUnloadHooks: Hook[]): void {
  abortController.abort();

  for (const pageUnloadHook of pageUnloadHooks) {
    pageUnloadHook();
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
