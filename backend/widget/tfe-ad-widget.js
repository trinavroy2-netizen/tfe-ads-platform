/*!
 * TFE Ad Widget — embeddable ad slot for vendor websites
 *
 * No build step.
 * No framework dependency.
 *
 * Features:
 * - Fully responsive
 * - Preserves original image aspect ratio
 * - No image cropping
 * - Desktop / tablet / mobile support
 * - Multiple slots per page
 * - Auto rotation
 * - Dot navigation
 * - Impression tracking
 * - Click tracking
 * - IntersectionObserver visibility tracking
 * - ResizeObserver responsive recalculation
 *
 * Example:
 *
 * <div
 *   class="tfe-ad-widget"
 *   data-vendor="toolsforengineers"
 *   data-placement="homepage"
 *   data-api-key="YOUR_VENDOR_API_KEY"
 *   data-api-base="https://ads-api.mahavirshree.com">
 * </div>
 *
 * <script
 *   src="https://ads-api.mahavirshree.com/widget/tfe-ad-widget.js"
 *   async>
 * </script>
 */

(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "http://localhost:8000",
    interval: 4000,
    transition: 600,
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
      e.appendChild(c);
    });

    return e;
  }

  /*
   * -------------------------------------------------------
   * CSS
   * -------------------------------------------------------
   *
   * Important responsive rules:
   *
   * - Widget width is always 100% of available space.
   * - max-width comes from placement desktop_width.
   * - Images use width:100% + height:auto.
   * - No fixed height is applied.
   * - No object-fit:cover.
   * - Therefore the creative keeps its original ratio.
   */
  function injectStylesOnce() {
    if (qs("#tfe-ad-widget-styles")) {
      return;
    }

    var css =
      ".tfe-ad-widget{" +
      "position:relative;" +
      "display:block;" +
      "width:100%;" +
      "max-width:1320px;" +
      "margin:0 auto;" +
      "padding:0;" +
      "overflow:hidden;" +
      "box-sizing:border-box;" +
      "background:transparent;" +
      "line-height:0;" +
      "}" +

      ".tfe-ad-track{" +
      "display:flex;" +
      "width:100%;" +
      "margin:0;" +
      "padding:0;" +
      "transition:transform " +
      DEFAULTS.transition +
      "ms ease-in-out;" +
      "will-change:transform;" +
      "box-sizing:border-box;" +
      "}" +

      ".tfe-ad-slide{" +
      "flex:0 0 100%;" +
      "width:100%;" +
      "min-width:0;" +
      "margin:0;" +
      "padding:0;" +
      "position:relative;" +
      "box-sizing:border-box;" +
      "overflow:hidden;" +
      "line-height:0;" +
      "}" +

      ".tfe-ad-slide a{" +
      "display:block;" +
      "width:100%;" +
      "max-width:100%;" +
      "margin:0;" +
      "padding:0;" +
      "text-decoration:none;" +
      "line-height:0;" +
      "box-sizing:border-box;" +
      "}" +

      ".tfe-ad-slide img{" +
      "display:block;" +
      "width:100%;" +
      "height:auto;" +
      "max-width:100%;" +
      "min-width:0;" +
      "margin:0;" +
      "padding:0;" +
      "border:0;" +
      "box-sizing:border-box;" +
      "object-fit:initial;" +
      "}" +

      ".tfe-ad-dots{" +
      "position:absolute;" +
      "bottom:8px;" +
      "left:0;" +
      "right:0;" +
      "display:flex;" +
      "justify-content:center;" +
      "align-items:center;" +
      "gap:6px;" +
      "z-index:5;" +
      "pointer-events:none;" +
      "line-height:normal;" +
      "}" +

      ".tfe-ad-dot{" +
      "width:7px;" +
      "height:7px;" +
      "min-width:7px;" +
      "min-height:7px;" +
      "border-radius:50%;" +
      "background:rgba(255,255,255,.65);" +
      "border:1px solid rgba(0,0,0,.15);" +
      "padding:0;" +
      "margin:0;" +
      "cursor:pointer;" +
      "pointer-events:auto;" +
      "box-sizing:border-box;" +
      "}" +

      ".tfe-ad-dot.active{" +
      "background:#1a73e8;" +
      "}" +

      ".tfe-ad-label{" +
      "position:absolute;" +
      "top:4px;" +
      "right:6px;" +
      "font:10px/1 sans-serif;" +
      "color:rgba(0,0,0,.35);" +
      "z-index:6;" +
      "letter-spacing:.05em;" +
      "pointer-events:none;" +
      "}" +

      ".tfe-ad-widget:empty{" +
      "display:none;" +
      "}" +

      "@media(max-width:1320px){" +
      ".tfe-ad-widget{" +
      "width:100%;" +
      "max-width:100%;" +
      "}" +
      "}" +

      "@media(max-width:900px){" +
      ".tfe-ad-widget{" +
      "width:100%;" +
      "max-width:100%;" +
      "border-radius:6px;" +
      "}" +
      ".tfe-ad-dots{" +
      "bottom:6px;" +
      "}" +
      "}" +

      "@media(max-width:650px){" +
      ".tfe-ad-widget{" +
      "width:100%;" +
      "max-width:100%;" +
      "border-radius:4px;" +
      "}" +
      ".tfe-ad-dots{" +
      "bottom:5px;" +
      "gap:5px;" +
      "}" +
      ".tfe-ad-dot{" +
      "width:6px;" +
      "height:6px;" +
      "min-width:6px;" +
      "min-height:6px;" +
      "}" +
      "}";

    var style = el("style", {
      id: "tfe-ad-widget-styles",
    });

    style.appendChild(
      document.createTextNode(css)
    );

    document.head.appendChild(style);
  }

  /*
   * -------------------------------------------------------
   * Tracking
   * -------------------------------------------------------
   */
  function sendBeacon(apiBase, body) {
    var url =
      apiBase.replace(/\/$/, "") +
      "/api/public/track";

    var json = JSON.stringify(body);

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob([json], {
            type: "application/json",
          })
        );

        return;
      }
    } catch (e) {
      /* fall through to fetch */
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: json,
      keepalive: true,
    }).catch(function () {});
  }

  /*
   * -------------------------------------------------------
   * Ad Slot
   * -------------------------------------------------------
   */
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

    this.impressed = {};

    this.timer = null;

    this.track = null;

    this.dotsWrap = null;

    this.observer = null;

    this.resizeObserver = null;

    this.dimensions = {};
  }

  /*
   * -------------------------------------------------------
   * Fetch ads
   * -------------------------------------------------------
   */
  AdSlot.prototype.fetchAds = function () {
    var self = this;

    var url =
      self.apiBase.replace(/\/$/, "") +
      "/api/public/ads?vendor=" +
      encodeURIComponent(self.vendor) +
      "&placement=" +
      encodeURIComponent(self.placement);

    return fetch(url, {
      method: "GET",
      headers: self.apiKey
        ? {
            "X-API-Key": self.apiKey,
          }
        : {},
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error(
            "TFE Ad Widget: request failed (" +
              res.status +
              ")"
          );
        }

        return res.json();
      })

      .then(function (data) {
        self.ads = Array.isArray(data.ads)
          ? data.ads
          : [];

        self.dimensions =
          data.dimensions || {};

        return data;
      })

      .catch(function (err) {
        console.warn(
          "[tfe-ad-widget]",
          err.message || err
        );

        self.ads = [];

        self.dimensions = {};

        return null;
      });
  };

  /*
   * -------------------------------------------------------
   * Apply responsive sizing
   * -------------------------------------------------------
   *
   * Desktop width comes from placement.
   *
   * Example:
   *
   * desktop_width = 1320
   *
   * Parent/container width:
   *
   * 1320px -> image 1320px wide
   * 1000px -> image 1000px wide
   * 768px  -> image 768px wide
   * 390px  -> image 390px wide
   *
   * Height is NEVER forced.
   */
  AdSlot.prototype.applySizing = function () {
    var d = this.dimensions || {};

    var desktopWidth = parseInt(
      d.desktop_width,
      10
    );

    if (
      !isNaN(desktopWidth) &&
      desktopWidth > 0
    ) {
      this.container.style.maxWidth =
        desktopWidth + "px";
    } else {
      this.container.style.maxWidth =
        "1320px";
    }

    this.container.style.width = "100%";

    this.container.style.height = "auto";

    this.container.style.boxSizing =
      "border-box";

    this.container.style.overflow =
      "hidden";
  };

  /*
   * -------------------------------------------------------
   * Resize handling
   * -------------------------------------------------------
   *
   * The widget itself does not force an image height.
   *
   * Browser automatically calculates:
   *
   * rendered height =
   * rendered width / original aspect ratio
   *
   * ResizeObserver is used to force a small layout
   * recalculation when the parent/container changes.
   */
  AdSlot.prototype.setupResizeObserver =
    function () {
      var self = this;

      if (
        !("ResizeObserver" in window)
      ) {
        return;
      }

      if (self.resizeObserver) {
        try {
          self.resizeObserver.disconnect();
        } catch (e) {}

        self.resizeObserver = null;
      }

      self.resizeObserver =
        new ResizeObserver(function () {
          if (!self.track) {
            return;
          }

          self.goTo(self.index);
        });

      self.resizeObserver.observe(
        self.container
      );
    };

  /*
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */
  AdSlot.prototype.render = function () {
    var self = this;

    self.stopAutoplay();

    if (self.observer) {
      try {
        self.observer.disconnect();
      } catch (e) {}

      self.observer = null;
    }

    if (self.resizeObserver) {
      try {
        self.resizeObserver.disconnect();
      } catch (e) {}

      self.resizeObserver = null;
    }

    self.container.innerHTML = "";

    self.track = null;
    self.dotsWrap = null;

    if (!self.ads.length) {
      self.container.style.height = "auto";
      return;
    }

    self.applySizing();

    var track = el("div", {
      class: "tfe-ad-track",
    });

    var dotsWrap = el("div", {
      class: "tfe-ad-dots",
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
        decoding: "async",
      });

      /*
       * Explicit responsive image rules.
       *
       * Width follows slide/container.
       * Height remains automatic.
       */
      img.style.display = "block";
      img.style.width = "100%";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.minWidth = "0";
      img.style.margin = "0";
      img.style.padding = "0";
      img.style.border = "0";
      img.style.objectFit = "initial";
      img.style.boxSizing = "border-box";

      var anchor = el(
        "a",
        {
          href: ad.target_url || "#",
          target: ad.open_in_new_tab
            ? "_blank"
            : "_self",
          rel:
            "noopener noreferrer sponsored",
          "aria-label":
            ad.title ||
            "Advertisement",
        },
        [img]
      );

      anchor.addEventListener(
        "click",
        function () {
          sendBeacon(
            self.apiBase,
            {
              ad_id: ad.id,
              event_type: "click",
            }
          );
        }
      );

      var slide = el(
        "div",
        {
          class: "tfe-ad-slide",
        },
        [anchor]
      );

      track.appendChild(slide);

      if (self.ads.length > 1) {
        var dot = el(
          "button",
          {
            class:
              "tfe-ad-dot" +
              (i === 0
                ? " active"
                : ""),
            "aria-label":
              "Go to ad " +
              (i + 1),
            type: "button",
          }
        );

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

    self.container.appendChild(track);

    if (self.ads.length > 1) {
      self.container.appendChild(
        dotsWrap
      );
    }

    self.container.appendChild(
      el(
        "span",
        {
          class: "tfe-ad-label",
        },
        [
          document.createTextNode(
            "Ad"
          ),
        ]
      )
    );

    self.track = track;

    self.dotsWrap = dotsWrap;

    self.index = 0;

    self.goTo(0);

    self.observeVisibility();

    self.setupResizeObserver();

    /*
     * Start autoplay only when there are
     * multiple advertisements.
     */
    if (self.ads.length > 1) {
      self.startAutoplay();

      self.container.addEventListener(
        "mouseenter",
        function () {
          self.stopAutoplay();
        }
      );

      self.container.addEventListener(
        "mouseleave",
        function () {
          self.startAutoplay();
        }
      );
    }
  };

  /*
   * -------------------------------------------------------
   * Go to ad
   * -------------------------------------------------------
   */
  AdSlot.prototype.goTo = function (i) {
    if (!this.ads.length) {
      return;
    }

    this.index = i;

    if (this.track) {
      this.track.style.transform =
        "translate3d(-" +
        i * 100 +
        "%, 0, 0)";
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

  /*
   * -------------------------------------------------------
   * Next ad
   * -------------------------------------------------------
   */
  AdSlot.prototype.next = function () {
    if (!this.ads.length) {
      return;
    }

    var nextIndex =
      (this.index + 1) %
      this.ads.length;

    this.goTo(nextIndex);
  };

  /*
   * -------------------------------------------------------
   * Start autoplay
   * -------------------------------------------------------
   */
  AdSlot.prototype.startAutoplay =
    function () {
      var self = this;

      self.stopAutoplay();

      if (self.ads.length <= 1) {
        return;
      }

      self.timer =
        window.setInterval(
          function () {
            self.next();
          },
          self.intervalMs
        );
    };

  /*
   * -------------------------------------------------------
   * Stop autoplay
   * -------------------------------------------------------
   */
  AdSlot.prototype.stopAutoplay =
    function () {
      if (this.timer) {
        window.clearInterval(
          this.timer
        );

        this.timer = null;
      }
    };

  /*
   * -------------------------------------------------------
   * Restart autoplay
   * -------------------------------------------------------
   */
  AdSlot.prototype.restartAutoplay =
    function () {
      if (this.ads.length > 1) {
        this.startAutoplay();
      }
    };

  /*
   * -------------------------------------------------------
   * Impression tracking
   * -------------------------------------------------------
   */
  AdSlot.prototype.markImpression =
    function (i) {
      var ad = this.ads[i];

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
          event_type: "impression",
        }
      );
    };

  /*
   * -------------------------------------------------------
   * Visibility tracking
   * -------------------------------------------------------
   */
  AdSlot.prototype.observeVisibility =
    function () {
      var self = this;

      if (
        !(
          "IntersectionObserver" in
          window
        )
      ) {
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
            threshold: 0.5,
          }
        );

      observer.observe(
        self.container
      );

      self.observer = observer;
    };

  /*
   * -------------------------------------------------------
   * Initialize slot
   * -------------------------------------------------------
   */
  AdSlot.prototype.init = function () {
    var self = this;

    return self
      .fetchAds()
      .then(function () {
        self.render();
      });
  };

  /*
   * -------------------------------------------------------
   * Initialize all widgets
   * -------------------------------------------------------
   */
  function initAll(root) {
    injectStylesOnce();

    var containers = (
      root || document
    ).querySelectorAll(
      ".tfe-ad-widget:not([data-tfe-initialized])"
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
            "[tfe-ad-widget] container missing data-vendor or data-placement"
          );

          return;
        }

        container.setAttribute(
          "data-tfe-initialized",
          "true"
        );

        var slot =
          new AdSlot(container);

        slot.init();

        container._tfeAdSlot =
          slot;
      }
    );
  }

  /*
   * -------------------------------------------------------
   * Refresh all initialized widgets
   * -------------------------------------------------------
   */
  function refreshAll(root) {
    var containers = (
      root || document
    ).querySelectorAll(
      ".tfe-ad-widget[data-tfe-initialized]"
    );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        if (
          container._tfeAdSlot
        ) {
          container._tfeAdSlot.stopAutoplay();

          container._tfeAdSlot.init();
        }
      }
    );
  }

  /*
   * -------------------------------------------------------
   * Public API
   * -------------------------------------------------------
   */
  window.TFEAdWidget = {
    init: initAll,
    refresh: refreshAll,
  };

  /*
   * -------------------------------------------------------
   * Auto initialize
   * -------------------------------------------------------
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