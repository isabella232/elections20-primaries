var ElementBase = require("../elementBase");
var Retriever = require("../retriever");
var $ = require("../../lib/qsa");
var track = require("../../lib/tracking");
require("../results-table");
require("../county-map");
require("./county-detail.less");

var { formatAPDate, formatTime, groupBy, mapToElements, toggleAttribute } = require("../utils");

var fips = require("../../../../data/fips.sheet.json");

var colors = ["#bb77c7", "#92c777", "#eaaa61"];

class CountyDetail extends ElementBase {

  constructor() {
    super();
    this.fetch = new Retriever(this.load);
    this.palette = {};
    this.addEventListener("map-click", function(e) {
      var fips = e.detail.fips;
      track("click-county", fips);
      var elements = this.illuminate();
      elements.countySelect.value = fips;
      this.updateTable(fips);
    });
  }

  static get boundMethods() {
    return ["load", "onSelectCounty"];
  }

  static get observedAttributes() {
    return ["src", "party", "live", "map"];
  }

  static get mirroredProps() {
    return ["src"];
  }

  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "src":
        this.fetch.watch(value, this.getAttribute("live") || 60);
        break;

      case "party":
        this.render();
        break;

      case "live":
        if (typeof value == "string") {
          this.fetch.start(value);
        } else {
          this.fetch.stop();
        }
        break;

      case "map":
        var elements = this.illuminate();
        elements.map.src = value;
        break;
    }
  }

  load(data) {
    this.cache = data;
    this.render();
  }

  render() {
    var elements = this.illuminate();
    var data = this.cache;
    if (!data) return;
    var { races, test } = data;

    var party = this.getAttribute("party");

    // filter races by type - no weird alignments
    var [ race ] = races.filter(r => r.party == party && r.type && !r.type.match(/alignment/i));

    var results = race.results;
    var counties = {};
    var fips = {};
    var totals = {};
    results.forEach(function(r) {
      var top = null;
      r.candidates.forEach(function(candidate) {
        if (!totals[candidate.id]) totals[candidate.id] = {
          first: candidate.first,
          last: candidate.last,
          id: candidate.id,
          votes: 0
        };
        totals[candidate.id].votes += candidate.votes;
        if (!top || candidate.percentage > top.percentage) {
          top = candidate;
        }
        delete candidate.winner;
      });
      if (r.reportingPercentage == 100) {
        top.winner = true;
      }
      counties[r.county] = r.fips;
      fips[r.fips] = r.county;
    });

    // for future map use: determine the palette by statewide total position
    var statewide = Object.values(totals);
    statewide.sort((a, b) => b.votes - a.votes);

    console.log(statewide.slice(0, colors.length))

    var palette = {};
    var includeOther = statewide.length > colors.length ? true : false;
    statewide.slice(0, colors.length).forEach(function(s, i) {
      palette[s.id] = {
        order: i,
        id: s.id,
        first: s.first,
        last: s.last,
        color: colors[i]
      };
    });

    palette.other = {
      last: "Other",
      color: "#787878",
      order: 999
    }

    elements.map.render(palette, race.results);

    counties = Object.keys(counties).sort().map(county => ({ county, id: counties[county] }));
    // counties.unshift({ county: "--", id: 0 });
    mapToElements(elements.countySelect, counties, function(data) {
      var option = document.createElement("option");
      option.innerHTML = data.county.replace(/\s[a-z]/g, match => match.toUpperCase());
      option.value = data.id;
      return option;
    });

    var value = elements.countySelect.value;
    elements.map.highlightCounty(value);
    this.updateTable(value);
  }

  updateTable(fips) {
    if (fips == 0) return;
    var elements = this.illuminate();
    var { resultsTable } = elements;
    var data = this.cache;
    var party = this.getAttribute("party");
    if (!data || !party) return;

    var { races } = data;
    // filter races by type - no weird alignments
    var [ race ] = races.filter(r => r.party == party && r.type && !r.type.match(/alignment/i));
    var [ result ] = race.results.filter(r => r.fips == fips);

    resultsTable.setAttribute("headline", result.county);
    resultsTable.setAttribute("max", 99);
    if (result) resultsTable.render(result);
  }

  static get template() {
    return require("./_template.html");
  }

  onSelectCounty() {
    var elements = this.illuminate();
    var fips = elements.countySelect.value;
    track("select-county", fips);
    this.updateTable(fips);
    elements.map.highlightCounty(fips);
  }

  illuminate() {
    var elements = super.illuminate();
    elements.countySelect.addEventListener("change", this.onSelectCounty);
    return elements;
  }

}

CountyDetail.define("county-detail");