var f = (t, r, n) =>
  new Promise((s, a) => {
    var u = (e) => {
        try {
          i(n.next(e));
        } catch (o) {
          a(o);
        }
      },
      d = (e) => {
        try {
          i(n.throw(e));
        } catch (o) {
          a(o);
        }
      },
      i = (e) => (e.done ? s(e.value) : Promise.resolve(e.value).then(u, d));
    i((n = n.apply(t, r)).next());
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
  let r = b();
  for (let n of r) if (n.cacheKey === t.pathname + t.search) return n;
}
function l(t, r) {
  return f(this, null, function* () {
    if (r !== void 0) {
      (document.body = document.createElement("body")),
        (document.body.innerHTML = r.bodyHtml);
      for (let e of document.body.getAttributeNames())
        document.body.removeAttribute(e);
      for (let [e, o] of r.bodyAttributes) document.body.setAttribute(e, o);
      (document.head.innerHTML = r.headHtml),
        window.setTimeout(() => window.scrollTo(0, r.scroll), 0),
        history.pushState("freeze", "", t.pathname + t.search);
    }
    let n = document.body.hasAttribute("data-freeze"),
      s = new AbortController(),
      a = Array.from(document.querySelectorAll("script"))
        .filter((e) => e.type === "module")
        .map((e) =>
          f(this, null, function* () {
            let o = yield import(e.src);
            if (
              typeof o == "object" &&
              o !== null &&
              "freezePageLoad" in o &&
              typeof o.freezePageLoad == "function"
            ) {
              let c = yield o.freezePageLoad();
              if (typeof c == "function") return c;
            }
          }),
        ),
      d = (yield Promise.all(a)).filter((e) => e !== void 0),
      i = document.body.querySelectorAll("a");
    for (let e of Array.from(i))
      e.addEventListener(
        "click",
        (o) =>
          f(this, null, function* () {
            let c = new URL(e.href),
              y = { pathname: c.pathname, search: c.search },
              g = h(y);
            g !== void 0 &&
              (o.preventDefault(), n && m(t, s, d), yield l(y, g));
          }),
        { once: !0 },
      );
    n &&
      (window.addEventListener("pagehide", () => m(t, s, d), {
        signal: s.signal,
      }),
      window.addEventListener(
        "popstate",
        (e) => {
          if ((m(t, s, d), e.state !== "freeze")) {
            window.location.reload();
            return;
          }
          let o = p(),
            c = h(o);
          c !== void 0 && l(o, c);
        },
        { signal: s.signal },
      ));
  });
}
function m(t, r, n) {
  var i;
  r.abort();
  for (let e of n) e();
  let s = Array.from(document.body.attributes).map((e) => [e.name, e.value]),
    a = b(),
    u = t.pathname + t.search;
  for (let e = 0; e < a.length; e++)
    if (((i = a[e]) == null ? void 0 : i.cacheKey) === u) {
      a.splice(e, 1);
      break;
    }
  let d = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: s,
    cacheKey: u,
  };
  for (a.push(d); a.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(a));
      break;
    } catch (e) {
      a.shift();
    }
}
window.addEventListener("pageshow", (t) => {
  let r = p(),
    n = performance.getEntriesByType("navigation")[0];
  if (n === void 0 || !("type" in n) || typeof n.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(n)}`);
  if (
    !(
      (!t.persisted && n.type === "back_forward") ||
      (t.persisted && n.type === "navigate")
    )
  ) {
    l(r);
    return;
  }
  let a = h(r);
  l(r, a);
});
