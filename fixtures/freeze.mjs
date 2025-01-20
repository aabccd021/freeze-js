var f = (n, a, o) =>
  new Promise((l, r) => {
    var i = (t) => {
        try {
          c(o.next(t));
        } catch (e) {
          r(e);
        }
      },
      d = (t) => {
        try {
          c(o.throw(t));
        } catch (e) {
          r(e);
        }
      },
      c = (t) => (t.done ? l(t.value) : Promise.resolve(t.value).then(i, d));
    c((o = o.apply(n, a)).next());
  });
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
  let a = w();
  for (let o of a) if (o.cacheKey === n.pathname + n.search) return o;
}
function h(n, a) {
  return f(this, null, function* () {
    if (a !== void 0) {
      (document.body = document.createElement("body")),
        (document.body.innerHTML = a.bodyHtml);
      for (let e of document.body.getAttributeNames())
        document.body.removeAttribute(e);
      for (let [e, s] of a.bodyAttributes) document.body.setAttribute(e, s);
      (document.head.innerHTML = a.headHtml),
        window.setTimeout(() => window.scrollTo(0, a.scroll), 0),
        history.pushState("freeze", "", n.pathname + n.search);
    }
    let o = Array.from(document.querySelectorAll("script"))
        .filter((e) => e.type === "module")
        .map((e) =>
          f(this, null, function* () {
            let s = yield import(e.src);
            if (
              typeof s == "object" &&
              s !== null &&
              "freezePageLoad" in s &&
              typeof s.freezePageLoad == "function"
            )
              return yield s.freezePageLoad();
          }),
        ),
      r = (yield Promise.allSettled(o))
        .map((e) => {
          if (e.status === "fulfilled" && typeof e.value == "function")
            return e.value;
        })
        .filter((e) => e !== void 0),
      i = new AbortController(),
      d = document.body.hasAttribute("data-freeze"),
      c = document.body.querySelectorAll("a");
    for (let e of Array.from(c))
      e.addEventListener(
        "click",
        (s) =>
          f(this, null, function* () {
            let u = new URL(e.href),
              p = { pathname: u.pathname, search: u.search },
              y = g(p);
            y !== void 0 &&
              (s.preventDefault(), d && m(n, i, r), yield h(p, y));
          }),
        { once: !0 },
      );
    if (!d) return;
    window.addEventListener("pagehide", () => m(n, i, r), { signal: i.signal });
    let t = window.onpopstate ? window.onpopstate.bind(window) : null;
    window.addEventListener(
      "popstate",
      (e) => {
        if ((m(n, i, r), e.state !== "freeze")) {
          if (t !== null) {
            t(e);
            return;
          }
          window.location.reload();
          return;
        }
        let s = b(),
          u = g(s);
        u !== void 0 && h(s, u);
      },
      { signal: i.signal },
    );
  });
}
function m(n, a, o) {
  var c;
  a.abort();
  for (let t of o) t();
  let l = Array.from(document.body.attributes).map((t) => [t.name, t.value]),
    r = w(),
    i = n.pathname + n.search;
  for (let t = 0; t < r.length; t++)
    if (((c = r[t]) == null ? void 0 : c.cacheKey) === i) {
      r.splice(t, 1);
      break;
    }
  let d = {
    bodyHtml: document.body.innerHTML,
    headHtml: document.head.innerHTML,
    scroll: window.scrollY,
    bodyAttributes: l,
    cacheKey: i,
  };
  for (r.push(d); r.length > 0; )
    try {
      sessionStorage.setItem("freeze-cache", JSON.stringify(r));
      break;
    } catch (t) {
      r.shift();
    }
}
window.addEventListener("pageshow", (n) => {
  let a = b(),
    o = performance.getEntriesByType("navigation")[0];
  if (o === void 0 || !("type" in o) || typeof o.type != "string")
    throw new Error(`Unknown performance entry: ${JSON.stringify(o)}`);
  if (
    !(
      (!n.persisted && o.type === "back_forward") ||
      (n.persisted && o.type === "navigate")
    )
  ) {
    h(a);
    return;
  }
  let r = g(a);
  h(a, r);
});
