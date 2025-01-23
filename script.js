const width = 960;
const height = 600;

const projection = d3.geoMercator()
    .scale(1000) // Adjust the zoom level
    .center([15, 50]) // Adjust the center of the map
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateGnBu)
    .domain([0, 10000]); 

// load geojson and json
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"), // GeoJSON
    d3.json("data/normalized_data_employement.json") // JSON with country values
]).then(([geoData, jsonData]) => {
    const valueMap = new Map(jsonData.map(d => [d.country, d.value]));

    svg.selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("fill", d => {
            const value = valueMap.get(d.properties.name); // Match country name
            return value !== undefined ? colorScale(value) : "#ccc"; // Default color for missing data
        })
        .on("mouseover", function(event, d) {
            const countryName = d.properties.name;
            const value = valueMap.get(countryName) || "No data";
            d3.select(this).style("stroke", "orange").style("stroke-width", 2);

            //  tooltip
            d3.select("#tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`)
                .style("display", "inline-block")
                .html(`<strong>${countryName}</strong><br>Value: ${value}`);
        })
        .on("mouseout", function() {
            d3.select(this).style("stroke", "none");
            d3.select("#tooltip").style("display", "none");
        });

    // add tge legend
    const legendWidth = 300;
    const legendHeight = 10;

    const legendSvg = svg.append("g")
        .attr("transform", `translate(${width / 2 - legendWidth / 2}, ${height - 40})`);

    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

    legendSvg.selectAll("rect")
        .data(d3.range(0, legendWidth))
        .join("rect")
        .attr("x", d => d)
        .attr("y", 0)
        .attr("width", 1)
        .attr("height", legendHeight)
        .attr("fill", d => colorScale(legendScale.invert(d)));

    legendSvg.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .text("Low");

    svg.append("text")
        .attr("x", 10)
        .attr("y", 30)
        .attr("font-size", "20px")
        .attr("font-weight", "bold")

    legendSvg.append("text")
        .attr("x", legendWidth)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .text("High");

    legendSvg.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(5).tickSize(3));
    
    legendSvg.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -15) 
        .attr("text-anchor", "middle") 
        .text("Normalized to labor force population per country STEM Job Creation");

});
