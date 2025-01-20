var m = (n, t, r) =>
  new Promise((l, i) => {
    var e = (c) => {
        try {
          a(r.next(c));
        } catch (s) {
          i(s);
        }
      },
      o = (c) => {
        try {
          a(r.throw(c));
        } catch (s) {
          i(s);
        }
      },
      a = (c) => (c.done ? l(c.value) : Promise.resolve(c.value).then(e, o));
    a((r = r.apply(n, t)).next());
  });
function y() {
  return { pathname: location.pathname, search: location.search };
}
function b() {
  var n;
  return JSON.parse(
    (n = sessionStorage.getItem("freeze-cache")) != null ? n : "[]",
  );
}
function p(n) {
  let t = b();
  for (let r of t) if (r.cacheKey === n.pathname + n.search) return r;
  return null;
}
var g = new Set();
function f(n, t) {
  return m(this, null, function* () {
    if (t !== void 0) {
      document.body.innerHTML = t.bodyHtml;
      for (let [e, o] of t.bodyAttributes) document.body.setAttribute(e, o);
      let i = document.querySelector("title");
      i ? (i.innerHTML = t.title) : (window.document.title = t.title),
        window.setTimeout(() => window.scrollTo(0, t.scroll), 0),
        d.clear();
      for (let e of t.scripts) d.add(e);
    }
    let r = document.body.hasAttribute("data-freeze"),
      l = document.body.querySelectorAll("a");
    for (let i of Array.from(l))
      i.addEventListener(
        "click",
        (e) => {
          let o = new URL(i.href),
            a = { pathname: o.pathname, search: o.search },
            c = p(a);
          c !== null && (e.preventDefault(), r && h(n), f(a, c));
        },
        { once: !0 },
      );
    if (r) {
      if ((u.abort(), (u = new AbortController()), t === void 0)) {
        let e = Array.from(document.querySelectorAll("script"));
        for (let o of Array.from(e)) {
          let a = o.getAttribute("src");
          a !== null && o.getAttribute("type") === "module" && d.add(a);
        }
      }
      let i = yield Promise.all(Array.from(d.values()).map((e) => import(e)));
      for (let e of i)
        if (
          typeof e == "object" &&
          e !== null &&
          "init" in e &&
          typeof e.init == "function"
        ) {
          let o = e.init();
          typeof o == "function" && g.add(o);
        }
      window.addEventListener("pagehide", () => h(n), { signal: u.signal }),
        window.addEventListener(
          "popstate",
          (e) => {
            if (e.state !== "freeze") {
              window.location.reload();
              return;
            }
            let o = y(),
              a = p(o);
            a !== null && (h(n), f(o, a));
          },
          { signal: u.signal },
        );
    }
    t !== void 0 && history.pushState("freeze", "", n.pathname + n.search);
  });
}
var d = new Set();
function h(n) {
  var c;
  for (let s of Array.from(g)) s == null || s();
  g.clear();
  let t = document.body.innerHTML,
    r = Array.from(document.body.attributes).map((s) => [s.name, s.value]),
    l = document.title,
    i = Array.from(d),
    e = b(),
    o = n.pathname + n.search;
  for (let s = 0; s < e.length; s++)
    if (((c = e[s]) == null ? void 0 : c.cacheKey) === o) {
      e.splice(s, 1);
      break;
    }
  let a = {
    bodyHtml: t,
    bodyAttributes: r,
    title: l,
    scripts: i,
    cacheKey: o,
    scroll: window.scrollY,
  };
  for (e.push(a); e.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(e));
      break;
    } catch (s) {
      e.shift();
    }
}
var u = new AbortController();
window.addEventListener("pageshow", (n) => {
  let t = y(),
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
  let i = p(t);
  if (i === null) {
    f(t);
    return;
  }
  f(t, i);
});
