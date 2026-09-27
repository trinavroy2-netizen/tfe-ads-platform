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
 */

(function (window, document) {
  "use strict";

  var DEFAULTS = {
    apiBase: "http://localhost:8000",
    interval: 4000,
    transition: 600
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
      .tfe-ad-widget {
        position: relative;
        display: block;
        width: 100%;
        max-width: 1320px;
        margin: 0 auto;
        padding: 0;
        box-sizing: border-box;
        background: transparent;
        line-height: 0;
        overflow: hidden;
      }

      .tfe-ad-track {
        position: relative;
        display: block;
        width: 100%;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        line-height: 0;
      }

      .tfe-ad-slide {
        position: absolute;
        top: 0;
        left: 0;

        display: block;

        width: 100%;
        height: 100%;

        margin: 0;
        padding: 0;

        box-sizing: border-box;

        opacity: 0;
        visibility: hidden;

        transition:
          opacity 600ms ease-in-out,
          visibility 600ms ease-in-out;

        line-height: 0;
      }

      .tfe-ad-slide.active {
        position: relative;

        opacity: 1;
        visibility: visible;

        z-index: 2;
      }

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
      }

      .tfe-ad-slide img {
        display: block;

        width: 100%;
        max-width: 100%;

        height: auto;

        min-width: 0;
        min-height: 0;

        margin: 0;
        padding: 0;

        border: 0;

        box-sizing: border-box;

        object-fit: contain;
        object-position: center;

        vertical-align: top;
      }

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

      .tfe-ad-widget:empty {
        display: none;
      }

      @media (max-width: 1320px) {
        .tfe-ad-widget {
          width: 100%;
          max-width: 100%;
        }
      }

      @media (max-width: 900px) {
        .tfe-ad-widget {
          width: 100%;
          max-width: 100%;
          border-radius: 6px;
        }

        .tfe-ad-dots {
          bottom: 6px;
        }
      }

      @media (max-width: 650px) {
        .tfe-ad-widget {
          width: 100%;
          max-width: 100%;
          border-radius: 4px;
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
      id: "tfe-ad-widget-styles"
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
              type: "application/json"
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
        "Content-Type": "application/json"
      },
      body: json,
      keepalive: true
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

    this.slideRatios = [];
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
     GET DEFAULT ASPECT RATIO
     
     Placement is normally 1320 x 300.
     
     ratio = width / height
  ===================================================== */

  AdSlot.prototype.getDefaultRatio = function () {
    var d = this.dimensions || {};

    var width = parseFloat(
      d.desktop_width
    );

    var height = parseFloat(
      d.desktop_height
    );

    if (
      width > 0 &&
      height > 0
    ) {
      return width / height;
    }

    return 1320 / 300;
  };

  /* =====================================================
     APPLY RESPONSIVE SIZE
     
     IMPORTANT:
     
     We never set a fixed height based on:
       mobile_height
       tablet_height
       desktop_height
     
     Instead the widget follows the original
     advertisement aspect ratio.
  ===================================================== */

  AdSlot.prototype.applySizing = function () {
    var self = this;

    var d = self.dimensions || {};

    var desktopWidth =
      parseFloat(d.desktop_width);

    if (
      !isFinite(desktopWidth) ||
      desktopWidth <= 0
    ) {
      desktopWidth = 1320;
    }

    self.container.style.width = "100%";

    self.container.style.maxWidth =
      desktopWidth + "px";

    self.container.style.boxSizing =
      "border-box";

    self.container.style.overflow =
      "hidden";

    /*
     * The height is controlled dynamically
     * from the actual image ratio.
     */
    self.updateContainerHeight();
  };

  /* =====================================================
     CALCULATE CURRENT IMAGE HEIGHT
     
     Example:
     
     1320 / (1320 / 300) = 300
     1000 / (1320 / 300) = 227.27
      768 / (1320 / 300) = 174.54
      390 / (1320 / 300) = 88.63
      320 / (1320 / 300) = 72.73
  ===================================================== */

  AdSlot.prototype.updateContainerHeight =
    function () {
      var self = this;

      if (
        !self.ads.length
      ) {
        self.container.style.height =
          "0px";

        return;
      }

      var currentAd =
        self.ads[self.index];

      var ratio =
        self.getDefaultRatio();

      if (
        currentAd &&
        currentAd._tfeRatio &&
        isFinite(currentAd._tfeRatio) &&
        currentAd._tfeRatio > 0
      ) {
        ratio =
          currentAd._tfeRatio;
      }

      var width =
        self.container.clientWidth;

      if (
        !width ||
        width <= 0
      ) {
        return;
      }

      var height =
        width / ratio;

      self.container.style.height =
        Math.ceil(height) + "px";
    };

  /* =====================================================
     READ ACTUAL IMAGE RATIO
     
     This makes the widget work even if an ad
     has a slightly different image dimension.
  ===================================================== */

  AdSlot.prototype.loadImageRatios =
    function () {
      var self = this;

      self.ads.forEach(function (ad) {
        if (
          ad._tfeRatio
        ) {
          return;
        }

        if (
          !ad.image_url
        ) {
          return;
        }

        var image =
          new Image();

        image.onload =
          function () {
            if (
              image.naturalWidth > 0 &&
              image.naturalHeight > 0
            ) {
              ad._tfeRatio =
                image.naturalWidth /
                image.naturalHeight;

              if (
                self.index ===
                self.ads.indexOf(ad)
              ) {
                self.updateContainerHeight();
              }
            }
          };

        image.src =
          ad.image_url;
      });
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
            self.updateContainerHeight();
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
            self.updateContainerHeight();
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

      self.slideRatios = [];

      if (
        !self.ads.length
      ) {
        self.container.style.height =
          "0px";

        return;
      }

      self.applySizing();

      /*
       * Track is used only as a wrapper.
       * Slides are stacked instead of being
       * horizontally translated.
       *
       * This prevents flex layout from affecting
       * image height on small screens.
       */

      var track =
        el("div", {
          class: "tfe-ad-track"
        });

      var dotsWrap =
        el("div", {
          class: "tfe-ad-dots"
        });

      self.ads.forEach(
        function (ad, i) {
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
                  "async"
              }
            );

          /*
           * Explicit image rules.
           *
           * NEVER crop.
           * NEVER force height.
           */

          img.style.display =
            "block";

          img.style.width =
            "100%";

          img.style.maxWidth =
            "100%";

          img.style.height =
            "auto";

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
            "center";

          img.style.boxSizing =
            "border-box";

          /*
           * Get exact image ratio
           * when browser loads it.
           */

          img.addEventListener(
            "load",
            function () {
              if (
                img.naturalWidth > 0 &&
                img.naturalHeight > 0
              ) {
                ad._tfeRatio =
                  img.naturalWidth /
                  img.naturalHeight;

                if (
                  self.index === i
                ) {
                  self.updateContainerHeight();
                }
              }
            }
          );

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
                  "Advertisement"
              },
              [img]
            );

          anchor.addEventListener(
            "click",
            function () {
              sendBeacon(
                self.apiBase,
                {
                  ad_id:
                    ad.id,

                  event_type:
                    "click"
                }
              );
            }
          );

          var slide =
            el(
              "div",
              {
                class:
                  "tfe-ad-slide" +
                  (
                    i === 0
                      ? " active"
                      : ""
                  )
              },
              [anchor]
            );

          track.appendChild(
            slide
          );

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
                    "button"
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

      self.container.appendChild(
        track
      );

      if (
        self.ads.length > 1
      ) {
        self.container.appendChild(
          dotsWrap
        );
      }

      self.container.appendChild(
        el(
          "span",
          {
            class:
              "tfe-ad-label"
          },
          [
            document.createTextNode(
              "Ad"
            )
          ]
        )
      );

      self.track =
        track;

      self.dotsWrap =
        dotsWrap;

      self.index = 0;

      self.goTo(0);

      self.loadImageRatios();

      self.observeVisibility();

      self.setupResizeObserver();

      /*
       * Start autoplay only when
       * multiple advertisements exist.
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

      if (
        i < 0
      ) {
        i = 0;
      }

      if (
        i >= self.ads.length
      ) {
        i =
          self.ads.length - 1;
      }

      self.index = i;

      if (
        self.track
      ) {
        Array.prototype.forEach.call(
          self.track.children,
          function (slide, idx) {
            slide.classList.toggle(
              "active",
              idx === i
            );
          }
        );
      }

      if (
        self.dotsWrap
      ) {
        Array.prototype.forEach.call(
          self.dotsWrap.children,
          function (dot, idx) {
            dot.classList.toggle(
              "active",
              idx === i
            );
          }
        );
      }

      /*
       * Resize container according to
       * the current advertisement.
       */

      self.updateContainerHeight();

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
            "impression"
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
            threshold: 0.5
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

  /* =====================================================
     PUBLIC API
  ===================================================== */

  window.TFEAdWidget = {
    init: initAll,
    refresh: refreshAll
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