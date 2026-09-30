<?php
/**
 * Example integration for a PHP vendor site (e.g. ToolsForEngineers.com,
 * or any future vendor onboarded onto the MSI Ads Platform).
 *
 * The three values below are the ONLY vendor-specific things in this file.
 * A second vendor's integration looks identical except for these three
 * lines - nothing about the component itself changes per vendor.
 */
$MSI_ADS_API_BASE = "https://YOUR-PRODUCTION-DOMAIN"; // your production API URL
$MSI_VENDOR_SLUG   = "toolsforengineers";              // this vendor's slug (from the dashboard)
$MSI_API_KEY       = "REPLACE_WITH_VENDOR_PUBLIC_API_KEY"; // issued from the MSI dashboard's Vendors page
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vendor Ad Widget Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

  <h1>Homepage</h1>
  <p>... existing homepage content above ...</p>

  <!-- === MSI Ads Component: "homepage" placement === -->
  <div class="msi-ad-widget"
       data-vendor="<?php echo htmlspecialchars($MSI_VENDOR_SLUG); ?>"
       data-placement="homepage"
       data-api-key="<?php echo htmlspecialchars($MSI_API_KEY); ?>"
       data-api-base="<?php echo htmlspecialchars($MSI_ADS_API_BASE); ?>">
  </div>
  <!-- === end MSI Ads Component === -->

  <p>... rest of homepage content below ...</p>

  <!--
    Load the component ONCE per page, near the end of <body>. It
    auto-discovers every .msi-ad-widget container on the page, so a
    second placement on this same page (e.g. data-placement="hydro" on
    a dashboard template) needs only its own <div> - no extra script tag.
    A different vendor's site uses the exact same script tag and file;
    only the data-vendor / data-api-key values on its <div> differ.
  -->
  <script src="<?php echo htmlspecialchars($MSI_ADS_API_BASE); ?>/components/msi-ads-component.js" defer></script>

</body>
</html>
