var u = (n, t, r) =>
  new Promise((l, s) => {
    var e = (c) => {
        try {
          i(r.next(c));
        } catch (a) {
          s(a);
        }
      },
      o = (c) => {
        try {
          i(r.throw(c));
        } catch (a) {
          s(a);
        }
      },
      i = (c) => (c.done ? l(c.value) : Promise.resolve(c.value).then(e, o));
    i((r = r.apply(n, t)).next());
  });
function g() {
  return { pathname: location.pathname, search: location.search };
}
function b() {
  var n;
  return JSON.parse(
    (n = sessionStorage.getItem("freeze-cache")) != null ? n : "[]",
  );
}
function m(n) {
  let t = b();
  for (let r of t) if (r.cacheKey === n.pathname + n.search) return r;
  return null;
}
var p = new Set();
function f(n, t) {
  return u(this, null, function* () {
    if (t !== void 0) {
      document.body.innerHTML = t.bodyHtml;
      for (let [e, o] of t.bodyAttributes) document.body.setAttribute(e, o);
      let s = document.querySelector("title");
      s ? (s.innerHTML = t.title) : (window.document.title = t.title),
        window.setTimeout(() => window.scrollTo(0, t.scroll), 0),
        d.clear();
      for (let e of t.scripts) d.add(e);
    }
    let r = document.body.hasAttribute("data-freeze"),
      l = document.body.querySelectorAll("a");
    for (let s of Array.from(l))
      s.addEventListener(
        "click",
        (e) =>
          u(this, null, function* () {
            let o = new URL(s.href),
              i = { pathname: o.pathname, search: o.search },
              c = m(i);
            c !== null && (e.preventDefault(), r && (yield h(n)), f(i, c));
          }),
        { once: !0 },
      );
    if (r) {
      if ((y.abort(), (y = new AbortController()), t === void 0)) {
        let e = Array.from(document.querySelectorAll("script"));
        for (let o of Array.from(e)) {
          let i = o.getAttribute("src");
          i !== null && o.getAttribute("type") === "module" && d.add(i);
        }
      }
      let s = yield Promise.all(Array.from(d.values()).map((e) => import(e)));
      for (let e of s)
        if (
          typeof e == "object" &&
          e !== null &&
          "init" in e &&
          typeof e.init == "function"
        ) {
          let o = yield Promise.resolve(e.init());
          typeof o == "function" && p.add(o);
        }
      window.addEventListener(
        "pagehide",
        () =>
          u(this, null, function* () {
            yield h(n);
          }),
        { signal: y.signal },
      ),
        window.addEventListener(
          "popstate",
          (e) =>
            u(this, null, function* () {
              if (e.state !== "freeze") {
                window.location.reload();
                return;
              }
              let o = g(),
                i = m(o);
              i !== null && (yield h(n), f(o, i));
            }),
          { signal: y.signal },
        );
    }
    t !== void 0 && history.pushState("freeze", "", n.pathname + n.search);
  });
}
var d = new Set();
function h(n) {
  return u(this, null, function* () {
    var c;
    for (let a of p) yield Promise.resolve(a());
    p.clear();
    let t = document.body.innerHTML,
      r = Array.from(document.body.attributes).map((a) => [a.name, a.value]),
      l = document.title,
      s = Array.from(d),
      e = b(),
      o = n.pathname + n.search;
    for (let a = 0; a < e.length; a++)
      if (((c = e[a]) == null ? void 0 : c.cacheKey) === o) {
        e.splice(a, 1);
        break;
      }
    let i = {
      bodyHtml: t,
      bodyAttributes: r,
      title: l,
      scripts: s,
      cacheKey: o,
      scroll: window.scrollY,
    };
    for (e.push(i); e.length > 0; )
      try {
        sessionStorage.setItem("freeze-cache", JSON.stringify(e));
        break;
      } catch (a) {
        e.shift();
      }
  });
}
var y = new AbortController();
window.addEventListener("pageshow", (n) => {
  let t = g(),
    r = performance.getEntriesByType("navigation")[0];
  if (r === void 0 || !("type" in r) || typeof r.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(r)}`);
  if (
    !(
      (!n.persisted && r.type === "back_forward") ||
      (n.persisted && r.type === "navigate")
    )
  ) {
    f(t);
    return;
  }
  let s = m(t);
  if (s === null) {
    f(t);
    return;
  }
  f(t, s);
});
