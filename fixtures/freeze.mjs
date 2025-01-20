var h = (e, o, t) =>
  new Promise((r, d) => {
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
      n = (a) => (a.done ? r(a.value) : Promise.resolve(a.value).then(i, c));
    n((t = t.apply(e, o)).next());
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
  let o = w();
  for (let t of o) if (t.cacheKey === e.pathname + e.search) return t;
}
var p = new Set();
function f(e, o) {
  return h(this, null, function* () {
    if (o !== void 0) {
      document.body.innerHTML = o.bodyHtml;
      for (let i of document.body.getAttributeNames())
        document.body.removeAttribute(i);
      for (let [i, c] of o.bodyAttributes) document.body.setAttribute(i, c);
      (document.head.innerHTML = o.headHtml),
        window.setTimeout(() => window.scrollTo(0, o.scroll), 0),
        history.pushState("freeze", "", e.pathname + e.search);
    }
    let t = document.body.hasAttribute("data-freeze"),
      r = new AbortController(),
      d = document.body.querySelectorAll("a");
    for (let i of Array.from(d))
      i.addEventListener(
        "click",
        (c) =>
          h(this, null, function* () {
            let n = new URL(i.href),
              a = { pathname: n.pathname, search: n.search },
              u = g(a);
            u !== void 0 && (c.preventDefault(), t && m(e, r), yield f(a, u));
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
      window.addEventListener("pagehide", () => m(e, r), { signal: r.signal }),
        window.addEventListener(
          "popstate",
          (s) => {
            if ((m(e, r), s.state !== "freeze")) {
              window.location.reload();
              return;
            }
            let l = b(),
              y = g(l);
            y !== void 0 && f(l, y);
          },
          { signal: r.signal },
        );
    }
  });
}
function m(e, o) {
  var c;
  o.abort();
  for (let n of p) n();
  p.clear();
  let t = Array.from(document.body.attributes).map((n) => [n.name, n.value]),
    r = w(),
    d = e.pathname + e.search;
  for (let n = 0; n < r.length; n++)
    if (((c = r[n]) == null ? void 0 : c.cacheKey) === d) {
      r.splice(n, 1);
      break;
    }
  let i = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: t,
    cacheKey: d,
  };
  for (r.push(i); r.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(r));
      break;
    } catch (n) {
      r.shift();
    }
}
window.addEventListener("pageshow", (e) => {
  let o = b(),
    t = performance.getEntriesByType("navigation")[0];
  if (t === void 0 || !("type" in t) || typeof t.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(t)}`);
  if (
    !(
      (!e.persisted && t.type === "back_forward") ||
      (e.persisted && t.type === "navigate")
    )
  ) {
    f(o);
    return;
  }
  let d = g(o);
  f(o, d);
});
