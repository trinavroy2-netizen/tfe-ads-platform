/*!
 * TFE Ad Widget — embeddable ad slot for vendor websites
 *
 * No build step.
 * No framework dependency.
 *
 * Features:
 * - Fully responsive
 * - Preserves actual banner aspect ratio
 * - No image cropping
 * - No image stretching
 * - Desktop / tablet / mobile support
 * - Multiple slots per page
 * - Auto rotation
 * - Dot navigation
 * - Impression tracking
 * - Click tracking
 * - IntersectionObserver visibility tracking
 * - ResizeObserver responsive recalculation
 */

(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "http://localhost:8000",
    interval: 4000,
    transition: 600,

    desktopWidth: 1320,
    desktopHeight: 300,
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);

    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "class") {
          e.className = attrs[key];
        } else if (key === "style") {
          e.style.cssText = attrs[key];
        } else {
          e.setAttribute(key, attrs[key]);
        }
      });
    }

    (children || []).forEach(function (child) {
      e.appendChild(child);
    });

    return e;
  }

  function cleanUrl(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  /* =====================================================
     CSS
  ===================================================== */

  function injectStylesOnce() {
    if (qs("#tfe-ad-widget-styles")) {
      return;
    }

    var css = `
      /*
       * TFE AD WIDGET
       *
       * IMPORTANT:
       * The widget does NOT force a fixed height.
       * The image controls the actual height.
       */

      .tfe-ad-widget {
        position: relative;
        display: block;

        width: 100%;
        max-width: 1320px;

        height: auto;
        min-height: 0;

        margin: 0 auto;
        padding: 0;

        box-sizing: border-box;

        background: transparent;

        line-height: 0;

        overflow: hidden;
      }

      /*
       * Carousel track
       *
       * No fixed height.
       */
      .tfe-ad-track {
        display: flex;

        width: 100%;
        height: auto;

        margin: 0;
        padding: 0;

        box-sizing: border-box;

        line-height: 0;

        transition:
          transform 600ms ease-in-out;

        will-change: transform;
      }

      /*
       * Each slide has the width of the widget.
       *
       * Height is NOT forced.
       */
      .tfe-ad-slide {
        position: relative;

        flex: 0 0 100%;

        width: 100%;
        height: auto;

        min-width: 0;
        min-height: 0;

        margin: 0;
        padding: 0;

        box-sizing: border-box;

        overflow: hidden;

        line-height: 0;
      }

      /*
       * Link follows image size.
       *
       * IMPORTANT:
       * Do not force height: 100%.
       */
      .tfe-ad-slide a {
        display: block;

        width: 100%;
        height: auto;

        max-width: 100%;

        margin: 0;
        padding: 0;

        box-sizing: border-box;

        text-decoration: none;

        line-height: 0;

        overflow: hidden;
      }

      /*
       * IMAGE
       *
       * Width shrinks with available space.
       * Height is calculated automatically from
       * the image's natural aspect ratio.
       *
       * Example:
       *
       * 1320 × 300
       * 1000 × 227
       * 768  × 175
       * 390  × 89
       * 320  × 73
       *
       * No crop.
       * No stretch.
       */
      .tfe-ad-slide img {
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

        flex: none;
      }

      /*
       * DOTS
       */
      .tfe-ad-dots {
        position: absolute;

        left: 0;
        right: 0;
        bottom: 8px;

        display: flex;

        justify-content: center;
        align-items: center;

        gap: 6px;

        z-index: 10;

        pointer-events: none;

        line-height: normal;
      }

      .tfe-ad-dot {
        width: 7px;
        height: 7px;

        min-width: 7px;
        min-height: 7px;

        padding: 0;
        margin: 0;

        border: 1px solid rgba(0, 0, 0, 0.15);

        border-radius: 50%;

        background: rgba(255, 255, 255, 0.65);

        cursor: pointer;

        pointer-events: auto;

        box-sizing: border-box;
      }

      .tfe-ad-dot.active {
        background: #1a73e8;
      }

      /*
       * AD LABEL
       */
      .tfe-ad-label {
        position: absolute;

        top: 4px;
        right: 6px;

        z-index: 11;

        font: 10px/1 sans-serif;

        color: rgba(0, 0, 0, 0.35);

        letter-spacing: 0.05em;

        pointer-events: none;
      }

      /*
       * Empty widget
       */
      .tfe-ad-widget:empty {
        display: none;
      }

      /*
       * TABLET
       */
      @media (max-width: 900px) {
        .tfe-ad-widget {
          width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 0;

          border-radius: 6px;
        }

        .tfe-ad-track {
          height: auto;
        }

        .tfe-ad-slide {
          height: auto;
        }

        .tfe-ad-slide a {
          height: auto;
        }

        .tfe-ad-slide img {
          width: 100%;
          height: auto;
          max-width: 100%;
        }

        .tfe-ad-dots {
          bottom: 6px;
        }
      }

      /*
       * MOBILE
       */
      @media (max-width: 650px) {
        .tfe-ad-widget {
          width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 0;

          border-radius: 4px;
        }

        .tfe-ad-track {
          height: auto;
        }

        .tfe-ad-slide {
          height: auto;
        }

        .tfe-ad-slide a {
          height: auto;
        }

        .tfe-ad-slide img {
          width: 100%;
          height: auto;
          max-width: 100%;
        }

        .tfe-ad-dots {
          bottom: 5px;
          gap: 5px;
        }

        .tfe-ad-dot {
          width: 6px;
          height: 6px;

          min-width: 6px;
          min-height: 6px;
        }
      }
    `;

    var style = el("style", {
      id: "tfe-ad-widget-styles",
    });

    style.appendChild(
      document.createTextNode(css)
    );

    document.head.appendChild(style);
  }

  /* =====================================================
     TRACKING
  ===================================================== */

  function sendBeacon(apiBase, body) {
    var url =
      cleanUrl(apiBase) +
      "/api/public/track";

    var json = JSON.stringify(body);

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          url,
          new Blob(
            [json],
            {
              type: "application/json",
            }
          )
        );

        return;
      }
    } catch (e) {
      /* fallback to fetch */
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
        self.ads =
          Array.isArray(data.ads)
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

  /* =====================================================
     APPLY RESPONSIVE SIZE
  ===================================================== */

  AdSlot.prototype.applySizing = function () {
    var self = this;

    var d =
      self.dimensions || {};

    var desktopWidth =
      parseFloat(
        d.desktop_width
      );

    /*
     * Fallback only for maximum width.
     */
    if (
      !isFinite(desktopWidth) ||
      desktopWidth <= 0
    ) {
      desktopWidth =
        DEFAULTS.desktopWidth;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT set aspect-ratio.
     * Do NOT set fixed height.
     *
     * The image's natural dimensions
     * determine the height.
     */

    self.container.style.width =
      "100%";

    self.container.style.maxWidth =
      desktopWidth + "px";

    self.container.style.height =
      "auto";

    self.container.style.minHeight =
      "0";

    self.container.style.boxSizing =
      "border-box";

    self.container.style.overflow =
      "hidden";
  };

  /* =====================================================
     RESIZE OBSERVER
  ===================================================== */

  AdSlot.prototype.setupResizeObserver =
    function () {
      var self = this;

      if (
        !("ResizeObserver" in window)
      ) {
        window.addEventListener(
          "resize",
          function () {
            self.applySizing();
          }
        );

        return;
      }

      if (
        self.resizeObserver
      ) {
        try {
          self.resizeObserver.disconnect();
        } catch (e) {}

        self.resizeObserver = null;
      }

      self.resizeObserver =
        new ResizeObserver(
          function () {
            self.applySizing();
          }
        );

      self.resizeObserver.observe(
        self.container
      );
    };

  /* =====================================================
     RENDER
  ===================================================== */

  AdSlot.prototype.render =
    function () {
      var self = this;

      self.stopAutoplay();

      if (
        self.observer
      ) {
        try {
          self.observer.disconnect();
        } catch (e) {}

        self.observer = null;
      }

      if (
        self.resizeObserver
      ) {
        try {
          self.resizeObserver.disconnect();
        } catch (e) {}

        self.resizeObserver = null;
      }

      self.container.innerHTML = "";

      self.track = null;

      self.dotsWrap = null;

      /*
       * No ads.
       */
      if (
        !self.ads.length
      ) {
        self.container.style.height =
          "0px";

        return;
      }

      /*
       * Apply width only.
       */
      self.applySizing();

      /*
       * Carousel track.
       */
      var track =
        el("div", {
          class: "tfe-ad-track",
        });

      var dotsWrap =
        el("div", {
          class: "tfe-ad-dots",
        });

      self.ads.forEach(
        function (ad, i) {

          /*
           * IMAGE
           */
          var img =
            el(
              "img",
              {
                src:
                  ad.image_url,

                alt:
                  ad.alt_text ||
                  ad.title ||
                  "Advertisement",

                loading:
                  i === 0
                    ? "eager"
                    : "lazy",

                decoding:
                  "async",
              }
            );

          /*
           * IMPORTANT:
           *
           * Natural image ratio.
           */
          img.style.display =
            "block";

          img.style.width =
            "100%";

          img.style.height =
            "auto";

          img.style.maxWidth =
            "100%";

          img.style.minWidth =
            "0";

          img.style.minHeight =
            "0";

          img.style.margin =
            "0";

          img.style.padding =
            "0";

          img.style.border =
            "0";

          img.style.objectFit =
            "contain";

          img.style.objectPosition =
            "center center";

          img.style.boxSizing =
            "border-box";

          /*
           * LINK
           */
          var anchor =
            el(
              "a",
              {
                href:
                  ad.target_url ||
                  "#",

                target:
                  ad.open_in_new_tab
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

          /*
           * CLICK TRACKING
           */
          anchor.addEventListener(
            "click",
            function () {
              sendBeacon(
                self.apiBase,
                {
                  ad_id:
                    ad.id,

                  event_type:
                    "click",
                }
              );
            }
          );

          /*
           * SLIDE
           */
          var slide =
            el(
              "div",
              {
                class:
                  "tfe-ad-slide",
              },
              [anchor]
            );

          track.appendChild(
            slide
          );

          /*
           * DOT NAVIGATION
           */
          if (
            self.ads.length > 1
          ) {
            var dot =
              el(
                "button",
                {
                  class:
                    "tfe-ad-dot" +
                    (
                      i === 0
                        ? " active"
                        : ""
                    ),

                  "aria-label":
                    "Go to ad " +
                    (i + 1),

                  type:
                    "button",
                }
              );

            dot.addEventListener(
              "click",
              function () {
                self.goTo(i);

                self.restartAutoplay();
              }
            );

            dotsWrap.appendChild(
              dot
            );
          }
        }
      );

      /*
       * Add carousel.
       */
      self.container.appendChild(
        track
      );

      /*
       * Add dots.
       */
      if (
        self.ads.length > 1
      ) {
        self.container.appendChild(
          dotsWrap
        );
      }

      /*
       * Ad label.
       */
      self.container.appendChild(
        el(
          "span",
          {
            class:
              "tfe-ad-label",
          },
          [
            document.createTextNode(
              "Ad"
            ),
          ]
        )
      );

      self.track =
        track;

      self.dotsWrap =
        dotsWrap;

      self.index = 0;

      self.goTo(0);

      self.observeVisibility();

      self.setupResizeObserver();

      /*
       * Autoplay.
       */
      if (
        self.ads.length > 1
      ) {
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

  /* =====================================================
     GO TO AD
  ===================================================== */

  AdSlot.prototype.goTo =
    function (i) {
      var self = this;

      if (
        !self.ads.length
      ) {
        return;
      }

      if (i < 0) {
        i = 0;
      }

      if (
        i >= self.ads.length
      ) {
        i =
          self.ads.length - 1;
      }

      self.index = i;

      /*
       * Move carousel.
       */
      if (
        self.track
      ) {
        self.track.style.transform =
          "translate3d(-" +
          (i * 100) +
          "%, 0, 0)";
      }

      /*
       * Update dots.
       */
      if (
        self.dotsWrap
      ) {
        Array.prototype.forEach.call(
          self.dotsWrap.children,
          function (
            dot,
            idx
          ) {
            dot.classList.toggle(
              "active",
              idx === i
            );
          }
        );
      }

      self.markImpression(i);
    };

  /* =====================================================
     NEXT AD
  ===================================================== */

  AdSlot.prototype.next =
    function () {
      var self = this;

      if (
        !self.ads.length
      ) {
        return;
      }

      var nextIndex =
        (
          self.index + 1
        ) %
        self.ads.length;

      self.goTo(
        nextIndex
      );
    };

  /* =====================================================
     START AUTOPLAY
  ===================================================== */

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
            self.next();
          },
          self.intervalMs
        );
    };

  /* =====================================================
     STOP AUTOPLAY
  ===================================================== */

  AdSlot.prototype.stopAutoplay =
    function () {
      if (
        this.timer
      ) {
        window.clearInterval(
          this.timer
        );

        this.timer = null;
      }
    };

  /* =====================================================
     RESTART AUTOPLAY
  ===================================================== */

  AdSlot.prototype.restartAutoplay =
    function () {
      if (
        this.ads.length > 1
      ) {
        this.startAutoplay();
      }
    };

  /* =====================================================
     IMPRESSION TRACKING
  ===================================================== */

  AdSlot.prototype.markImpression =
    function (i) {
      var ad =
        this.ads[i];

      if (
        !ad ||
        this.impressed[ad.id]
      ) {
        return;
      }

      this.impressed[ad.id] =
        true;

      sendBeacon(
        this.apiBase,
        {
          ad_id:
            ad.id,

          event_type:
            "impression",
        }
      );
    };

  /* =====================================================
     VISIBILITY TRACKING
  ===================================================== */

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
          function (
            entries
          ) {
            entries.forEach(
              function (
                entry
              ) {
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

      self.observer =
        observer;
    };

  /* =====================================================
     INITIALIZE SLOT
  ===================================================== */

  AdSlot.prototype.init =
    function () {
      var self = this;

      return self
        .fetchAds()
        .then(
          function () {
            self.render();
          }
        );
    };

  /* =====================================================
     INITIALIZE ALL WIDGETS
  ===================================================== */

  function initAll(root) {
    injectStylesOnce();

    var containers =
      (
        root ||
        document
      ).querySelectorAll(
        ".tfe-ad-widget:not([data-tfe-initialized])"
      );

    Array.prototype.forEach.call(
      containers,
      function (
        container
      ) {
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
          new AdSlot(
            container
          );

        slot.init();

        container._tfeAdSlot =
          slot;
      }
    );
  }

  /* =====================================================
     REFRESH ALL WIDGETS
  ===================================================== */

  function refreshAll(root) {
    var containers =
      (
        root ||
        document
      ).querySelectorAll(
        ".tfe-ad-widget[data-tfe-initialized]"
      );

    Array.prototype.forEach.call(
      containers,
      function (
        container
      ) {
        if (
          container._tfeAdSlot
        ) {
          container._tfeAdSlot.stopAutoplay();

          container._tfeAdSlot.init();
        }
      }
    );
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.TFEAdWidget = {
    init: initAll,
    refresh: refreshAll,
  };

  /* =====================================================
     AUTO INITIALIZE
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