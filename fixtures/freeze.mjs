var f = (t, a, o) =>
  new Promise((l, r) => {
    var i = (e) => {
        try {
          c(o.next(e));
        } catch (n) {
          r(n);
        }
      },
      u = (e) => {
        try {
          c(o.throw(e));
        } catch (n) {
          r(n);
        }
      },
      c = (e) => (e.done ? l(e.value) : Promise.resolve(e.value).then(i, u));
    c((o = o.apply(t, a)).next());
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
  let a = w();
  for (let o of a) if (o.cacheKey === t.pathname + t.search) return o;
}
function m(t, a) {
  return f(this, null, function* () {
    if (a !== void 0) {
      (document.body = document.createElement("body")),
        (document.body.innerHTML = a.bodyHtml);
      for (let n of document.body.getAttributeNames())
        document.body.removeAttribute(n);
      for (let [n, s] of a.bodyAttributes) document.body.setAttribute(n, s);
      (document.head.innerHTML = a.headHtml),
        window.setTimeout(() => window.scrollTo(0, a.scroll), 0),
        history.pushState("freeze", "", t.pathname + t.search);
    }
    let o = Array.from(document.querySelectorAll("script"))
        .filter((n) => n.type === "module")
        .map((n) =>
          f(this, null, function* () {
            let s = yield import(n.src);
            if (
              typeof s == "object" &&
              s !== null &&
              "freezePageLoad" in s &&
              typeof s.freezePageLoad == "function"
            ) {
              let d = yield s.freezePageLoad();
              if (typeof d == "function") return d;
            }
          }),
        ),
      r = (yield Promise.all(o)).filter((n) => n !== void 0),
      i = new AbortController(),
      u = document.body.hasAttribute("data-freeze"),
      c = document.body.querySelectorAll("a");
    for (let n of Array.from(c))
      n.addEventListener(
        "click",
        (s) =>
          f(this, null, function* () {
            let d = new URL(n.href),
              y = { pathname: d.pathname, search: d.search },
              p = g(y);
            p !== void 0 &&
              (s.preventDefault(), u && h(t, i, r), yield m(y, p));
          }),
        { once: !0 },
      );
    if (!u) return;
    window.addEventListener("pagehide", () => h(t, i, r), { signal: i.signal });
    let e = window.onpopstate ? window.onpopstate.bind(window) : null;
    window.addEventListener(
      "popstate",
      (n) => {
        if ((h(t, i, r), n.state !== "freeze")) {
          if (e !== null) {
            e(n);
            return;
          }
          window.location.reload();
          return;
        }
        let s = b(),
          d = g(s);
        d !== void 0 && m(s, d);
      },
      { signal: i.signal },
    );
  });
}
function h(t, a, o) {
  var c;
  a.abort();
  for (let e of o) e();
  let l = Array.from(document.body.attributes).map((e) => [e.name, e.value]),
    r = w(),
    i = t.pathname + t.search;
  for (let e = 0; e < r.length; e++)
    if (((c = r[e]) == null ? void 0 : c.cacheKey) === i) {
      r.splice(e, 1);
      break;
    }
  let u = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: l,
    cacheKey: i,
  };
  for (r.push(u); r.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(r));
      break;
    } catch (e) {
      r.shift();
    }
}
window.addEventListener("pageshow", (t) => {
  let a = b(),
    o = performance.getEntriesByType("navigation")[0];
  if (o === void 0 || !("type" in o) || typeof o.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(o)}`);
  if (
    !(
      (!t.persisted && o.type === "back_forward") ||
      (t.persisted && o.type === "navigate")
    )
  ) {
    m(a);
    return;
  }
  let r = g(a);
  m(a, r);
});
