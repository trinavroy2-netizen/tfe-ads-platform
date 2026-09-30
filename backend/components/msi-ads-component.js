/*!
 * MSI Ads Component — universal embeddable ad slot for ANY vendor's website
 *
 * Works with:
 * PHP, WordPress, Laravel, static HTML, React, Vue, etc.
 *
 * No build step.
 * No framework dependency.
 *
 * Example:
 *
 * <div class="msi-ad-widget"
 *      data-vendor="VENDOR_SLUG"
 *      data-placement="PLACEMENT_SLUG"
 *      data-api-key="VENDOR_PUBLIC_API_KEY"
 *      data-api-base="https://YOUR-PRODUCTION-DOMAIN">
 * </div>
 *
 * <script
 *   src="https://YOUR-PRODUCTION-DOMAIN/components/msi-ads-component.js"
 *   defer>
 * </script>
 *
 * Multiple slots and multiple vendors can use the same script.
 */

(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "",
    interval: 4000,
    transition: 600,
    fallbackAspectRatio: 4.4
  };

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);

    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") {
          e.className = attrs[k];
        } else if (k === "style") {
          e.style.cssText = attrs[k];
        } else {
          e.setAttribute(k, attrs[k]);
        }
      });
    }

    (children || []).forEach(function (c) {
      if (c) {
        e.appendChild(c);
      }
    });

    return e;
  }

  function normalizeApiBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function injectStylesOnce() {
    if (qs("#msi-ad-widget-styles")) {
      return;
    }

    var css =
      ".msi-ad-widget{" +
        "position:relative;" +
        "display:block;" +
        "width:100%;" +
        "max-width:var(--msi-max-width,1320px);" +
        "height:auto;" +
        "aspect-ratio:var(--msi-aspect-ratio,4.4);" +
        "margin:0 auto;" +
        "padding:0;" +
        "overflow:hidden;" +
        "box-sizing:border-box;" +
        "border-radius:8px;" +
        "background:transparent;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-widget *{" +
        "box-sizing:border-box;" +
      "}" +

      ".msi-ad-viewport{" +
        "position:absolute;" +
        "inset:0;" +
        "width:100%;" +
        "height:100%;" +
        "overflow:hidden;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-track{" +
        "display:flex;" +
        "width:100%;" +
        "height:100%;" +
        "transition:transform " +
        DEFAULTS.transition +
        "ms ease-in-out;" +
        "will-change:transform;" +
      "}" +

      ".msi-ad-slide{" +
        "position:relative;" +
        "flex:0 0 100%;" +
        "width:100%;" +
        "height:100%;" +
        "min-width:100%;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-slide a{" +
        "position:absolute;" +
        "inset:0;" +
        "display:block;" +
        "width:100%;" +
        "height:100%;" +
        "text-decoration:none;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-slide img{" +
        "display:block;" +
        "width:100%;" +
        "height:100%;" +
        "max-width:100%;" +
        "max-height:100%;" +
        "object-fit:cover;" +
        "object-position:center center;" +
        "border:0;" +
        "margin:0;" +
        "padding:0;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-dots{" +
        "position:absolute;" +
        "left:0;" +
        "right:0;" +
        "bottom:8px;" +
        "display:flex;" +
        "justify-content:center;" +
        "align-items:center;" +
        "gap:6px;" +
        "z-index:3;" +
        "line-height:0;" +
      "}" +

      ".msi-ad-dot{" +
        "width:7px;" +
        "height:7px;" +
        "min-width:7px;" +
        "min-height:7px;" +
        "padding:0;" +
        "margin:0;" +
        "border:1px solid rgba(0,0,0,.25);" +
        "border-radius:50%;" +
        "background:rgba(255,255,255,.75);" +
        "cursor:pointer;" +
        "appearance:none;" +
        "-webkit-appearance:none;" +
      "}" +

      ".msi-ad-dot.active{" +
        "background:#111;" +
        "border-color:#111;" +
      "}" +

      ".msi-ad-nav{" +
        "position:absolute;" +
        "top:50%;" +
        "transform:translateY(-50%);" +
        "z-index:3;" +
        "width:32px;" +
        "height:32px;" +
        "padding:0;" +
        "border:0;" +
        "border-radius:50%;" +
        "background:rgba(0,0,0,.35);" +
        "color:#fff;" +
        "font-size:22px;" +
        "font-family:Arial,sans-serif;" +
        "line-height:32px;" +
        "text-align:center;" +
        "cursor:pointer;" +
        "appearance:none;" +
        "-webkit-appearance:none;" +
      "}" +

      ".msi-ad-nav:hover{" +
        "background:rgba(0,0,0,.58);" +
      "}" +

      ".msi-ad-nav:focus{" +
        "outline:1px solid rgba(255,255,255,.8);" +
        "outline-offset:2px;" +
      "}" +

      ".msi-ad-prev{" +
        "left:8px;" +
      "}" +

      ".msi-ad-next{" +
        "right:8px;" +
      "}" +

      ".msi-ad-label{" +
        "position:absolute;" +
        "top:5px;" +
        "right:7px;" +
        "z-index:3;" +
        "font:10px/1 sans-serif;" +
        "color:rgba(0,0,0,.38);" +
        "letter-spacing:.05em;" +
        "pointer-events:none;" +
      "}" +

      ".msi-ad-widget:empty{" +
        "display:none;" +
      "}" +

      "@media(max-width:650px){" +
        ".msi-ad-widget{" +
          "border-radius:6px;" +
        "}" +

        ".msi-ad-nav{" +
          "width:28px;" +
          "height:28px;" +
          "font-size:19px;" +
          "line-height:28px;" +
        "}" +

        ".msi-ad-prev{" +
          "left:6px;" +
        "}" +

        ".msi-ad-next{" +
          "right:6px;" +
        "}" +

        ".msi-ad-dots{" +
          "bottom:6px;" +
        "}" +
      "}";

    var style = el("style", {
      id: "msi-ad-widget-styles"
    });

    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function sendBeacon(apiBase, body) {
    var url =
      normalizeApiBase(apiBase) +
      "/api/public/track";

    var json = JSON.stringify(body);

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob([json], {
            type: "application/json"
          })
        );

        return;
      }
    } catch (e) {
      // Fall through to fetch.
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: json,
      keepalive: true
    }).catch(function () {});
  }

  function AdSlot(container) {
    this.container = container;

    this.vendor =
      container.getAttribute("data-vendor") || "";

    this.placement =
      container.getAttribute("data-placement") || "";

    this.apiKey =
      container.getAttribute("data-api-key") || "";

    this.apiBase =
      container.getAttribute("data-api-base") ||
      DEFAULTS.apiBase;

    this.intervalMs =
      parseInt(
        container.getAttribute("data-interval"),
        10
      ) || DEFAULTS.interval;

    this.index = 0;

    this.ads = [];

    this.dimensions = {};

    this.imageRatios = {};

    this.impressed = {};

    this.timer = null;

    this.inView = false;

    this.observer = null;

    this.track = null;

    this.dotsWrap = null;

    this.viewport = null;

    this.mouseEnterHandler = null;

    this.mouseLeaveHandler = null;
  }

