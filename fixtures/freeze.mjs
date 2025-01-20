var h = (e, r, t) =>
  new Promise((o, d) => {
    var i = (a) => {
        try {
          n(t.next(a));
        } catch (u) {
          d(u);
        }
      },
      c = (a) => {
        try {
          n(t.throw(a));
        } catch (u) {
          d(u);
        }
      },
      n = (a) => (a.done ? o(a.value) : Promise.resolve(a.value).then(i, c));
    n((t = t.apply(e, r)).next());
  });
function b() {
  return { pathname: location.pathname, search: location.search };
}
function w() {
  var e;
  return JSON.parse(
    (e = sessionStorage.getItem("freeze-cache")) != null ? e : "[]",
  );
}
function g(e) {
  let r = w();
  for (let t of r) if (t.cacheKey === e.pathname + e.search) return t;
}
var p = new Set();
function f(e, r) {
  return h(this, null, function* () {
    if (r !== void 0) {
      document.body.innerHTML = r.bodyHtml;
      for (let i of document.body.getAttributeNames())
        document.body.removeAttribute(i);
      for (let [i, c] of r.bodyAttributes) document.body.setAttribute(i, c);
      (document.head.innerHTML = r.headHtml),
        window.setTimeout(() => window.scrollTo(0, r.scroll), 0);
    }
    let t = document.body.hasAttribute("data-freeze"),
      o = new AbortController(),
      d = document.body.querySelectorAll("a");
    for (let i of Array.from(d))
      i.addEventListener(
        "click",
        (c) =>
          h(this, null, function* () {
            let n = new URL(i.href),
              a = { pathname: n.pathname, search: n.search },
              u = g(a);
            u !== void 0 && (c.preventDefault(), t && m(e, o), yield f(a, u));
          }),
        { once: !0 },
      );
    if (t) {
      let c = Array.from(document.querySelectorAll("script")).map((s) => {
          let l = s.getAttribute("src");
          return l !== null && s.getAttribute("type") === "module"
            ? import(l)
            : null;
        }),
        a = (yield Promise.all(c))
          .map((s) =>
            typeof s == "object" &&
            s !== null &&
            "init" in s &&
            typeof s.init == "function"
              ? s.init()
              : null,
          )
          .map((s) => Promise.resolve(s)),
        u = yield Promise.all(a);
      for (let s of u) typeof s == "function" && p.add(s);
      window.addEventListener("pagehide", () => m(e, o), { signal: o.signal }),
        window.addEventListener(
          "popstate",
          (s) => {
            if ((m(e, o), s.state !== "freeze")) {
              window.location.reload();
              return;
            }
            let l = b(),
              y = g(l);
            y !== void 0 && f(l, y);
          },
          { signal: o.signal },
        );
    }
    r !== void 0 && history.pushState("freeze", "", e.pathname + e.search);
  });
}
function m(e, r) {
  var c;
  r.abort();
  for (let n of p) n();
  p.clear();
  let t = Array.from(document.body.attributes).map((n) => [n.name, n.value]),
    o = w(),
    d = e.pathname + e.search;
  for (let n = 0; n < o.length; n++)
    if (((c = o[n]) == null ? void 0 : c.cacheKey) === d) {
      o.splice(n, 1);
      break;
    }
  let i = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: t,
    cacheKey: d,
  };
  for (o.push(i); o.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(o));
      break;
    } catch (n) {
      o.shift();
    }
}
window.addEventListener("pageshow", (e) => {
  let r = b(),
    t = performance.getEntriesByType("navigation")[0];
  if (t === void 0 || !("type" in t) || typeof t.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(t)}`);
  if (
    !(
      (!e.persisted && t.type === "back_forward") ||
      (e.persisted && t.type === "navigate")
    )
  ) {
    f(r);
    return;
  }
  let d = g(r);
  f(r, d);
});
