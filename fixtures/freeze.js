var P = (n, e) => () => (e || n((e = { exports: {} }).exports, e), e.exports);
var u = (n, e, o) =>
  new Promise((l, a) => {
    var i = (s) => {
        try {
          t(o.next(s));
        } catch (r) {
          a(r);
        }
      },
      c = (s) => {
        try {
          t(o.throw(s));
        } catch (r) {
          a(r);
        }
      },
      t = (s) => (s.done ? l(s.value) : Promise.resolve(s.value).then(i, c));
    t((o = o.apply(n, e)).next());
  });
var A = P((b) => {
  function m() {
    return { pathname: location.pathname, search: location.search };
  }
  function w() {
    var n;
    return JSON.parse(
      (n = sessionStorage.getItem("freeze-cache")) != null ? n : "[]",
    );
  }
  function y(n) {
    let e = w();
    for (let o of e) if (o.cacheKey === n.pathname + n.search) return o;
    return null;
  }
  var g = new Set();
  function d(n, e) {
    return u(this, null, function* () {
      if (e !== void 0) {
        document.body.innerHTML = e.bodyHtml;
        for (let [i, c] of e.bodyAttributes) document.body.setAttribute(i, c);
        let a = document.querySelector("title");
        a ? (a.innerHTML = e.title) : (window.document.title = e.title),
          window.setTimeout(() => window.scrollTo(0, e.scroll), 0),
          f.clear();
        for (let i of e.scripts) f.add(i);
      }
      let o = document.body.hasAttribute("data-freeze"),
        l = document.body.querySelectorAll("a");
      for (let a of Array.from(l))
        a.addEventListener(
          "click",
          (i) =>
            u(this, null, function* () {
              let c = new URL(a.href),
                t = { pathname: c.pathname, search: c.search },
                s = y(t);
              s !== null && (i.preventDefault(), o && h(n), yield d(t, s));
            }),
          { once: !0 },
        );
      if (o) {
        if ((p.abort(), (p = new AbortController()), e === void 0)) {
          let t = Array.from(document.querySelectorAll("script"));
          for (let s of Array.from(t)) {
            let r = s.getAttribute("src");
            r !== null && s.getAttribute("type") === "module" && f.add(r);
          }
        }
        let i = (yield Promise.all(
            Array.from(f.values()).map((t) => import(t)),
          ))
            .map((t) =>
              typeof t == "object" &&
              t !== null &&
              "init" in t &&
              typeof t.init == "function"
                ? t.init()
                : null,
            )
            .map((t) => Promise.resolve(t)),
          c = yield Promise.all(i);
        for (let t of c) typeof t == "function" && g.add(t);
        window.addEventListener("pagehide", () => h(n), { signal: p.signal }),
          window.addEventListener(
            "popstate",
            (t) =>
              u(this, null, function* () {
                if (t.state !== "freeze") {
                  window.location.reload();
                  return;
                }
                let s = m(),
                  r = y(s);
                r !== null && (h(n), yield d(s, r));
              }),
            { signal: p.signal },
          );
      }
      e !== void 0 && history.pushState("freeze", "", n.pathname + n.search);
    });
  }
  var f = new Set();
  function h(n) {
    var s;
    for (let r of g) Promise.resolve(r());
    g.clear();
    let e = document.body.innerHTML,
      o = Array.from(document.body.attributes).map((r) => [r.name, r.value]),
      l = document.title,
      a = Array.from(f),
      i = w(),
      c = n.pathname + n.search;
    for (let r = 0; r < i.length; r++)
      if (((s = i[r]) == null ? void 0 : s.cacheKey) === c) {
        i.splice(r, 1);
        break;
      }
    let t = {
      bodyHtml: e,
      bodyAttributes: o,
      title: l,
      scripts: a,
      cacheKey: c,
      scroll: window.scrollY,
    };
    for (i.push(t); i.length > 0; )
      try {
        sessionStorage.setItem("freeze-cache", JSON.stringify(i));
        break;
      } catch (r) {
        i.shift();
      }
  }
  var p = new AbortController();
  window.addEventListener("pageshow", (n) =>
    u(b, null, function* () {
      let e = m(),
        o = performance.getEntriesByType("navigation")[0];
      if (o === void 0 || !("type" in o) || typeof o.type != "string")
        throw new Error(`Unknown performance entry: ${JSON.stringify(o)}`);
      if (
        !(
          (!n.persisted && o.type === "back_forward") ||
          (n.persisted && o.type === "navigate")
        )
      ) {
        yield d(e);
        return;
      }
      let a = y(e);
      if (a === null) {
        yield d(e);
        return;
      }
      yield d(e, a);
    }),
  );
});
export default A();
