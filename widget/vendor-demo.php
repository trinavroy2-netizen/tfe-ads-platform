<?php
/**
 * Example integration for ToolsForEngineers.com (PHP site).
 * Drop this snippet wherever the ad slot should appear (e.g. the homepage
 * template, the Hydro dashboard template, the Solar dashboard template).
 *
 * Only two things change per placement: data-placement and, if you want a
 * different config per section, nothing else — vendor + api key stay the same.
 */
$TFE_ADS_API_BASE = "https://ads-api.mahavirshree.com"; // your production API URL
$TFE_VENDOR_SLUG   = "toolsforengineers";
$TFE_API_KEY       = "REPLACE_WITH_VENDOR_API_KEY"; // issued from the MSI dashboard
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ToolsForEngineers.com — Ad Widget Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

  <h1>Engineering Fields</h1>
  <p>... existing homepage content above ...</p>

  <!-- === TFE Ad Widget: Homepage placement === -->
  <div class="tfe-ad-widget"
       data-vendor="<?php echo htmlspecialchars($TFE_VENDOR_SLUG); ?>"
       data-placement="homepage"
       data-api-key="<?php echo htmlspecialchars($TFE_API_KEY); ?>"
       data-api-base="<?php echo htmlspecialchars($TFE_ADS_API_BASE); ?>">
  </div>
  <!-- === end TFE Ad Widget === -->

  <p>... rest of homepage content below ...</p>

  <!--
    Load the widget script ONCE per page, near the end of <body>.
    It auto-discovers every .tfe-ad-widget container on the page,
    so the Hydro and Solar dashboard templates only need the <div>
    above (with data-placement="hydro" / "solar") — no extra script tag.
  -->
  <script src="<?php echo htmlspecialchars($TFE_ADS_API_BASE); ?>/widget/tfe-ad-widget.js" async></script>

</body>
</html>
