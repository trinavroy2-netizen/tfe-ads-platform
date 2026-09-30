/*!
 * MSI Ads Component — universal embeddable ad slot for ANY vendor's website
 *
 * Universal:
 * PHP, WordPress, Laravel, static HTML, React, etc.
 *
 * Vendor / placement / API key come from data attributes.
 *
 * Example:
 *
 * <div
 *   class="msi-ad-widget"
 *   data-vendor="toolsforengineers"
 *   data-placement="homepage"
 *   data-api-key="YOUR_VENDOR_PUBLIC_API_KEY"
 *   data-api-base="https://YOUR-PRODUCTION-DOMAIN">
 * </div>
 *
 * <script
 *   src="https://YOUR-PRODUCTION-DOMAIN/components/msi-ads-component.js"
 *   defer>
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
   * ------------------------------------------------------------
   * STYLES
   * ------------------------------------------------------------
   *
   * Important:
   * No fixed 300px / 260px / 220px heights.
   *
   * The root uses an aspect ratio.
   * The aspect ratio is updated from the actual image dimensions
   * after the image loads.
   */

  function injectStylesOnce() {
    if (qs("#msi-ad-widget-styles")) return;

    var css =
      ".msi-ad-widget{" +
      "position:relative;" +
      "display:block;" +
      "width:100%;" +
      "max-width:var(--msi-max-width,1320px);" +
      "aspect-ratio:var(--msi-aspect-ratio,4.4);" +
      "height:auto;" +
      "margin:0 auto;" +
      "padding:0;" +
      "overflow:hidden;" +
      "box-sizing:border-box;" +
      "border-radius:8px;" +
      "background:transparent;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-widget:empty{" +
      "display:none;" +
      "}" +

      ".msi-ad-viewport{" +
      "position:absolute;" +
      "inset:0;" +
      "width:100%;" +
      "height:100%;" +
      "margin:0;" +
      "padding:0;" +
      "overflow:hidden;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-track{" +
      "display:flex;" +
      "width:100%;" +
      "height:100%;" +
      "margin:0;" +
      "padding:0;" +
      "transition:transform " +
      DEFAULTS.transition +
      "ms cubic-bezier(.22,.61,.36,1);" +
      "will-change:transform;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-slide{" +
      "position:relative;" +
      "flex:0 0 100%;" +
      "width:100%;" +
      "min-width:100%;" +
      "height:100%;" +
      "min-height:0;" +
      "margin:0;" +
      "padding:0;" +
      "overflow:hidden;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-slide a{" +
      "position:absolute;" +
      "inset:0;" +
      "display:block;" +
      "width:100%;" +
      "height:100%;" +
      "margin:0;" +
      "padding:0;" +
      "overflow:hidden;" +
      "text-decoration:none;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-slide img{" +
      "display:block;" +
      "width:100%;" +
      "height:100%;" +
      "margin:0;" +
      "padding:0;" +
      "border:0;" +
      "outline:0;" +
      "object-fit:cover;" +
      "object-position:center;" +
      "vertical-align:top;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-dots{" +
      "position:absolute;" +
      "left:0;" +
      "right:0;" +
      "bottom:8px;" +
      "display:flex;" +
      "align-items:center;" +
      "justify-content:center;" +
      "gap:6px;" +
      "z-index:5;" +
      "line-height:0;" +
      "}" +

      ".msi-ad-dot{" +
      "width:7px;" +
      "height:7px;" +
      "padding:0;" +
      "border:1px solid rgba(0,0,0,.20);" +
      "border-radius:50%;" +
      "background:rgba(255,255,255,.80);" +
      "cursor:pointer;" +
      "box-sizing:border-box;" +
      "}" +

      ".msi-ad-dot.active{" +
      "width:16px;" +
      "border-radius:999px;" +
      "background:#111;" +
      "}" +

      ".msi-ad-nav{" +
      "position:absolute;" +
      "top:50%;" +
      "transform:translateY(-50%);" +
      "z-index:5;" +
      "display:flex;" +
      "align-items:center;" +
      "justify-content:center;" +
      "width:32px;" +
      "height:32px;" +
      "padding:0;" +
      "border:0;" +
      "border-radius:50%;" +
      "background:rgba(0,0,0,.35);" +
      "color:#fff;" +
      "font-size:18px;" +
      "line-height:1;" +
      "cursor:pointer;" +
      "box-sizing:border-box;" +
      "}" +

      ".msi-ad-nav:hover{" +
      "background:rgba(0,0,0,.60);" +
      "}" +

      ".msi-ad-prev{" +
      "left:8px;" +
      "}" +

      ".msi-ad-next{" +
      "right:8px;" +
      "}" +

      ".msi-ad-label{" +
      "position:absolute;" +
      "top:4px;" +
      "right:6px;" +
      "z-index:5;" +
      "font:10px/1 sans-serif;" +
      "letter-spacing:.05em;" +
      "color:rgba(0,0,0,.40);" +
      "pointer-events:none;" +
      "}" +

      "@media(max-width:650px){" +
      ".msi-ad-widget{" +
      "width:100%;" +
      "max-width:100%;" +
      "border-radius:0;" +
      "}" +

      ".msi-ad-nav{" +
      "width:27px;" +
      "height:27px;" +
      "font-size:16px;" +
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

      ".msi-ad-label{" +
      "top:4px;" +
      "right:5px;" +
      "}" +
      "}" +

      "@media(max-width:380px){" +
      ".msi-ad-nav{" +
      "width:24px;" +
      "height:24px;" +
      "font-size:15px;" +
      "}" +
      "}" +

      "@media(prefers-reduced-motion:reduce){" +
      ".msi-ad-track{" +
      "transition:none;" +
      "}" +
      "}";

    var style = el("style", {
      id: "msi-ad-widget-styles",
    });

    style.appendChild(
      document.createTextNode(css)
    );

    document.head.appendChild(style);
  }

  /*
   * ------------------------------------------------------------
   * TRACKING
   * ------------------------------------------------------------
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
   * ------------------------------------------------------------
   * AD SLOT
   * ------------------------------------------------------------
   */

  function AdSlot(container) {
    this.container = container;

    this.vendor =
      container.getAttribute("data-vendor");

    this.placement =
      container.getAttribute("data-placement");

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

    this.impressed = {};

    this.timer = null;

    this.inView = false;

    this.observer = null;

    /*
     * Store actual image ratios:
     *
     * ad.id -> width / height
     */
    this.imageRatios = {};
  }

  /*
   * ------------------------------------------------------------
   * FETCH ADS
   * ------------------------------------------------------------
   */

  AdSlot.prototype.fetchAds = function () {
    var self = this;

    if (
      !self.container.getAttribute(
        "data-api-base"
      ) &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      console.warn(
        "[msi-ads-component] no data-api-base set on this container - " +
          "falling back to " +
          DEFAULTS.apiBase +
          ". Set data-api-base to your production API URL."
      );
    }

    var url =
      self.apiBase.replace(/\/$/, "") +
      "/api/public/ads?vendor=" +
      encodeURIComponent(self.vendor) +
      "&placement=" +
      encodeURIComponent(self.placement);

    return fetch(url, {
      headers: self.apiKey
        ? {
            "X-API-Key": self.apiKey,
          }
        : {},
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error(
            "MSI Ads Component: request failed (" +
              res.status +
              ")"
          );
        }

        return res.json();
      })
      .then(function (data) {
        self.ads = data.ads || [];

        self.dimensions =
          data.dimensions || {};

        return data;
      })
      .catch(function (err) {
        console.warn(
          "[msi-ad-widget]",
          err.message || err
        );

        self.ads = [];
      });
  };

  /*
   * ------------------------------------------------------------
   * FALLBACK PLACEMENT RATIO
   * ------------------------------------------------------------
   *
   * Example:
   * 1320 / 300 = 4.4
   */

  AdSlot.prototype.getPlacementRatio =
    function () {
      var d = this.dimensions || {};

      var width = Number(
        d.desktop_width
      );

      var height = Number(
        d.desktop_height
      );

      if (
        width > 0 &&
        height > 0
      ) {
        return width / height;
      }

      return 4.4;
    };

  /*
   * ------------------------------------------------------------
   * GET CURRENT IMAGE RATIO
   * ------------------------------------------------------------
   */

  AdSlot.prototype.getCurrentRatio =
    function () {
      var ad =
        this.ads[this.index];

      if (
        ad &&
        this.imageRatios[ad.id] &&
        this.imageRatios[ad.id] > 0
      ) {
        return this.imageRatios[ad.id];
      }

      return this.getPlacementRatio();
    };

  /*
   * ------------------------------------------------------------
   * APPLY RESPONSIVE SIZING
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * No fixed height is applied.
   *
   * Container height comes from aspect-ratio.
   */

  AdSlot.prototype.applySizing =
    function () {
      var d = this.dimensions || {};

      var maxWidth =
        Number(d.desktop_width) > 0
          ? Number(d.desktop_width)
          : 1320;

      var ratio =
        this.getCurrentRatio();

      this.container.style.setProperty(
        "--msi-max-width",
        maxWidth + "px"
      );

      this.container.style.setProperty(
        "--msi-aspect-ratio",
        ratio
      );

      /*
       * Explicitly remove old fixed sizing
       * in case the component is refreshed.
       */
      this.container.style.removeProperty(
        "height"
      );

      this.container.style.removeProperty(
        "min-height"
      );
    };

  /*
   * ------------------------------------------------------------
   * UPDATE CONTAINER RATIO FROM IMAGE
   * ------------------------------------------------------------
   */

  AdSlot.prototype.updateImageRatio =
    function (ad, img) {
      var self = this;

      if (
        !img.naturalWidth ||
        !img.naturalHeight
      ) {
        return;
      }

      var ratio =
        img.naturalWidth /
        img.naturalHeight;

      if (!(ratio > 0)) {
        return;
      }

      self.imageRatios[ad.id] =
        ratio;

      /*
       * Only change container ratio
       * when this image is currently visible.
       */
      if (
        self.ads[self.index] &&
        self.ads[self.index].id === ad.id
      ) {
        self.applySizing();
      }
    };

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  AdSlot.prototype.render = function () {
    var self = this;

    self.container.innerHTML = "";

    if (!self.ads.length) {
      return;
    }

    self.index = 0;

    /*
     * First use placement dimensions as
     * a safe initial fallback.
     */
    self.applySizing();

    var viewport = el("div", {
      class: "msi-ad-viewport",
    });

    var track = el("div", {
      class: "msi-ad-track",
    });

    var dotsWrap = el("div", {
      class: "msi-ad-dots",
    });

    self.ads.forEach(
      function (ad, i) {
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
         * Get actual image dimensions.
         */
        img.addEventListener(
          "load",
          function () {
            self.updateImageRatio(
              ad,
              img
            );
          }
        );

        var anchor = el(
          "a",
          {
            href: ad.target_url,
            target:
              ad.open_in_new_tab
                ? "_blank"
                : "_self",
            rel:
              "noopener noreferrer sponsored",
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
            class:
              "msi-ad-slide",
          },
          [anchor]
        );

        track.appendChild(
          slide
        );

        /*
         * Dots.
         */
        if (
          self.ads.length > 1
        ) {
          var dot = el(
            "button",
            {
              class:
                "msi-ad-dot" +
                (i === 0
                  ? " active"
                  : ""),
              type: "button",
              "aria-label":
                "Go to ad " +
                (i + 1),
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

    viewport.appendChild(
      track
    );

    self.container.appendChild(
      viewport
    );

    /*
     * Navigation.
     */

    if (self.ads.length > 1) {
      var prev = el(
        "button",
        {
          class:
            "msi-ad-nav msi-ad-prev",
          type: "button",
          "aria-label":
            "Previous ad",
        },
        [
          document.createTextNode(
            "\u2039"
          ),
        ]
      );

      var next = el(
        "button",
        {
          class:
            "msi-ad-nav msi-ad-next",
          type: "button",
          "aria-label":
            "Next ad",
        },
        [
          document.createTextNode(
            "\u203a"
          ),
        ]
      );

      prev.addEventListener(
        "click",
        function () {
          self.goTo(
            (self.index -
              1 +
              self.ads.length) %
              self.ads.length
          );

          self.restartAutoplay();
        }
      );

      next.addEventListener(
        "click",
        function () {
          self.goTo(
            (self.index + 1) %
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

    /*
     * Ad label.
     */

    self.container.appendChild(
      el(
        "span",
        {
          class:
            "msi-ad-label",
        },
        [
          document.createTextNode(
            "Ad"
          ),
        ]
      )
    );

    self.track = track;

    self.viewport = viewport;

    self.dotsWrap = dotsWrap;

    self.index = 0;

    self.goTo(0);

    self.observeVisibility();

    /*
     * Autoplay.
     */

    if (self.ads.length > 1) {
      self.startAutoplay();

      self.container.onmouseenter =
        function () {
          self.stopAutoplay();
        };

      self.container.onmouseleave =
        function () {
          self.startAutoplay();
        };
    }
  };

  /*
   * ------------------------------------------------------------
   * GO TO SLIDE
   * ------------------------------------------------------------
   */

  AdSlot.prototype.goTo =
    function (i) {
      this.index = i;

      /*
       * Update aspect ratio for the
       * current image if it has already loaded.
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

      this.markImpression(i);
    };

  /*
   * ------------------------------------------------------------
   * NEXT
   * ------------------------------------------------------------
   */

  AdSlot.prototype.next =
    function () {
      if (!this.ads.length) {
        return;
      }

      var nextIndex =
        (this.index + 1) %
        this.ads.length;

      this.goTo(nextIndex);
    };

  /*
   * ------------------------------------------------------------
   * AUTOPLAY
   * ------------------------------------------------------------
   */

  AdSlot.prototype.startAutoplay =
    function () {
      var self = this;

      self.stopAutoplay();

      if (
        self.ads.length < 2
      ) {
        return;
      }

      self.timer =
        window.setInterval(
          function () {
            /*
             * Don't rotate while browser tab
             * is hidden.
             */
            if (
              document.visibilityState ===
              "hidden"
            ) {
              return;
            }

            /*
             * Don't rotate when slot is not
             * visible in viewport.
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

  /*
   * ------------------------------------------------------------
   * IMPRESSION
   * ------------------------------------------------------------
   */

  AdSlot.prototype.markImpression =
    function (i) {
      var ad =
        this.ads[i];

      if (!this.inView) {
        return;
      }

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
          ad_id: ad.id,
          event_type:
            "impression",
        }
      );
    };

  /*
   * ------------------------------------------------------------
   * VISIBILITY
   * ------------------------------------------------------------
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
        self.inView = true;

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
            threshold: 0.5,
          }
        );

      self.observer =
        observer;

      observer.observe(
        self.container
      );
    };

  /*
   * ------------------------------------------------------------
   * INIT
   * ------------------------------------------------------------
   */

  AdSlot.prototype.init =
    function () {
      var self = this;

      return self
        .fetchAds()
        .then(function () {
          self.render();
        });
    };

  /*
   * ------------------------------------------------------------
   * DESTROY
   * ------------------------------------------------------------
   */

  AdSlot.prototype.destroy =
    function () {
      this.stopAutoplay();

      if (this.observer) {
        this.observer.disconnect();

        this.observer = null;
      }

      this.container.onmouseenter =
        null;

      this.container.onmouseleave =
        null;
    };

  /*
   * ------------------------------------------------------------
   * INIT ALL
   * ------------------------------------------------------------
   */

  function initAll(root) {
    injectStylesOnce();

    var containers =
      (root || document).querySelectorAll(
        ".msi-ad-widget:not([data-msi-initialized])"
      );

    containers.forEach(
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

  /*
   * ------------------------------------------------------------
   * REFRESH ALL
   * ------------------------------------------------------------
   */

  function refreshAll(root) {
    var containers =
      (root || document).querySelectorAll(
        ".msi-ad-widget[data-msi-initialized]"
      );

    containers.forEach(
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

  /*
   * ------------------------------------------------------------
   * DESTROY ALL
   * ------------------------------------------------------------
   */

  function destroyAll(root) {
    var containers =
      (root || document).querySelectorAll(
        ".msi-ad-widget[data-msi-initialized]"
      );

    containers.forEach(
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
   * ------------------------------------------------------------
   * PUBLIC API
   * ------------------------------------------------------------
   */

  window.MSIAdsComponent = {
    init: initAll,
    refresh: refreshAll,
    destroy: destroyAll,
  };

  /*
   * ------------------------------------------------------------
   * AUTO INIT
   * ------------------------------------------------------------
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