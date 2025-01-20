var A = (n, t) => () => (t || n((t = { exports: {} }).exports, t), t.exports);
var d = (n, t, e) =>
  new Promise((l, a) => {
    var i = (s) => {
        try {
          c(e.next(s));
        } catch (r) {
          a(r);
        }
      },
      o = (s) => {
        try {
          c(e.throw(s));
        } catch (r) {
          a(r);
        }
      },
      c = (s) => (s.done ? l(s.value) : Promise.resolve(s.value).then(i, o));
    c((e = e.apply(n, t)).next());
  });
var v = A((P) => {
  function b() {
    return { pathname: location.pathname, search: location.search };
  }
  function w() {
    var n;
    return JSON.parse(
      (n = sessionStorage.getItem("freeze-cache")) != null ? n : "[]",
    );
  }
  function g(n) {
    let t = w();
    for (let e of t) if (e.cacheKey === n.pathname + n.search) return e;
    return null;
  }
  var y = new Set();
  function f(n, t) {
    return d(this, null, function* () {
      if (t !== void 0) {
        document.body.innerHTML = t.bodyHtml;
        for (let a of document.body.getAttributeNames())
          document.body.removeAttribute(a);
        for (let [a, i] of t.bodyAttributes) document.body.setAttribute(a, i);
        (document.head.innerHTML = t.headHtml),
          window.setTimeout(() => window.scrollTo(0, t.scroll), 0);
      }
      let e = document.body.hasAttribute("data-freeze"),
        l = document.body.querySelectorAll("a");
      for (let a of Array.from(l))
        a.addEventListener(
          "click",
          (i) =>
            d(this, null, function* () {
              let o = new URL(a.href),
                c = { pathname: o.pathname, search: o.search },
                s = g(c);
              s !== null && (i.preventDefault(), e && m(n), yield f(c, s));
            }),
          { once: !0 },
        );
      if (e) {
        h.abort(), (h = new AbortController());
        let i = Array.from(document.querySelectorAll("script")).map((r) => {
            let u = r.getAttribute("src");
            return u !== null && r.getAttribute("type") === "module"
              ? import(u)
              : null;
          }),
          c = (yield Promise.all(i))
            .map((r) =>
              typeof r == "object" &&
              r !== null &&
              "init" in r &&
              typeof r.init == "function"
                ? r.init()
                : null,
            )
            .map((r) => Promise.resolve(r)),
          s = yield Promise.all(c);
        for (let r of s) typeof r == "function" && y.add(r);
        window.addEventListener("pagehide", () => m(n), { signal: h.signal }),
          window.addEventListener(
            "popstate",
            (r) =>
              d(this, null, function* () {
                if (r.state !== "freeze") {
                  window.location.reload();
                  return;
                }
                let u = b(),
                  p = g(u);
                p !== null && (m(n), yield f(u, p));
              }),
            { signal: h.signal },
          );
      }
      t !== void 0 && history.pushState("freeze", "", n.pathname + n.search);
    });
  }
  function m(n) {
    var i;
    for (let o of y) o();
    y.clear();
    let t = Array.from(document.body.attributes).map((o) => [o.name, o.value]),
      e = w(),
      l = n.pathname + n.search;
    for (let o = 0; o < e.length; o++)
      if (((i = e[o]) == null ? void 0 : i.cacheKey) === l) {
        e.splice(o, 1);
        break;
      }
    let a = {
      bodyHtml: document.body.innerHTML,
      headHtml: document.head.innerHTML,
      scroll: window.scrollY,
      bodyAttributes: t,
      cacheKey: l,
    };
    for (e.push(a); e.length > 0; )
      try {
        sessionStorage.setItem("freeze-cache", JSON.stringify(e));
        break;
      } catch (o) {
        e.shift();
      }
  }
  var h = new AbortController();
  window.addEventListener("pageshow", (n) =>
    d(P, null, function* () {
      let t = b(),
        e = performance.getEntriesByType("navigation")[0];
      if (e === void 0 || !("type" in e) || typeof e.type != "string")
        throw new Error(`Unknown performance entry: ${JSON.stringify(e)}`);
      if (
        !(
          (!n.persisted && e.type === "back_forward") ||
          (n.persisted && e.type === "navigate")
        )
      ) {
        yield f(t);
        return;
      }
      let a = g(t);
      if (a === null) {
        yield f(t);
        return;
      }
      yield f(t, a);
    }),
  );
});
export default v();
