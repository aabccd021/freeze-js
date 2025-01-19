type RelPath = { pathname: string; search: string };

type Page = {
  cacheKey: string;
  bodyHtml: string;
  bodyAttributes: [string, string][];
  title: string;
  scroll: number;
  scripts: string[];
};

// dereference location and make it immutable
function currentUrl(): RelPath {
  return {
    pathname: location.pathname,
    search: location.search,
  };
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

type Unsub = (() => void) | undefined;

const unsubscribeScripts = new Set<Unsub>();

async function restorePage(url: RelPath, cached?: Page): Promise<void> {
  if (cached !== undefined) {
    document.body.innerHTML = cached.bodyHtml;
    for (const [name, value] of cached.bodyAttributes) {
      document.body.setAttribute(name, value);
    }

    const titleElt = document.querySelector("title");
    if (titleElt) {
      titleElt.innerHTML = cached.title;
    } else {
      window.document.title = cached.title;
    }

    window.setTimeout(() => window.scrollTo(0, cached.scroll), 0);

    subscribedScripts.clear();
    for (const script of cached.scripts) {
      subscribedScripts.add(script);
    }

    if (url.pathname === "/") {
      throw new Error("no");
    }
  }

  const shouldFreeze = document.body.hasAttribute("data-freeze");

  const anchors = document.body.querySelectorAll("a");
  for (const anchor of Array.from(anchors)) {
    anchor.addEventListener(
      "click",
      (event) => {
        const urlRaw = new URL(anchor.href);
        const newUrl = { pathname: urlRaw.pathname, search: urlRaw.search };
        const cached = getCachedPage(newUrl);
        if (cached) {
          event.preventDefault();
          if (shouldFreeze) {
            freezePage(url);
          }
          restorePage(newUrl, cached);
          return;
        }
      },
      { once: true },
    );
  }

  if (shouldFreeze) {
    abortController.abort();
    abortController = new AbortController();

    window.addEventListener(
      "freeze:subscribe",
      (e: CustomEventInit<string>) => {
        if (e.detail) {
          subscribedScripts.add(e.detail);
        }
      },
      { signal: abortController.signal },
    );

    // trigger `window.addEventListener("freeze:page-loaded")`
    await Promise.all(Array.from(subscribedScripts.values()).map((src): Promise<unknown> => import(src)));

    window.dispatchEvent(new CustomEvent("freeze:page-loaded"));

    const inits = await Promise.all(
      Array.from(subscribedScripts.values()).map((src): Promise<{ init: () => Unsub }> => import(src)),
    );

    for (const init of inits) {
      const unsub = init.init();
      unsubscribeScripts.add(unsub);
    }

    window.addEventListener("pagehide", () => freezePage(url), {
      signal: abortController.signal,
    });

    window.addEventListener(
      "popstate",
      (event) => {
        if (event.state !== "freeze") {
          window.location.reload();
          return;
        }
        const newUrl = currentUrl();
        const newCached = getCachedPage(newUrl);
        if (newCached) {
          freezePage(url);
          restorePage(newUrl, newCached);
          return;
        }
      },
      { signal: abortController.signal },
    );
  }

  if (cached !== undefined) {
    history.pushState("freeze", "", url.pathname + url.search);
  }
}

const subscribedScripts = new Set<string>();

function freezePage(url: RelPath): void {
  for (const unsub of Array.from(unsubscribeScripts)) {
    unsub?.();
  }
  unsubscribeScripts.clear();

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

window.addEventListener("pageshow", (event) => {
  const url = currentUrl();

  const perfEntry = performance.getEntriesByType("navigation")[0];
  if (perfEntry === undefined || !("type" in perfEntry) || typeof perfEntry.type !== "string") {
    throw new Error(`Unknown performance entry: ${JSON.stringify(perfEntry)}`);
  }

  const navigationType = perfEntry.type;
  const shouldRestore =
    (!event.persisted && navigationType === "back_forward") || (event.persisted && navigationType === "navigate");
  if (shouldRestore) {
    const cached = getCachedPage(url);
    if (cached) {
      restorePage(url, cached);
      return;
    }
  }
  restorePage(url);
});
