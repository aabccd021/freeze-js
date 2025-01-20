var h = (t, r, e) =>
  new Promise((d, s) => {
    var i = (a) => {
        try {
          c(e.next(a));
        } catch (n) {
          s(n);
        }
      },
      o = (a) => {
        try {
          c(e.throw(a));
        } catch (n) {
          s(n);
        }
      },
      c = (a) => (a.done ? d(a.value) : Promise.resolve(a.value).then(i, o));
    c((e = e.apply(t, r)).next());
  });
function b() {
  return { pathname: location.pathname, search: location.search };
}
function w() {
  var t;
  return JSON.parse(
    (t = sessionStorage.getItem("freeze-cache")) != null ? t : "[]",
  );
}
function g(t) {
  let r = w();
  for (let e of r) if (e.cacheKey === t.pathname + t.search) return e;
}
var p = new Set();
function f(t, r) {
  return h(this, null, function* () {
    if (r !== void 0) {
      document.body.innerHTML = r.bodyHtml;
      for (let s of document.body.getAttributeNames())
        document.body.removeAttribute(s);
      for (let [s, i] of r.bodyAttributes) document.body.setAttribute(s, i);
      (document.head.innerHTML = r.headHtml),
        window.setTimeout(() => window.scrollTo(0, r.scroll), 0);
    }
    let e = document.body.hasAttribute("data-freeze"),
      d = document.body.querySelectorAll("a");
    for (let s of Array.from(d))
      s.addEventListener(
        "click",
        (i) =>
          h(this, null, function* () {
            let o = new URL(s.href),
              c = { pathname: o.pathname, search: o.search },
              a = g(c);
            a !== void 0 && (i.preventDefault(), e && m(t), yield f(c, a));
          }),
        { once: !0 },
      );
    if (e) {
      l.abort(), (l = new AbortController());
      let i = Array.from(document.querySelectorAll("script")).map((n) => {
          let u = n.getAttribute("src");
          return u !== null && n.getAttribute("type") === "module"
            ? import(u)
            : null;
        }),
        c = (yield Promise.all(i))
          .map((n) =>
            typeof n == "object" &&
            n !== null &&
            "init" in n &&
            typeof n.init == "function"
              ? n.init()
              : null,
          )
          .map((n) => Promise.resolve(n)),
        a = yield Promise.all(c);
      for (let n of a) typeof n == "function" && p.add(n);
      window.addEventListener("pagehide", () => m(t), { signal: l.signal }),
        window.addEventListener(
          "popstate",
          (n) => {
            if ((m(t), n.state !== "freeze")) {
              window.location.reload();
              return;
            }
            let u = b(),
              y = g(u);
            y !== void 0 && f(u, y);
          },
          { signal: l.signal },
        );
    }
    r !== void 0 && history.pushState("freeze", "", t.pathname + t.search);
  });
}
function m(t) {
  var i;
  for (let o of p) o();
  p.clear();
  let r = Array.from(document.body.attributes).map((o) => [o.name, o.value]),
    e = w(),
    d = t.pathname + t.search;
  for (let o = 0; o < e.length; o++)
    if (((i = e[o]) == null ? void 0 : i.cacheKey) === d) {
      e.splice(o, 1);
      break;
    }
  let s = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: r,
    cacheKey: d,
  };
  for (e.push(s); e.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(e));
      break;
    } catch (o) {
      e.shift();
    }
}
var l = new AbortController();
window.addEventListener("pageshow", (t) => {
  let r = b(),
    e = performance.getEntriesByType("navigation")[0];
  if (e === void 0 || !("type" in e) || typeof e.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(e)}`);
  if (
    !(
      (!t.persisted && e.type === "back_forward") ||
      (t.persisted && e.type === "navigate")
    )
  ) {
    f(r);
    return;
  }
  let s = g(r);
  f(r, s);
});
