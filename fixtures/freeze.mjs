var l = (t, a, n) =>
  new Promise((s, o) => {
    var c = (e) => {
        try {
          i(n.next(e));
        } catch (r) {
          o(r);
        }
      },
      d = (e) => {
        try {
          i(n.throw(e));
        } catch (r) {
          o(r);
        }
      },
      i = (e) => (e.done ? s(e.value) : Promise.resolve(e.value).then(c, d));
    i((n = n.apply(t, a)).next());
  });
function p() {
  return { pathname: location.pathname, search: location.search };
}
function b() {
  var t;
  return JSON.parse(
    (t = sessionStorage.getItem("freeze-cache")) != null ? t : "[]",
  );
}
function h(t) {
  let a = b();
  for (let n of a) if (n.cacheKey === t.pathname + t.search) return n;
}
function f(t, a) {
  return l(this, null, function* () {
    if (a !== void 0) {
      (document.body = document.createElement("body")),
        (document.body.innerHTML = a.bodyHtml);
      for (let e of document.body.getAttributeNames())
        document.body.removeAttribute(e);
      for (let [e, r] of a.bodyAttributes) document.body.setAttribute(e, r);
      (document.head.innerHTML = a.headHtml),
        window.setTimeout(() => window.scrollTo(0, a.scroll), 0),
        history.pushState("freeze", "", t.pathname + t.search);
    }
    let n = document.body.hasAttribute("data-freeze"),
      s = new AbortController(),
      o = new Set(),
      c = Array.from(document.querySelectorAll("script"))
        .filter((e) => e.type === "module")
        .map((e) =>
          l(this, null, function* () {
            let r = yield import(e.src);
            return typeof r == "object" &&
              r !== null &&
              "freezePageLoad" in r &&
              typeof r.freezePageLoad == "function"
              ? yield Promise.resolve(r.freezePageLoad())
              : yield Promise.resolve();
          }),
        ),
      d = yield Promise.all(c);
    for (let e of d) typeof e == "function" && o.add(e);
    let i = document.body.querySelectorAll("a");
    for (let e of Array.from(i))
      e.addEventListener(
        "click",
        (r) =>
          l(this, null, function* () {
            let u = new URL(e.href),
              g = { pathname: u.pathname, search: u.search },
              y = h(g);
            y !== void 0 &&
              (r.preventDefault(), n && m(t, s, o), yield f(g, y));
          }),
        { once: !0 },
      );
    n &&
      (window.addEventListener(
        "freeze:beforeunload:response",
        (e) => {
          e.detail !== void 0 && o.add(e.detail);
        },
        { signal: s.signal },
      ),
      window.addEventListener("pagehide", () => m(t, s, o), {
        signal: s.signal,
      }),
      window.addEventListener(
        "popstate",
        (e) => {
          if ((m(t, s, o), e.state !== "freeze")) {
            window.location.reload();
            return;
          }
          let r = p(),
            u = h(r);
          u !== void 0 && f(r, u);
        },
        { signal: s.signal },
      ));
  });
}
function m(t, a, n) {
  var i;
  a.abort();
  for (let e of n) e();
  let s = Array.from(document.body.attributes).map((e) => [e.name, e.value]),
    o = b(),
    c = t.pathname + t.search;
  for (let e = 0; e < o.length; e++)
    if (((i = o[e]) == null ? void 0 : i.cacheKey) === c) {
      o.splice(e, 1);
      break;
    }
  let d = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: s,
    cacheKey: c,
  };
  for (o.push(d); o.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(o));
      break;
    } catch (e) {
      o.shift();
    }
}
window.addEventListener("pageshow", (t) => {
  let a = p(),
    n = performance.getEntriesByType("navigation")[0];
  if (n === void 0 || !("type" in n) || typeof n.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(n)}`);
  if (
    !(
      (!t.persisted && n.type === "back_forward") ||
      (t.persisted && n.type === "navigate")
    )
  ) {
    f(a);
    return;
  }
  let o = h(a);
  f(a, o);
});
