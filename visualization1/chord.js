(function () {
  const width = 800;
  const height = width;
  const innerRadius = Math.min(width, height) * 0.40 - 30;
  const outerRadius = innerRadius + 15;

  // Custom color scale
  const color = d3.scaleOrdinal([
    "#ffb6c1", "#add8e6", "#90ee90", "#f0e68c", "#dda0dd",
    "#ffa07a", "#20b2aa", "#87cefa", "#9370db", "#ffc107",
    "#6495ed", "#ff69b4", "#6b8e23", "#ff8c00", "#48d1cc"
  ]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(50, 50, 50, 0.8)")
    .style("color", "white")
    .style("padding", "10px")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("z-index", "10");

  // Create the SVG container
  const svg = d3.select("#second-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "font: 12px sans-serif;");

  const respondentFilter = d3.select("#respondent-filter");

  // Load the CSV data
  d3.csv("data/chord_data.csv").then(data => {
    if (!data || data.length === 0) {
      console.error("No data found in the CSV file.");
      return;
    }

    const respondentTypes = Array.from(new Set(data.map(d => d.RespondentType)));
    respondentFilter
      .selectAll("option")
      .data(respondentTypes)
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    function updateVisualization(selectedType) {
      const filteredData = data.filter(d => d.RespondentType === selectedType);

      const names = Array.from(new Set(filteredData.flatMap(d => [d.Source, d.Target])));
      const index = new Map(names.map((name, i) => [name, i]));

      const matrix = Array.from(index, () => new Array(names.length).fill(0));
      for (const { Source, Target, ConnectionCount } of filteredData) {
        const sourceIndex = index.get(Source);
        const targetIndex = index.get(Target);
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          matrix[sourceIndex][targetIndex] += +ConnectionCount;
        }
      }

      const chord = d3.chord().padAngle(15 / innerRadius).sortSubgroups(d3.descending);

      const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

      const ribbon = d3.ribbonArrow().radius(innerRadius - 5);

      svg.selectAll("*").remove();

      const chords = chord(matrix);

      svg.append("g")
        .attr("class", "ribbons")
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", ribbon)
        .attr("fill", d => color(names[d.target.index]))
        .attr("stroke", d => d3.rgb(color(names[d.target.index])).darker())
        .attr("opacity", 0.4) 
        .on("mouseover", function (event, d) {
          svg.selectAll(".ribbons path").attr("opacity", 0.1);
          d3.select(this).attr("opacity", 1);

          tooltip.style("visibility", "visible")
            .html(
              `${matrix[d.source.index][d.target.index]} people who worked with <b>${names[d.source.index]}</b> want to work with <b>${names[d.target.index]}</b>`
            );
        })
        .on("mousemove", event => {
          tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function () {
          svg.selectAll(".ribbons path").attr("opacity", 0.4); // Reset opacity
          tooltip.style("visibility", "hidden");
        });

      const group = svg.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

      group.append("path")
        .attr("d", arc)
        .attr("fill", d => color(names[d.index]))
        .attr("stroke", "#fff");

      group.append("text")
        .each(d => (d.angle = (d.startAngle + d.endAngle) / 2))
        .attr("dy", "0.35em")
        .attr("transform", d => {
          const rotate = (d.angle * 180) / Math.PI - 90;
          return `
            rotate(${rotate})
            translate(${outerRadius + 10})
            rotate(${rotate > 90 ? 180 : 0})
          `;
        })
        .attr("text-anchor", d => (d.angle > Math.PI ? "end" : "start"))
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(d => {
          const label = names[d.index];
          return label.length > 15 ? `${label.substring(0, 12)}...` : label;
        })
        .append("title") // Tooltip for full name
        .text(d => names[d.index]);
    }

    updateVisualization(respondentTypes[0]);

    respondentFilter.on("change", function () {
      const selectedType = d3.select(this).property("value");
      updateVisualization(selectedType);
    });
  }).catch(error => {
    console.error("Error loading or parsing data:", error);
  });
})();
