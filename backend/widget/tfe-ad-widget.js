/*!
 * TFE Ad Widget — embeddable ad slot for vendor websites (PHP, static HTML, anything).
 * No build step, no framework dependency. Include once per page:
 *
 *   <div class="tfe-ad-widget"
 *        data-vendor="toolsforengineers"
 *        data-placement="homepage"
 *        data-api-key="YOUR_VENDOR_API_KEY"
 *        data-api-base="https://ads-api.mahavirshree.com"></div>
 *   <script src="https://ads-api.mahavirshree.com/widget/tfe-ad-widget.js" async></script>
 *
 * Multiple slots on one page are fine — just add more containers with
 * different data-placement values (e.g. homepage / hydro / solar).
 */
(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "http://localhost:8000",
    interval: 4000, // ms between auto-slides
    transition: 600, // ms slide animation
  };

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") e.className = attrs[k];
        else if (k === "style") e.style.cssText = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      e.appendChild(c);
    });
    return e;
  }

  function injectStylesOnce() {
    if (qs("#tfe-ad-widget-styles")) return;
    var css =
      ".tfe-ad-widget{position:relative;width:100%;max-width:1320px;margin:0 auto;" +
      "overflow:hidden;border-radius:8px;background:#eef2f7;}" +
      ".tfe-ad-track{display:flex;height:100%;transition:transform " +
      DEFAULTS.transition +
      "ms ease-in-out;will-change:transform;}" +
      ".tfe-ad-slide{flex:0 0 100%;height:100%;position:relative;}" +
      ".tfe-ad-slide a{display:block;width:100%;height:100%;text-decoration:none;}" +
      ".tfe-ad-slide img{width:100%;height:100%;object-fit:cover;display:block;border:0;}" +
      ".tfe-ad-dots{position:absolute;bottom:8px;left:0;right:0;display:flex;" +
      "justify-content:center;gap:6px;z-index:2;}" +
      ".tfe-ad-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.6);" +
      "cursor:pointer;border:1px solid rgba(0,0,0,.15);padding:0;}" +
      ".tfe-ad-dot.active{background:#1a73e8;}" +
      ".tfe-ad-widget:empty{display:none;}" +
      ".tfe-ad-label{position:absolute;top:4px;right:6px;font:10px/1 sans-serif;" +
      "color:rgba(0,0,0,.35);z-index:2;letter-spacing:.05em;}" +
      "@media(max-width:900px){.tfe-ad-widget{height:var(--tfe-tablet-h,260px)!important;}}" +
      "@media(max-width:650px){.tfe-ad-widget{height:var(--tfe-mobile-h,220px)!important;}}";
    var style = el("style", { id: "tfe-ad-widget-styles" });
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function sendBeacon(apiBase, body) {
    var url = apiBase.replace(/\/$/, "") + "/api/public/track";
    var json = JSON.stringify(body);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([json], { type: "application/json" }));
        return;
      }
    } catch (e) {
      /* fall through to fetch */
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
      keepalive: true,
    }).catch(function () {});
  }

  function AdSlot(container) {
    this.container = container;
    this.vendor = container.getAttribute("data-vendor");
    this.placement = container.getAttribute("data-placement");
    this.apiKey = container.getAttribute("data-api-key") || "";
    this.apiBase = container.getAttribute("data-api-base") || DEFAULTS.apiBase;
    this.intervalMs =
      parseInt(container.getAttribute("data-interval"), 10) || DEFAULTS.interval;
    this.index = 0;
    this.ads = [];
    this.impressed = {};
    this.timer = null;
  }

  AdSlot.prototype.fetchAds = function () {
    var self = this;
    var url =
      self.apiBase.replace(/\/$/, "") +
      "/api/public/ads?vendor=" +
      encodeURIComponent(self.vendor) +
      "&placement=" +
      encodeURIComponent(self.placement);

    return fetch(url, {
      headers: self.apiKey ? { "X-API-Key": self.apiKey } : {},
    })
      .then(function (res) {
        if (!res.ok) throw new Error("TFE Ad Widget: request failed (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        self.ads = data.ads || [];
        self.dimensions = data.dimensions || {};
        return data;
      })
      .catch(function (err) {
        console.warn("[tfe-ad-widget]", err.message || err);
        self.ads = [];
      });
  };

  AdSlot.prototype.applySizing = function () {
    var d = this.dimensions || {};
    if (d.desktop_height) this.container.style.height = d.desktop_height + "px";
    if (d.tablet_height) this.container.style.setProperty("--tfe-tablet-h", d.tablet_height + "px");
    if (d.mobile_height) this.container.style.setProperty("--tfe-mobile-h", d.mobile_height + "px");
    if (d.desktop_width) this.container.style.maxWidth = d.desktop_width + "px";
  };

  AdSlot.prototype.render = function () {
    var self = this;
    self.container.innerHTML = "";
    if (!self.ads.length) return;

    self.applySizing();

    var track = el("div", { class: "tfe-ad-track" });
    var dotsWrap = el("div", { class: "tfe-ad-dots" });

    self.ads.forEach(function (ad, i) {
      var img = el("img", { src: ad.image_url, alt: ad.alt_text || ad.title, loading: "lazy" });
      var anchor = el("a", {
        href: ad.target_url,
        target: ad.open_in_new_tab ? "_blank" : "_self",
        rel: "noopener noreferrer sponsored",
      }, [img]);

      anchor.addEventListener("click", function () {
        sendBeacon(self.apiBase, { ad_id: ad.id, event_type: "click" });
      });

      var slide = el("div", { class: "tfe-ad-slide" }, [anchor]);
      track.appendChild(slide);

      if (self.ads.length > 1) {
        var dot = el("button", { class: "tfe-ad-dot" + (i === 0 ? " active" : ""), "aria-label": "Go to ad " + (i + 1) });
        dot.addEventListener("click", function () {
          self.goTo(i);
          self.restartAutoplay();
        });
        dotsWrap.appendChild(dot);
      }
    });

    self.container.appendChild(track);
    if (self.ads.length > 1) self.container.appendChild(dotsWrap);
    self.container.appendChild(el("span", { class: "tfe-ad-label" }, [document.createTextNode("Ad")]));

    self.track = track;
    self.dotsWrap = dotsWrap;
    self.index = 0;
    self.goTo(0);
    self.observeVisibility();

    if (self.ads.length > 1) {
      self.startAutoplay();
      self.container.addEventListener("mouseenter", function () {
        self.stopAutoplay();
      });
      self.container.addEventListener("mouseleave", function () {
        self.startAutoplay();
      });
    }
  };

  AdSlot.prototype.goTo = function (i) {
    this.index = i;
    if (this.track) {
      // Right-to-left auto-scroll: slide N is offset to the right initially via
      // translateX, so advancing the index moves content leaving from the right
      // edge and entering from the right, exiting to the left.
      this.track.style.transform = "translateX(-" + i * 100 + "%)";
    }
    if (this.dotsWrap) {
      Array.prototype.forEach.call(this.dotsWrap.children, function (dot, idx) {
        dot.classList.toggle("active", idx === i);
      });
    }
    this.markImpression(i);
  };

  AdSlot.prototype.next = function () {
    var nextIndex = (this.index + 1) % this.ads.length;
    this.goTo(nextIndex);
  };

  AdSlot.prototype.startAutoplay = function () {
    var self = this;
    self.stopAutoplay();
    self.timer = window.setInterval(function () {
      self.next();
    }, self.intervalMs);
  };

  AdSlot.prototype.stopAutoplay = function () {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  };

  AdSlot.prototype.restartAutoplay = function () {
    if (this.ads.length > 1) this.startAutoplay();
  };

  AdSlot.prototype.markImpression = function (i) {
    var ad = this.ads[i];
    if (!ad || this.impressed[ad.id]) return;
    this.impressed[ad.id] = true;
    sendBeacon(this.apiBase, { ad_id: ad.id, event_type: "impression" });
  };

  AdSlot.prototype.observeVisibility = function () {
    var self = this;
    if (!("IntersectionObserver" in window)) {
      self.markImpression(self.index); // fallback: no lazy viewability check
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            self.markImpression(self.index);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(self.container);
  };

  AdSlot.prototype.init = function () {
    var self = this;
    return self.fetchAds().then(function () {
      self.render();
    });
  };

  function initAll(root) {
    injectStylesOnce();
    var containers = (root || document).querySelectorAll(
      ".tfe-ad-widget:not([data-tfe-initialized])"
    );
    containers.forEach(function (container) {
      if (!container.getAttribute("data-vendor") || !container.getAttribute("data-placement")) {
        console.warn("[tfe-ad-widget] container missing data-vendor or data-placement", container);
        return;
      }
      container.setAttribute("data-tfe-initialized", "true");
      var slot = new AdSlot(container);
      slot.init();
      container._tfeAdSlot = slot;
    });
  }

  function refreshAll(root) {
    var containers = (root || document).querySelectorAll(".tfe-ad-widget[data-tfe-initialized]");
    containers.forEach(function (container) {
      if (container._tfeAdSlot) {
        container._tfeAdSlot.stopAutoplay();
        container._tfeAdSlot.init();
      }
    });
  }

  window.TFEAdWidget = { init: initAll, refresh: refreshAll };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAll();
    });
  } else {
    initAll();
  }
})(window, document);
