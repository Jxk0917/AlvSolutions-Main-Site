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
  eleventyConfig.addPassthroughCopy({ "Demo Restaurant": "Demo Restaurant" });
  eleventyConfig.addPassthroughCopy({ "Demo Detailer": "Demo Detailer" });

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

  eleventyConfig.addFilter("byFamily", (items, slug) =>
    (items || []).filter((x) => x.family === slug)
  );

  // Every add-on belonging to one service — how the business-cards and
  // shirt-design pages pick up their basic/premium pair without naming the
  // two slugs in the template.
  eleventyConfig.addFilter("byService", (items, slug) =>
    slug ? (items || []).filter((x) => x.service === slug) : []
  );

  eleventyConfig.addFilter("find", (arr, key, value) =>
    (arr || []).find((x) => x[key] === value)
  );

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
