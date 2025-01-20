var m = (t, o, n) =>
  new Promise((r, a) => {
    var f = (i) => {
        try {
          s(n.next(i));
        } catch (u) {
          a(u);
        }
      },
      d = (i) => {
        try {
          s(n.throw(i));
        } catch (u) {
          a(u);
        }
      },
      s = (i) => (i.done ? r(i.value) : Promise.resolve(i.value).then(f, d));
    s((n = n.apply(t, o)).next());
  });
function P() {
  return { pathname: location.pathname, search: location.search };
}
function A() {
  var t;
  return JSON.parse(
    (t = sessionStorage.getItem("freeze-cache")) != null ? t : "[]",
  );
}
function p(t) {
  let o = A();
  for (let n of o) if (n.cacheKey === t.pathname + t.search) return n;
}
var y = new Set();
function h(t, o) {
  return m(this, null, function* () {
    if (o !== void 0) {
      document.body.innerHTML = o.bodyHtml;
      for (let e of document.body.getAttributeNames())
        document.body.removeAttribute(e);
      for (let [e, c] of o.bodyAttributes) document.body.setAttribute(e, c);
      (document.head.innerHTML = o.headHtml),
        window.setTimeout(() => window.scrollTo(0, o.scroll), 0),
        history.pushState("freeze", "", t.pathname + t.search);
    }
    let n = document.body.hasAttribute("data-freeze"),
      r = new AbortController(),
      a = document.body.querySelectorAll("a");
    for (let e of Array.from(a))
      e.addEventListener(
        "click",
        (c) =>
          m(this, null, function* () {
            let l = new URL(e.href),
              b = { pathname: l.pathname, search: l.search },
              w = p(b);
            w !== void 0 && (c.preventDefault(), n && g(t, r), yield h(b, w));
          }),
        { once: !0 },
      );
    if (!n) return;
    let d = Array.from(document.querySelectorAll("script")).map((e) => {
        let c = e.getAttribute("src");
        return c !== null && e.getAttribute("type") === "module"
          ? import(c)
          : null;
      }),
      i = (yield Promise.all(d))
        .map((e) =>
          typeof e == "object" &&
          e !== null &&
          "init" in e &&
          typeof e.init == "function"
            ? e.init()
            : null,
        )
        .map((e) => Promise.resolve(e)),
      u = yield Promise.all(i);
    for (let e of u) typeof e == "function" && y.add(e);
    window.addEventListener("pagehide", () => g(t, r), { signal: r.signal }),
      window.addEventListener(
        "popstate",
        (e) => {
          if ((g(t, r), e.state !== "freeze")) {
            window.location.reload();
            return;
          }
          let c = P(),
            l = p(c);
          l !== void 0 && h(c, l);
        },
        { signal: r.signal },
      );
  });
}
function g(t, o) {
  var d;
  o.abort();
  for (let s of y) s();
  y.clear();
  let n = Array.from(document.body.attributes).map((s) => [s.name, s.value]),
    r = A(),
    a = t.pathname + t.search;
  for (let s = 0; s < r.length; s++)
    if (((d = r[s]) == null ? void 0 : d.cacheKey) === a) {
      r.splice(s, 1);
      break;
    }
  let f = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: n,
    cacheKey: a,
  };
  for (r.push(f); r.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(r));
      break;
    } catch (s) {
      r.shift();
    }
}
window.addEventListener("pageshow", (t) => {
  let o = P(),
    n = performance.getEntriesByType("navigation")[0];
  if (n === void 0 || !("type" in n) || typeof n.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(n)}`);
  if (
    !(
      (!t.persisted && n.type === "back_forward") ||
      (t.persisted && n.type === "navigate")
    )
  ) {
    h(o);
    return;
  }
  let a = p(o);
  h(o, a);
});
