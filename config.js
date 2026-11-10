// Fill these in. Nothing else in the site needs editing to go live.
//
// Dodo Payments dashboard -> Products -> open each product -> copy its checkout / payment link.
// Until a link is set, its button shows a "not set yet" toast instead of navigating.
window.BLAZE_CONFIG = {
  checkout: {
    lifetime: "https://checkout.dodopayments.com/buy/pdt_0NrdKl39MG2JCgY233eMQ?quantity=1", // $89 one-time
    monthly: "https://checkout.dodopayments.com/buy/pdt_0NrdKlBGVThJcIgZhGH0g?quantity=1",  // $8 / month
  },
  download: {
    linux: "",   // e.g. a GitHub Releases asset URL
    windows: "", // leave empty until the Windows build exists
  },
  supportEmail: "workingankush369@gmail.com", // shown in the footer when set
};
