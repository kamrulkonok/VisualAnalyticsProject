const width = 928;
const height = width;

// Define hierarchical color scales
const colorScales = {
  1: d3.scaleOrdinal(d3.schemeCategory10), // Industry level
  2: d3.scaleOrdinal(d3.schemeTableau10), // Job Role level
  3: {
    "Programming Language": d3.scaleOrdinal(d3.schemeSet3),
    "Databases": d3.scaleOrdinal(d3.schemePastel1),
    "AI Tool": d3.scaleOrdinal(d3.schemeDark2),
    "Platforms": d3.scaleOrdinal(d3.schemePaired),
    "Web Frameworks": d3.scaleOrdinal(d3.schemeAccent),
    "IDE Tool": d3.scaleOrdinal(d3.schemeSet2),
    "Office Stack Tool": d3.scaleOrdinal(d3.schemeSet1)
  },
  4: d3.scaleSequential(d3.interpolateGreens) // Leaf nodes
};

// Add Tooltips using d3-tip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "rgba(0, 0, 0, 0.7)")
  .style("color", "#fff")
  .style("padding", "5px 10px")
  .style("border-radius", "5px")
  .style("visibility", "hidden")
  .style("font-family", "Roboto, Arial, sans-serif")
  .style("font-size", "14px")
  .style("line-height", "1.4");

// Load the JSON file from your local machine
d3.json("data/d3_data.json").then(data => {
  const pack = d3.pack()
      .size([width, height])
      .padding(3);

  // Update the root definition to accurately count unique job roles
  const root = pack(
    d3.hierarchy(data)
      .sum(d => {
        if (d.children) {
          const uniqueJobRoles = new Set();
          d.children.forEach(jobRole => {
            if (!jobRole.children) {
              // Direct job role without further categorization
              uniqueJobRoles.add(jobRole.name);
            } else {
              // Job role with associated technologies/tools
              jobRole.children.forEach(techCategory => {
                uniqueJobRoles.add(jobRole.name); // Add job role once, regardless of tech/tools
              });
            }
          });
          return uniqueJobRoles.size; // Aggregate unique job roles
        }
        return d.value || 0;
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0)) // Sort by aggregated size
  );

  const svg = d3.select("#chart")
      .append("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("background", "#ffffff") // Set pure white background
      .style("border-radius", "10px");

  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants())
    .join("circle")
      .attr("fill", d => {
        const depth = d.depth;
        if (depth === 1) return colorScales[1](d.data.name); // Industry
        if (depth === 2) return colorScales[2](d.data.name); // Job Roles
        if (depth === 3) {
          const categoryName = d.parent.data.name;
          const scale = colorScales[3][categoryName];
          return scale ? scale(d.data.name) : "#ccc"; // Default fallback
        }
        if (depth >= 4) return colorScales[4](d.size || 0); // Leaf Nodes
        return "white";
      })
      .attr("pointer-events", d => d.children ? "all" : "none")
      .attr("stroke", null) // No border initially
      .attr("stroke-width", 2) // Stroke width for hover effect
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#6366f1") // Highlight border color
          .attr("stroke-width", 3);

        let tooltipText = "";

        if (d.depth === 1) {
          tooltipText = `${d.data.name}`; // Industry name only
        } else if (d.depth === 2) {
          tooltipText = `${d.parent.data.name} > ${d.data.name}`; // Job Role with count
        } else if (d.depth === 3) {
          tooltipText = `${d.parent.data.name} > ${d.data.name}`; // Category > Tools
        } else if (d.depth >= 4) {
          tooltipText = `${d.data.name}: ${d.value || d.size || 0}`; // Specific tools with counts
        }

        tooltip.style("visibility", tooltipText ? "visible" : "hidden")
          .text(tooltipText)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke", null) // Remove border on mouse out
          .attr("stroke-width", 2);

        tooltip.style("visibility", "hidden");
      })
      .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

  const label = svg.append("g")
    .style("font", "14px Roboto, Arial, sans-serif")
    .style("fill", "#2c3e50")
    .style("font-weight", "500")  
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
      .attr("dy", "0.3em")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .text(d => {
        const sizeLabel = d.data.value ? ` (${d.data.value})` : ""; // Append size to name
        return `${d.data.name}${sizeLabel}`;
      });

  let focus = root;
  let view;

  svg.on("click", () => zoom(null, root));
  zoomTo([root.x, root.y, root.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k); // Dynamically adjust circle radius
  }

  function zoom(event, d) {
    focus = d;

    const transition = svg.transition()
        .duration(1850) // duration for smoother transition
        .ease(d3.easeCubicInOut) // Apply easing function for smoother movement
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
      .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
      .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
  }
});
