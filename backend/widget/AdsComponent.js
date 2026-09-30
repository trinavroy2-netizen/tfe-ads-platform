/*!
 * MSI Ads Component
 * Reusable advertising component for vendor websites.
 *
 * No framework dependency.
 * No build step required.
 *
 * Vendor only provides:
 * - data-vendor
 * - data-placement
 * - data-api-key
 *
 * MSI controls:
 * - advertisements
 * - images
 * - target URLs
 * - active/inactive status
 * - schedules
 * - carousel behavior
 * - tracking
 */

(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "https://tfe-ads-backend.onrender.com",
    interval: 4000,
    transition: 600,
    maxWidth: 1320,
    visibilityThreshold: 0.5
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  function cleanUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  function createElement(tag, attrs, children) {
    var element = document.createElement(tag);

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "class") {
          element.className = attrs[key];
        } else if (key === "style") {
          element.style.cssText = attrs[key];
        } else {
          element.setAttribute(key, attrs[key]);
        }
      });
    }

    (children || []).forEach(function (child) {
      if (child) {
        element.appendChild(child);
      }
    });

    return element;
  }

  function injectStyles() {
    if (document.getElementById("msi-ads-component-styles")) {
      return;
    }

    var css = `
      .msi-ad-widget {
        position: relative;
        display: block;
        width: 100%;
        max-width: 1320px;
        height: auto;
        min-height: 0;
        margin: 0 auto;
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        background: transparent;
        line-height: 0;
        border-radius: 8px;
      }

      .msi-ad-track {
        display: flex;
        width: 100%;
        height: auto;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        line-height: 0;
        will-change: transform;
      }

      .msi-ad-slide {
        position: relative;
        flex: 0 0 100%;
        width: 100%;
        min-width: 0;
        height: auto;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        line-height: 0;
        border-radius: 8px;
      }

      .msi-ad-slide a {
        display: block;
        width: 100%;
        height: auto;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        line-height: 0;
        text-decoration: none;
        border-radius: 8px;
      }

      .msi-ad-slide img {
        display: block;
        width: 100%;
        height: auto;
        max-width: 100%;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
        box-sizing: border-box;
        object-fit: contain;
        object-position: center center;
        vertical-align: top;
        border-radius: 8px;
      }

      .msi-ad-dots {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 8px;
        z-index: 10;

        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;

        pointer-events: none;
        line-height: normal;
      }

      .msi-ad-dot {
        width: 7px;
        height: 7px;
        min-width: 7px;
        min-height: 7px;

        margin: 0;
        padding: 0;

        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 50%;

        background: rgba(255, 255, 255, 0.65);

        cursor: pointer;
        pointer-events: auto;

        box-sizing: border-box;
      }

      .msi-ad-dot.active {
        background: #1a73e8;
      }

      .msi-ad-label {
        position: absolute;
        top: 4px;
        right: 6px;
        z-index: 11;

        font: 10px/1 sans-serif;
        letter-spacing: 0.05em;

        color: rgba(0, 0, 0, 0.35);

        pointer-events: none;
      }

      .msi-ad-widget:empty {
        display: none;
      }

      @media (max-width: 900px) {
        .msi-ad-widget,
        .msi-ad-slide,
        .msi-ad-slide a,
        .msi-ad-slide img {
          border-radius: 6px;
        }

        .msi-ad-widget {
          width: 100%;
          max-width: 100%;
        }

        .msi-ad-dots {
          bottom: 6px;
        }
      }

      @media (max-width: 650px) {
        .msi-ad-widget,
        .msi-ad-slide,
        .msi-ad-slide a,
        .msi-ad-slide img {
          border-radius: 4px;
        }

        .msi-ad-widget {
          width: 100%;
          max-width: 100%;
        }

        .msi-ad-dots {
          bottom: 5px;
          gap: 5px;
        }

        .msi-ad-dot {
          width: 6px;
          height: 6px;
          min-width: 6px;
          min-height: 6px;
        }
      }
    `;

    var style = createElement("style", {
      id: "msi-ads-component-styles"
    });

    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  /* =====================================================
     TRACKING
  ===================================================== */

  function track(apiBase, apiKey, adId, eventType) {
    if (!apiBase || !adId || !eventType) {
      return;
    }

    var url =
      cleanUrl(apiBase) +
      "/api/public/track";

    var payload = JSON.stringify({
      ad_id: adId,
      event_type: eventType
    });

    /*
     * sendBeacon cannot reliably send
     * X-API-Key, so use fetch when a key exists.
     */

    if (apiKey) {
      try {
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey
          },
          body: payload,
          keepalive: true
        }).catch(function () {});

        return;
      } catch (error) {
        return;
      }
    }

    /*
     * No API key.
     * This path is mainly a fallback.
     */

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob(
            [payload],
            {
              type: "application/json"
            }
          )
        );
      }
    } catch (error) {}
  }

  /* =====================================================
     AD SLOT
  ===================================================== */

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

    this.ads = [];
    this.index = 0;

    this.trackElement = null;
    this.dotsElement = null;

    this.timer = null;

    this.observer = null;
    this.resizeObserver = null;

    this.impressed = {};
    this.visible = false;

    this.mouseOver = false;
  }

  /* =====================================================
     FETCH ADS
  ===================================================== */

  AdSlot.prototype.fetchAds = function () {
    var self = this;

    var url =
      cleanUrl(self.apiBase) +
      "/api/public/ads?vendor=" +
      encodeURIComponent(self.vendor) +
      "&placement=" +
      encodeURIComponent(self.placement);

    return fetch(url, {
      method: "GET",
      headers: self.apiKey
        ? {
            "X-API-Key": self.apiKey
          }
        : {}
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Ads request failed: " +
              response.status
          );
        }

        return response.json();
      })
      .then(function (data) {
        self.ads =
          Array.isArray(data.ads)
            ? data.ads
            : [];

        return data;
      })
      .catch(function (error) {
        console.warn(
          "[msi-ads-component]",
          error.message || error
        );

        self.ads = [];

        return null;
      });
  };

  /* =====================================================
     RESPONSIVE SIZE
  ===================================================== */

  AdSlot.prototype.applySizing = function () {
    var width = DEFAULTS.maxWidth;

    this.container.style.width = "100%";
    this.container.style.maxWidth =
      width + "px";

    /*
     * Height intentionally remains auto.
     * The actual banner image controls height.
     */

    this.container.style.height = "auto";
    this.container.style.minHeight = "0";
    this.container.style.boxSizing =
      "border-box";
    this.container.style.overflow =
      "hidden";
  };

  /* =====================================================
     RESIZE OBSERVER
  ===================================================== */

  AdSlot.prototype.setupResizeObserver =
    function () {
      var self = this;

      if (!("ResizeObserver" in window)) {
        window.addEventListener(
          "resize",
          function () {
            self.applySizing();
          }
        );

        return;
      }

      if (self.resizeObserver) {
        self.resizeObserver.disconnect();
      }

      self.resizeObserver =
        new ResizeObserver(function () {
          self.applySizing();
        });

      self.resizeObserver.observe(
        self.container
      );
    };

  /* =====================================================
     IMPRESSION
  ===================================================== */

  AdSlot.prototype.markImpression =
    function (index) {
      var self = this;
      var ad = self.ads[index];

      if (!ad || self.impressed[ad.id]) {
        return;
      }

      /*
       * Only count impressions after
       * IntersectionObserver confirms visibility.
       */

      if (!self.visible) {
        return;
      }

      self.impressed[ad.id] = true;

      track(
        self.apiBase,
        self.apiKey,
        ad.id,
        "impression"
      );
    };

  /* =====================================================
     VISIBILITY OBSERVER
  ===================================================== */

  AdSlot.prototype.observeVisibility =
    function () {
      var self = this;

      if (
        !("IntersectionObserver" in window)
      ) {
        self.visible = true;
        self.markImpression(
          self.index
        );

        return;
      }

      if (self.observer) {
        self.observer.disconnect();
      }

      self.observer =
        new IntersectionObserver(
          function (entries) {
            entries.forEach(
              function (entry) {
                if (
                  entry.isIntersecting &&
                  entry.intersectionRatio >=
                    DEFAULTS.visibilityThreshold
                ) {
                  self.visible = true;

                  self.markImpression(
                    self.index
                  );
                } else {
                  self.visible = false;
                }
              }
            );
          },
          {
            threshold:
              DEFAULTS.visibilityThreshold
          }
        );

      self.observer.observe(
        self.container
      );
    };

  /* =====================================================
     GO TO
  ===================================================== */

  AdSlot.prototype.goTo = function (index) {
    var self = this;

    if (!self.ads.length) {
      return;
    }

    if (index < 0) {
      index = 0;
    }

    if (index >= self.ads.length) {
      index = self.ads.length - 1;
    }

    self.index = index;

    if (self.trackElement) {
      self.trackElement.style.transition =
        "transform " +
        DEFAULTS.transition +
        "ms ease-in-out";

      self.trackElement.style.transform =
        "translate3d(-" +
        index * 100 +
        "%, 0, 0)";
    }

    if (self.dotsElement) {
      Array.prototype.forEach.call(
        self.dotsElement.children,
        function (dot, dotIndex) {
          var active =
            dotIndex === index;

          dot.classList.toggle(
            "active",
            active
          );

          dot.setAttribute(
            "aria-current",
            active
              ? "true"
              : "false"
          );
        }
      );
    }

    /*
     * If the widget is currently visible,
     * count the newly displayed ad.
     */

    self.markImpression(index);
  };

  /* =====================================================
     NEXT
  ===================================================== */

  AdSlot.prototype.next = function () {
    if (!this.ads.length) {
      return;
    }

    this.goTo(
      (this.index + 1) %
        this.ads.length
    );
  };

  /* =====================================================
     AUTOPLAY
  ===================================================== */

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
            if (!self.mouseOver) {
              self.next();
            }
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
      this.startAutoplay();
    };

  /* =====================================================
     RENDER
  ===================================================== */

  AdSlot.prototype.render = function () {
    var self = this;

    self.stopAutoplay();

    if (self.observer) {
      self.observer.disconnect();
      self.observer = null;
    }

    if (self.resizeObserver) {
      self.resizeObserver.disconnect();
      self.resizeObserver = null;
    }

    self.container.innerHTML = "";

    self.trackElement = null;
    self.dotsElement = null;

    self.visible = false;

    /*
     * No active ads.
     */

    if (!self.ads.length) {
      self.container.style.display =
        "none";
      self.container.style.height =
        "0px";

      return;
    }

    self.container.style.display =
      "block";

    self.applySizing();

    var track =
      createElement("div", {
        class: "msi-ad-track"
      });

    var dots =
      createElement("div", {
        class: "msi-ad-dots"
      });

    self.ads.forEach(
      function (ad, index) {
        var image =
          createElement("img", {
            src: ad.image_url,
            alt:
              ad.alt_text ||
              ad.title ||
              "Advertisement",
            loading:
              index === 0
                ? "eager"
                : "lazy",
            decoding: "async"
          });

        var targetUrl =
          ad.target_url ||
          ad.click_url ||
          "#";

        var anchor =
          createElement(
            "a",
            {
              href: targetUrl,
              target:
                ad.open_in_new_tab === false
                  ? "_self"
                  : "_blank",
              rel:
                "noopener noreferrer sponsored",
              "aria-label":
                ad.title ||
                "Advertisement"
            },
            [image]
          );

        anchor.addEventListener(
          "click",
          function () {
            track(
              self.apiBase,
              self.apiKey,
              ad.id,
              "click"
            );
          }
        );

        var slide =
          createElement(
            "div",
            {
              class: "msi-ad-slide"
            },
            [anchor]
          );

        track.appendChild(slide);

        if (self.ads.length > 1) {
          var dot =
            createElement(
              "button",
              {
                class:
                  "msi-ad-dot" +
                  (index === 0
                    ? " active"
                    : ""),
                type: "button",
                "aria-label":
                  "Go to ad " +
                  (index + 1),
                "aria-current":
                  index === 0
                    ? "true"
                    : "false"
              }
            );

          dot.addEventListener(
            "click",
            function () {
              self.goTo(index);
              self.restartAutoplay();
            }
          );

          dots.appendChild(dot);
        }
      }
    );

    self.container.appendChild(track);

    if (self.ads.length > 1) {
      self.container.appendChild(dots);
    }

    self.container.appendChild(
      createElement(
        "span",
        {
          class: "msi-ad-label"
        },
        [
          document.createTextNode(
            "Ad"
          )
        ]
      )
    );

    self.trackElement = track;
    self.dotsElement = dots;
    self.index = 0;

    self.goTo(0);

    self.observeVisibility();
    self.setupResizeObserver();

    if (self.ads.length > 1) {
      self.startAutoplay();

      self.container.addEventListener(
        "mouseenter",
        function () {
          self.mouseOver = true;
        }
      );

      self.container.addEventListener(
        "mouseleave",
        function () {
          self.mouseOver = false;
        }
      );
    }
  };

  /* =====================================================
     INIT
  ===================================================== */

  AdSlot.prototype.init = function () {
    var self = this;

    return self
      .fetchAds()
      .then(function () {
        self.render();
      });
  };

  /* =====================================================
     INITIALIZE ALL
  ===================================================== */

  function initAll(root) {
    injectStyles();

    var context =
      root || document;

    var containers =
      context.querySelectorAll(
        ".msi-ad-widget:not([data-msi-initialized])"
      );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        var vendor =
          container.getAttribute(
            "data-vendor"
          );

        var placement =
          container.getAttribute(
            "data-placement"
          );

        if (!vendor || !placement) {
          console.warn(
            "[msi-ads-component] Missing data-vendor or data-placement."
          );

          return;
        }

        container.setAttribute(
          "data-msi-initialized",
          "true"
        );

        var slot =
          new AdSlot(container);

        container._msiAdSlot =
          slot;

        slot.init();
      }
    );
  }

  /* =====================================================
     REFRESH
  ===================================================== */

  function refreshAll(root) {
    var context =
      root || document;

    var containers =
      context.querySelectorAll(
        ".msi-ad-widget[data-msi-initialized]"
      );

    Array.prototype.forEach.call(
      containers,
      function (container) {
        if (container._msiAdSlot) {
          container._msiAdSlot.init();
        }
      }
    );
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.MSIAds = {
    init: initAll,
    refresh: refreshAll
  };

  /* =====================================================
     AUTO INIT
  ===================================================== */

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