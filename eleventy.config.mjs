import { HtmlBasePlugin } from "@11ty/eleventy";

// Where the site will be served from. Pages link root-absolutely, so serving
// from anywhere other than a domain root needs every URL rewritten.
// "/" is the real deployment; a GitHub Pages project URL lives under
// /<repo>/ and is set from the environment, so switching targets never
// means editing this file.
// Accepted bare ("AlvSolutions") or slashed ("/AlvSolutions/") and normalised
// to the latter. Bare is what CI should pass: a leading slash makes Git Bash
// rewrite the value into a Windows path before Node ever sees it.
const RAW = process.env.PATH_PREFIX || "/";
const PATH_PREFIX =
  RAW === "/" ? "/" : "/" + RAW.replace(new RegExp("^/+|/+$", "g"), "") + "/";

export default function (eleventyConfig) {
  // Rewrites root-absolute href/src/srcset in output HTML to sit under
  // pathPrefix. Without it pathPrefix only affects the `url` filter and
  // every hand-written /assets/... link stays broken.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // styles.css / main.js / shader.js and the images, copied untouched.
  // Eleventy only processes *.html/*.njk; everything else in the input tree
  // needs to be named here or it never reaches the output.
  eleventyConfig.addPassthroughCopy("src/assets");

  // The two demo builds are standalone sites with their own brand and their
  // own CSS. They are not pages of this site and deliberately stay outside
  // src/ — copied verbatim so the "View build" buttons keep working until
  // they have external URLs of their own.
  eleventyConfig.addPassthroughCopy({ "Demo Restaurant": "demo-restaurant" });
eleventyConfig.addPassthroughCopy({ "Demo Detailer": "demo-detailer" });

  // Money, rendered from the one place that knows the placeholder rule: a
  // null price has not been supplied yet and must read as unfinished rather
  // than as free. PLACEHOLDER is greppable in _site/ so nothing ships blank
  // by accident.
  eleventyConfig.addFilter("price", (v) =>
    typeof v === "number"
      ? "$" + v.toLocaleString("en-US")
      : '<span class="ph" title="PLACEHOLDER — price not set">$&mdash;</span>'
  );

  // Same rule for any other unsupplied string.
  eleventyConfig.addFilter("orPlaceholder", (v, what) =>
    v ? v : '<span class="ph">PLACEHOLDER &mdash; ' + (what || "not written yet") + "</span>"
  );

  // The price list carries shapes a flat number cannot express: a range that
  // is genuinely a range, a surcharge added to something else, a floor under
  // a quote, and a service that has no price because it is not for sale yet.
  // All four are deliberate values, not missing ones, so none of them may
  // render as PLACEHOLDER — only `null` does that.
  const dollars = (n) => "$" + n.toLocaleString("en-US");
  eleventyConfig.addFilter("money", (v) => {
    if (typeof v === "number") return dollars(v);
    if (v && typeof v === "object") {
      if (v.soon) return '<span class="tag-soon">Coming soon</span>';
      if (typeof v.plus === "number") return "+" + dollars(v.plus);
      if (typeof v.from === "number" && typeof v.to === "number")
        return dollars(v.from) + " &ndash; " + dollars(v.to);
      if (typeof v.from === "number")
        return '<span class="money-pre">From</span> ' + dollars(v.from);
    }
    return '<span class="ph" title="PLACEHOLDER — price not set">$&mdash;</span>';
  });

  eleventyConfig.addFilter("byFamily", (items, slug) =>
    (items || []).filter((x) => x.family === slug)
  );

  // One group of the standalone price list, by slug. Lets the packages page
  // show the project extras without restating the figures the list already owns.
  eleventyConfig.addFilter("byGroup", (groups, slug) =>
    (groups || []).find((g) => g.slug === slug)
  );

  eleventyConfig.addFilter("find", (arr, key, value) =>
    (arr || []).find((x) => x[key] === value)
  );

  // Sitemap priority by URL, not by page weight in any collection — the hub
  // pages a first-time visitor actually navigates through outrank the two
  // legal pages, which are real and indexed but not worth ranking alongside
  // the offer itself.
  eleventyConfig.addFilter("sitemapPriority", (url) => {
    if (url === "/") return "1.0";
    if (["/services/", "/packages/", "/pricing/", "/work/", "/about/", "/contact/"].includes(url)) return "0.8";
    if (url === "/policies/") return "0.5";
    if (url.startsWith("/legal/")) return "0.3";
    return "0.6";
  });

  // Services listed in a `related` array, resolved to their full objects and
  // kept in the order the page author wrote them.
  eleventyConfig.addFilter("resolve", (arr, all) =>
    (arr || []).map((slug) => (all || []).find((x) => x.slug === slug)).filter(Boolean)
  );

  return {
    pathPrefix: PATH_PREFIX,

    // The layouts are Nunjucks, so the page templates are too. Without this,
    // *.html files parse as Liquid and every {% for %} loop that builds a
    // grid silently renders nothing.
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
