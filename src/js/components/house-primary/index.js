var ElementBase = require("../elementBase");
var Retriever = require("../retriever");
require("../results-table");
require("./house-primary.less");
var { mapToElements, toggleAttribute, groupBy } = require("../utils");

class HouseSeat extends ElementBase {
  static get template() {
    return `
      <h4 data-as="seat"></h4>
      <div data-as="results"></div>
    `;
  }
}

HouseSeat.define("house-seat");

class HousePrimary extends ElementBase {
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
          this.fetch.watch(value, this.getAttribute("live") || 15);
        } else {
          this.fetch.once(value);
        }
        break;

      case "live":
        if (typeof value != "string") {
          this.fetch.stop();
        } else {
          this.fetch.start(this.getAttribute("live") || 15);
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

    var results = this.cache.races.map(r => r.results[0])
    var groupedResults = groupBy(results, "seat");
    var seats = Object.keys(groupedResults).map(function(id) {
      return {
        results: groupedResults[id],
        id
      }
    })

    var races = mapToElements(elements.results, seats, "house-seat");

    races.forEach(([race, element]) => {

      var seatElements = element.illuminate();

      seatElements.seat.innerHTML = `District ${race.id}`;

      toggleAttribute(element, "hidden", party && race.party != party);
      // create result tables
      var pairs = mapToElements(seatElements.results, race.results, "results-table");

      // render each one
      var test = !!this.cache.test;
      pairs.forEach(function([data, child]) {
        if (href) child.setAttribute("href", href);
        if (max) child.setAttribute("max", max);
        toggleAttribute(child, "test", test);
        child.render(data);
      });
    });
  }

  static get template() {
    return `
<div class="chatter" data-as="chatter"></div>
<div class="results" data-as="results"></div>
<p class="footnote" data-as="footnote"></p>
    `;
  }
}

HousePrimary.define("house-primary");