AdSlot.prototype.fetchAds = function () {
  var self = this;

  if (!self.apiBase) {
    console.warn(
      "[msi-ads-component] data-api-base is required."
    );

    self.ads = [];
    self.dimensions = {};

    return Promise.resolve();
  }

  var url =
    normalizeApiBase(self.apiBase) +
    "/api/public/ads?vendor=" +
    encodeURIComponent(self.vendor) +
    "&placement=" +
    encodeURIComponent(self.placement);

  return fetch(url, {
    method: "GET",
    headers: self.apiKey
      ? { "X-API-Key": self.apiKey }
      : {}
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "MSI Ads Component: request failed (" +
            response.status +
            ")"
        );
      }

      return response.json();
    })
    .then(function (data) {
      self.ads = Array.isArray(data.ads) ? data.ads : [];
      self.dimensions = data.dimensions || {};
      return data;
    })
    .catch(function (error) {
      console.warn(
        "[msi-ad-widget]",
        error.message || error
      );

      self.ads = [];
      self.dimensions = {};
    });
};

  AdSlot.prototype.getPlacementRatio = function () {
    var d = this.dimensions || {};

    var width = parseFloat(
      d.desktop_width
    );

    var height = parseFloat(
      d.desktop_height
    );

    if (
      isFinite(width) &&
      isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return width / height;
    }

    return DEFAULTS.fallbackAspectRatio;
  };

  AdSlot.prototype.getCurrentRatio = function () {
    var ad = this.ads[this.index];

    if (ad && this.imageRatios[ad.id]) {
      return this.imageRatios[ad.id];
    }

    return this.getPlacementRatio();
  };

  AdSlot.prototype.applySizing = function () {
    var d = this.dimensions || {};

    var maxWidth =
      parseFloat(d.desktop_width) ||
      1320;

    var ratio =
      this.getCurrentRatio() ||
      DEFAULTS.fallbackAspectRatio;

    if (
      !isFinite(ratio) ||
      ratio <= 0
    ) {
      ratio = DEFAULTS.fallbackAspectRatio;
    }

    this.container.style.setProperty(
      "--msi-max-width",
      maxWidth + "px"
    );

    this.container.style.setProperty(
      "--msi-aspect-ratio",
      String(ratio)
    );

    /*
     * Important:
     * No fixed desktop/tablet/mobile heights.
     *
     * The slot height is always calculated from:
     *
     * width / image ratio
     *
     * Example:
     * 1320x300 image -> ratio 4.4
     * 900px wide     -> 204.5px high
     * 600px wide     -> 136.4px high
     * 390px wide     -> 88.6px high
     */

    this.container.style.removeProperty(
      "height"
    );

    this.container.style.removeProperty(
      "min-height"
    );
  };

  AdSlot.prototype.updateImageRatio = function (
    ad,
    img
  ) {
    var self = this;

    if (
      !ad ||
      !img ||
      !img.naturalWidth ||
      !img.naturalHeight
    ) {
      return;
    }

    var ratio =
      img.naturalWidth /
      img.naturalHeight;

    if (
      !isFinite(ratio) ||
      ratio <= 0
    ) {
      return;
    }

    self.imageRatios[ad.id] = ratio;

    if (
      self.ads[self.index] &&
      self.ads[self.index].id === ad.id
    ) {
      self.applySizing();
    }
  };

  AdSlot.prototype.render = function () {
    var self = this;

    self.stopAutoplay();

    if (self.observer) {
      self.observer.disconnect();
      self.observer = null;
    }

    if (self.mouseEnterHandler) {
      self.container.removeEventListener(
        "mouseenter",
        self.mouseEnterHandler
      );
    }

    if (self.mouseLeaveHandler) {
      self.container.removeEventListener(
        "mouseleave",
        self.mouseLeaveHandler
      );
    }

    self.container.innerHTML = "";

    self.track = null;
    self.dotsWrap = null;
    self.viewport = null;

    if (!self.ads.length) {
      return;
    }

    self.index = 0;

    self.applySizing();

    var viewport = el("div", {
      class: "msi-ad-viewport"
    });

    var track = el("div", {
      class: "msi-ad-track"
    });

    var dotsWrap = el("div", {
      class: "msi-ad-dots"
    });

    self.ads.forEach(function (ad, i) {
      var img = el("img", {
        src: ad.image_url,
        alt:
          ad.alt_text ||
          ad.title ||
          "Advertisement",
        loading:
          i === 0
            ? "eager"
            : "lazy",
        decoding: "async"
      });

      img.addEventListener(
        "load",
        function () {
          self.updateImageRatio(
            ad,
            img
          );
        }
      );

      if (
        img.complete &&
        img.naturalWidth
      ) {
        self.updateImageRatio(
          ad,
          img
        );
      }

      var anchor = el("a", {
        href:
          ad.target_url ||
          "#",
        target:
          ad.open_in_new_tab
            ? "_blank"
            : "_self",
        rel:
          "noopener noreferrer sponsored"
      }, [img]);

      anchor.addEventListener(
        "click",
        function () {
          sendBeacon(
            self.apiBase,
            {
              ad_id: ad.id,
              event_type: "click"
            }
          );
        }
      );

      var slide = el("div", {
        class: "msi-ad-slide"
      }, [anchor]);

      track.appendChild(slide);

      if (self.ads.length > 1) {
        var dot = el("button", {
          class:
            "msi-ad-dot" +
            (i === 0
              ? " active"
              : ""),
          type: "button",
          "aria-label":
            "Go to ad " +
            (i + 1)
        });

        dot.addEventListener(
          "click",
          function () {
            self.goTo(i);
            self.restartAutoplay();
          }
        );

        dotsWrap.appendChild(dot);
      }
    });

    viewport.appendChild(track);

    self.container.appendChild(
      viewport
    );

    if (self.ads.length > 1) {
      var prev = el("button", {
        class:
          "msi-ad-nav msi-ad-prev",
        type: "button",
        "aria-label":
          "Previous ad"
      }, [
        document.createTextNode(
          "\u2039"
        )
      ]);

      var next = el("button", {
        class:
          "msi-ad-nav msi-ad-next",
        type: "button",
        "aria-label":
          "Next ad"
      }, [
        document.createTextNode(
          "\u203a"
        )
      ]);

      prev.addEventListener(
        "click",
        function () {
          self.goTo(
            (
              self.index -
              1 +
              self.ads.length
            ) %
              self.ads.length
          );

          self.restartAutoplay();
        }
      );

      next.addEventListener(
        "click",
        function () {
          self.goTo(
            (
              self.index +
              1
            ) %
              self.ads.length
          );

          self.restartAutoplay();
        }
      );

      self.container.appendChild(
        prev
      );

      self.container.appendChild(
        next
      );

      self.container.appendChild(
        dotsWrap
      );
    }

    self.container.appendChild(
      el("span", {
        class: "msi-ad-label"
      }, [
        document.createTextNode(
          "Ad"
        )
      ])
    );

    self.viewport = viewport;
    self.track = track;
    self.dotsWrap = dotsWrap;

    self.goTo(0);

    self.observeVisibility();

    if (self.ads.length > 1) {
      self.startAutoplay();

      self.mouseEnterHandler =
        function () {
          self.stopAutoplay();
        };

      self.mouseLeaveHandler =
        function () {
          self.startAutoplay();
        };

      self.container.addEventListener(
        "mouseenter",
        self.mouseEnterHandler
      );

      self.container.addEventListener(
        "mouseleave",
        self.mouseLeaveHandler
      );
    }
  };

  AdSlot.prototype.goTo = function (i) {
    if (!this.ads.length) {
      return;
    }

    this.index = i;

    /*
     * Recalculate the slot ratio for the current creative.
     * This allows different creative dimensions to work
     * without fixed desktop/tablet/mobile heights.
     */
    this.applySizing();

    if (this.track) {
      this.track.style.transform =
        "translateX(-" +
        i * 100 +
        "%)";
    }

    if (this.dotsWrap) {
      Array.prototype.forEach.call(
        this.dotsWrap.children,
        function (dot, idx) {
          dot.classList.toggle(
            "active",
            idx === i
          );
        }
      );
    }

    this.markImpression(i);
  };

  AdSlot.prototype.next = function () {
    if (this.ads.length <= 1) {
      return;
    }

    var nextIndex =
      (this.index + 1) %
      this.ads.length;

    this.goTo(nextIndex);
  };

  AdSlot.prototype.startAutoplay =
    function () {
      var self = this;

      self.stopAutoplay();

      if (
        self.ads.length <= 1
      ) {
        return;
      }

      self.timer =
        window.setInterval(
          function () {
            /*
             * Do not rotate ads when the
             * browser tab is hidden.
             */
            if (
              document.visibilityState ===
              "hidden"
            ) {
              return;
            }

            /*
             * Do not rotate when slot is
             * outside the viewport.
             */
            if (!self.inView) {
              return;
            }

            self.next();
          },
          self.intervalMs
        );
    };

  AdSlot.prototype.stopAutoplay =
    function () {
      if (this.timer) {
        window.clearInterval(
          this.timer
        );

        this.timer = null;
      }
    };

  AdSlot.prototype.restartAutoplay =
    function () {
      if (
        this.ads.length > 1
      ) {
        this.startAutoplay();
      }
    };

  AdSlot.prototype.markImpression =
    function (i) {
      var ad = this.ads[i];

      if (!this.inView) {
        return;
      }

      if (
        !ad ||
        this.impressed[ad.id]
      ) {
        return;
      }

      this.impressed[ad.id] = true;

      sendBeacon(
        this.apiBase,
        {
          ad_id: ad.id,
          event_type:
            "impression"
        }
      );
    };

  AdSlot.prototype.observeVisibility =
    function () {
      var self = this;

      if (
        !("IntersectionObserver" in window)
      ) {
        self.inView = true;

        self.markImpression(
          self.index
        );

        return;
      }

      var observer =
        new IntersectionObserver(
          function (entries) {
            entries.forEach(
              function (entry) {
                self.inView =
                  entry.isIntersecting;

                if (
                  entry.isIntersecting
                ) {
                  self.markImpression(
                    self.index
                  );
                }
              }
            );
          },
          {
            threshold: 0.5
          }
        );

      self.observer = observer;

      observer.observe(
        self.container
      );
    };

  AdSlot.prototype.init =
    function () {
      var self = this;

      return self.fetchAds()
        .then(function () {
          self.render();
        });
    };

  AdSlot.prototype.destroy =
    function () {
      this.stopAutoplay();

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      if (
        this.mouseEnterHandler
      ) {
        this.container.removeEventListener(
          "mouseenter",
          this.mouseEnterHandler
        );
      }

      if (
        this.mouseLeaveHandler
      ) {
        this.container.removeEventListener(
          "mouseleave",
          this.mouseLeaveHandler
        );
      }

      this.mouseEnterHandler = null;
      this.mouseLeaveHandler = null;

      this.inView = false;
    };

  function initAll(root) {
    injectStylesOnce();

    var containers =
      (root || document)
        .querySelectorAll(
          ".msi-ad-widget:not([data-msi-initialized])"
        );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        if (
          !container.getAttribute(
            "data-vendor"
          ) ||
          !container.getAttribute(
            "data-placement"
          )
        ) {
          console.warn(
            "[msi-ad-widget] container missing data-vendor or data-placement",
            container
          );

          return;
        }

        container.setAttribute(
          "data-msi-initialized",
          "true"
        );

        var slot =
          new AdSlot(
            container
          );

        slot.init();

        container._msiAdSlot =
          slot;
      }
    );
  }

  function refreshAll(root) {
    var containers =
      (root || document)
        .querySelectorAll(
          ".msi-ad-widget[data-msi-initialized]"
        );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        if (
          container._msiAdSlot
        ) {
          container._msiAdSlot.destroy();

          container._msiAdSlot.init();
        }
      }
    );
  }

  function destroyAll(root) {
    var containers =
      (root || document)
        .querySelectorAll(
          ".msi-ad-widget[data-msi-initialized]"
        );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        if (
          container._msiAdSlot
        ) {
          container._msiAdSlot.destroy();
        }

        container.removeAttribute(
          "data-msi-initialized"
        );

        container.innerHTML = "";

        delete container._msiAdSlot;
      }
    );
  }

  /*
   * Public API
   */
  window.MSIAdsComponent = {
    init: initAll,
    refresh: refreshAll,
    destroy: destroyAll
  };

  /*
   * Automatic initialization.
   */
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        initAll();
      }
    );
  } else {
    initAll();
  }

})(window, document);