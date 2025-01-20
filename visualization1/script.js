const width = 928;
const height = width;

// Define hierarchical color scale
const color = d3.scaleLinear()
  .domain([0, 5]) // Adjust the depth range as needed
  .range(["#e0eafc", "#112b3c"])
  .interpolate(d3.interpolateHcl);

// Add Tooltips
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip");

// Chart container
const chartContainer = d3.select("#chart");

// Load the JSON file
d3.json("data/circular_packing_chart.json").then(data => {
  const dropdown = d3.select("#country-filter");
  const countries = data.countries || []; // Use the precomputed list of countries

  // Populate country dropdown dynamically
  dropdown.append("option").attr("value", "all").text("All Countries");
  countries.forEach(country => {
    dropdown.append("option").attr("value", country).text(country);
  });

  dropdown.on("change", function () {
    const selectedCountry = this.value;
    const filteredData = filterByCountry(data, selectedCountry);
    updateVisualization(filteredData);
  });

  updateVisualization(data);

  function filterByCountry(data, country) {
    if (country === "all") return data;

    const filtered = JSON.parse(JSON.stringify(data)); // Deep copy to avoid modifying the original data
    filtered.children = filtered.children.map(industry => {
      industry.children = industry.children.map(jobRole => {
        jobRole.children = jobRole.children.map(toolCategory => {
          toolCategory.children = toolCategory.children.filter(tool =>
            tool.tooltip?.Country && tool.tooltip.Country.includes(country)
          );
          return toolCategory;
        }).filter(toolCategory => toolCategory.children.length > 0);
        return jobRole;
      }).filter(jobRole => jobRole.children.length > 0);
      return industry;
    }).filter(industry => industry.children.length > 0);

    return filtered;
  }

  function updateVisualization(data) {
    chartContainer.selectAll("*").remove(); // Clear existing visualization

    // Increase the padding between circles
    const pack = d3.pack().size([width, height]).padding(10); // Adjust the padding value

    const root = pack(
      d3.hierarchy(data)
        .sum(d => d.size)
        .sort((a, b) => b.size - a.size)
    );

    const svg = chartContainer.append("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    const node = g.selectAll("circle")
      .data(root.descendants())
      .join("circle")
      .attr("fill", d => d.children ? color(d.depth) : "#ffffff")
      .attr("pointer-events", d => d.children ? "all" : "none")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 3);

        let tooltipText = "";
        if (d.depth === 1) {
          tooltipText = `<strong>${d.data.name}</strong><br>
                         Avg. Job Satisfaction: ${d.data.tooltip['Average Job Satisfaction'] || "N/A"}<br>
                         Avg. AI Sentiment: ${d.data.tooltip['Average AI Sentiment'] || "N/A"}`;
        } else if (d.depth === 2) {
          tooltipText = `<strong>${d.parent.data.name} > ${d.data.name}</strong><br>
                         Average Salary: €${d.data.tooltip['Average Salary (All Countries)'] || "N/A"}<br>
                         Avg. Job Satisfaction: ${d.data.tooltip['Average Job Satisfaction'] || "N/A"}<br>
                         Avg. AI Sentiment: ${d.data.tooltip['Average AI Sentiment'] || "N/A"}`;
        } else if (d.depth === 3) {
          tooltipText = `<strong>${d.parent.data.name} > ${d.data.name}</strong>`;
        } else if (d.depth >= 4) {
          tooltipText = `<strong>${d.data.name}</strong><br>Usage Count: ${d.data.size}`;
        }

        tooltip.style("visibility", tooltipText ? "visible" : "hidden")
          .html(tooltipText)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", null).attr("stroke-width", 2);
        tooltip.style("visibility", "hidden");
      })
      .on("click", function (event, d) {
        zoom(event, d);
        event.stopPropagation();
      });

    const label = g.selectAll("text")
      .data(root.descendants())
      .join("text")
      .attr("dy", "0.3em")
      .style("font-size", d => Math.max(10, d.r / 5) + "px") // Dynamic font size based on circle radius
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("text-shadow", "1px 1px 2px rgba(255, 255, 255, 0.8)")
      .attr("text-anchor", "middle")
      .style("fill-opacity", d => {
        if (d.depth === 1) return 1; // Show industry name for outermost circle
        return 0; // Hide all other labels initially
      })
      .text(d => {
        if (d.depth === 1) return d.data.name; // Show industry name for outermost circle
        if (d.depth === 3 || d.depth === 4) return d.data.name; // Show relevant names for tools and job roles
        return d.depth === 2 ? d.data.name : "";
      });

    let focus = root;
    let view;

    function zoomTo(v) {
      const k = width / v[2];
      view = v;

      label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
        .attr("r", d => d.r * k);
    }

    function zoom(event, d) {
      focus = d;

      const transition = svg.transition()
        .duration(750)
        .ease(d3.easeCubicInOut)
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view || [root.x, root.y, root.r * 2], [d.x, d.y, d.r * 2]);
          return t => zoomTo(i(t));
        });

      // Show labels for the current level and its children
      label
        .filter(d => d === focus || d.parent === focus)
        .transition(transition)
        .style("fill-opacity", 1)
        .style("display", "inline");

      // Hide labels for other levels
      label
        .filter(d => d !== focus && d.parent !== focus)
        .transition(transition)
        .style("fill-opacity", 0)
        .on("end", function () {
          d3.select(this).style("display", "none");
        });
    }

    svg.on("click", () => zoom(null, root));
    zoomTo([root.x, root.y, root.r * 2]);
  }
});
