var A = (t, n) => () => (n || t((n = { exports: {} }).exports, n), n.exports);
var l = (t, n, e) =>
  new Promise((d, a) => {
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
      c = (s) => (s.done ? d(s.value) : Promise.resolve(s.value).then(i, o));
    c((e = e.apply(t, n)).next());
  });
var v = A((P) => {
  function b() {
    return { pathname: location.pathname, search: location.search };
  }
  function w() {
    var t;
    return JSON.parse(
      (t = sessionStorage.getItem("freeze-cache")) != null ? t : "[]",
    );
  }
  function y(t) {
    let n = w();
    for (let e of n) if (e.cacheKey === t.pathname + t.search) return e;
  }
  var g = new Set();
  function h(t, n) {
    return l(this, null, function* () {
      if (n !== void 0) {
        document.body.innerHTML = n.bodyHtml;
        for (let a of document.body.getAttributeNames())
          document.body.removeAttribute(a);
        for (let [a, i] of n.bodyAttributes) document.body.setAttribute(a, i);
        (document.head.innerHTML = n.headHtml),
          window.setTimeout(() => window.scrollTo(0, n.scroll), 0);
      }
      let e = document.body.hasAttribute("data-freeze"),
        d = document.body.querySelectorAll("a");
      for (let a of Array.from(d))
        a.addEventListener(
          "click",
          (i) =>
            l(this, null, function* () {
              let o = new URL(a.href),
                c = { pathname: o.pathname, search: o.search },
                s = y(c);
              s !== void 0 && (i.preventDefault(), e && m(t), yield h(c, s));
            }),
          { once: !0 },
        );
      if (e) {
        f.abort(), (f = new AbortController());
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
        for (let r of s) typeof r == "function" && g.add(r);
        window.addEventListener("pagehide", () => m(t), { signal: f.signal }),
          window.addEventListener(
            "popstate",
            (r) =>
              l(this, null, function* () {
                if (r.state !== "freeze") {
                  window.location.reload();
                  return;
                }
                let u = b(),
                  p = y(u);
                p !== void 0 && (m(t), yield h(u, p));
              }),
            { signal: f.signal },
          );
      }
      n !== void 0 && history.pushState("freeze", "", t.pathname + t.search);
    });
  }
  function m(t) {
    var i;
    for (let o of g) o();
    g.clear();
    let n = Array.from(document.body.attributes).map((o) => [o.name, o.value]),
      e = w(),
      d = t.pathname + t.search;
    for (let o = 0; o < e.length; o++)
      if (((i = e[o]) == null ? void 0 : i.cacheKey) === d) {
        e.splice(o, 1);
        break;
      }
    let a = {
      bodyHtml: document.body.innerHTML,
      headHtml: document.head.innerHTML,
      scroll: window.scrollY,
      bodyAttributes: n,
      cacheKey: d,
    };
    for (e.push(a); e.length > 0; )
      try {
        sessionStorage.setItem("freeze-cache", JSON.stringify(e));
        break;
      } catch (o) {
        e.shift();
      }
  }
  var f = new AbortController();
  window.addEventListener("pageshow", (t) =>
    l(P, null, function* () {
      let n = b(),
        e = performance.getEntriesByType("navigation")[0];
      if (e === void 0 || !("type" in e) || typeof e.type != "string")
        throw new Error(`Unknown performance entry: ${JSON.stringify(e)}`);
      if (
        !(
          (!t.persisted && e.type === "back_forward") ||
          (t.persisted && e.type === "navigate")
        )
      ) {
        yield h(n);
        return;
      }
      let a = y(n);
      yield h(n, a);
    }),
  );
});
export default v();
