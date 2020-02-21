var ElementBase = require("../elementBase");
var Retriever = require("../retriever");
require("./president-results");

class PresidentPrimary extends ElementBase {
  constructor() {
    super();
    this.fetch = new Retriever(this.load);
  }

  static get boundMethods() {
    return ["load"];
  }

  static get observedAttributes() {
    return ["src", "href", "live", "party"];
  }

  attributeChangedCallback(attr, old, value) {

    switch (attr) {
      case "src":
        if (this.hasAttribute("live")) {
          this.fetch.watch(value, this.getAttribute("refresh") || 15);
        } else {
          this.fetch.once(value);
        }
        break;

      case "live":
        if (typeof value != "string") {
          this.fetch.stop();
        } else {
          this.fetch.start(this.getAttribute("refresh") || 15);
        }
        break;

      default:
        this.render();
    }
  }

  load(data) {
    this.cache = data;
    this.render();
  }

  render() {
    var elements = this.illuminate();

    if (!this.cache) return;
    var { races, chatter, footnote } = this.cache;

    elements.chatter.innerHTML = chatter || "";
    elements.footnote.innerHTML = footnote || "";

    var href = this.getAttribute("href");
    var max = this.getAttribute("max");
    var party = this.getAttribute("party");

    var pairs = this.mapToElements(elements.results, races, "president-results");
    pairs.forEach(function([data, child]) {
      if (party && data.party != party) {
        child.setAttribute("hidden", "");
      } else {
        child.removeAttribute("hidden");
      }
      if (href) child.setAttribute("href", href);
      if (max) child.setAttribute("max", max);
      child.render(data);
    });

    // set the test flag
    if (this.cache.test) {
      children.forEach(c => c.setAttribute("test", ""));
    } else {
      children.forEach(c => c.removeAttribute("test"));
    }
  }

  static get template() {
    return `
<div class="chatter" data-as="chatter"></div>
<div class="results" data-as="results"></div>
<p class="footnote" data-as="footnote"></p>
    `
  }
}

PresidentPrimary.define("president-primary");
