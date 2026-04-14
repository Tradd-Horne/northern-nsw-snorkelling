/* ============================================
   SEARCHING FOR FISH — Main JavaScript
   D3.js interactive visualizations
   ============================================ */

(function () {
    'use strict';

    let DATA = null;

    // --- Fish emoji/icon mapping ---
    const fishIcons = {
        turtle: '\u{1F422}',
        shark: '\u{1F988}',
        ray: '\u{1F420}',
        wrasse: '\u{1F41F}',
        clownfish: '\u{1F420}',
        butterflyfish: '\u{1F41F}',
        damselfish: '\u{1F41F}',
        parrotfish: '\u{1F99C}',
        angelfish: '\u{1F420}',
        surgeonfish: '\u{1F41F}',
        grouper: '\u{1F41F}',
        moray: '\u{1F40D}',
    };

    // --- Load data and init ---
    fetch('data/fish-species.json')
        .then(r => r.json())
        .then(data => {
            DATA = data;
            initSpeciesGrid();
            initBarChart();
            initMap();
            initSeasonalChart();
            initScrollAnimations();
            initModal();
        })
        .catch(err => console.error('Failed to load data:', err));

    // ==========================================
    // PART 1 — Bubble Chart (Fish Groups) - Heart Layout
    // ==========================================
    function initBubbleChart() {
        const container = document.getElementById('viz-bubble-chart');
        container.innerHTML = '';

        const width = Math.min(container.clientWidth, 900);
        const height = Math.max(500, width * 0.6);

        const svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', '600px');

        // Tooltip
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'bubble-tooltip');

        const groups = DATA.fishGroups;

        // Heart shape parametric equation
        // x = 16 * sin^3(t)
        // y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
        function heartX(t) {
            return 16 * Math.pow(Math.sin(t), 3);
        }
        function heartY(t) {
            return -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        }

        // Position bubbles along heart shape
        const centerX = width / 2;
        const centerY = height / 2 + 20;
        const scale = Math.min(width, height) / 50;

        // Sort by count for consistent sizing
        const sortedGroups = [...groups].sort((a, b) => b.count - a.count);

        // Distribute bubbles along heart perimeter
        const positions = sortedGroups.map((group, i) => {
            const t = (i / sortedGroups.length) * 2 * Math.PI - Math.PI / 2;
            return {
                ...group,
                x: centerX + heartX(t) * scale,
                y: centerY + heartY(t) * scale,
                r: Math.sqrt(group.count) * 6 + 20
            };
        });

        const nodes = svg.selectAll('.bubble-group')
            .data(positions)
            .enter()
            .append('g')
            .attr('class', 'bubble-group')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        // Circles
        nodes.append('circle')
            .attr('r', 0)
            .attr('fill', d => d.color)
            .attr('fill-opacity', 0.85)
            .transition()
            .duration(800)
            .delay((d, i) => i * 80)
            .attr('r', d => d.r);

        // Labels
        nodes.append('text')
            .attr('class', 'bubble-label')
            .attr('dy', '-0.2em')
            .text(d => d.name)
            .style('font-size', d => Math.max(9, d.r / 4) + 'px')
            .style('opacity', 0)
            .transition()
            .delay(800)
            .duration(400)
            .style('opacity', 1);

        // Count labels
        nodes.append('text')
            .attr('class', 'bubble-count')
            .attr('dy', '1.1em')
            .text(d => `${d.count} species`)
            .style('font-size', d => Math.max(8, d.r / 5) + 'px')
            .style('opacity', 0)
            .transition()
            .delay(900)
            .duration(400)
            .style('opacity', 1);

        // Hover interactions
        nodes.on('mouseenter', function (event, d) {
            tooltip.html(`
                <h4>${d.name}</h4>
                <p>${d.description}</p>
                <p><span class="tooltip-stat">${d.count} species</span> in this group</p>
            `);
            tooltip.classed('visible', true);

            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            tooltip.style('left', Math.min(x + 15, rect.width - 300) + 'px');
            tooltip.style('top', (y - 10) + 'px');
        })
        .on('mousemove', function (event) {
            const rect = container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            tooltip.style('left', Math.min(x + 15, rect.width - 300) + 'px');
            tooltip.style('top', (y - 10) + 'px');
        })
        .on('mouseleave', function () {
            tooltip.classed('visible', false);
        });
    }

    // ==========================================
    // PART 2 — Species Grid
    // ==========================================
    function initSpeciesGrid() {
        const container = document.getElementById('viz-species-grid');
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'species-grid';

        // Sort alphabetically by common name
        const sorted = [...DATA.topSpecies].sort((a, b) => a.commonName.localeCompare(b.commonName));

        sorted.forEach((species, i) => {
            const card = document.createElement('div');
            card.className = 'species-card fade-in';
            card.style.setProperty('--card-accent', species.color);
            card.style.animationDelay = (i * 50) + 'ms';
            card.dataset.speciesId = species.id;

            const icon = fishIcons[species.group] || '\u{1F41F}';

            card.innerHTML = `
                <div class="species-card-icon" style="background: ${species.color}20;">
                    <span>${icon}</span>
                </div>
                <h4>${species.commonName}</h4>
                <p class="scientific">${species.scientificName}</p>
                <p class="card-stat"><strong>${species.bestSpot}</strong> &middot; ${species.bestSeason}</p>
            `;

            card.addEventListener('click', () => openModal(species));
            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    // ==========================================
    // PART 3 — Bar Chart (Abundance only)
    // ==========================================
    function initBarChart() {
        const container = document.getElementById('viz-bar-chart');
        container.innerHTML = '';

        const margin = { top: 30, right: 30, bottom: 60, left: 130 };
        const width = Math.min(container.clientWidth, 800) - margin.left - margin.right;
        const height = DATA.fishGroups.length * 44;

        const svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Abundance data
        const abundanceScale = {
            'Sharks': 15, 'Rays': 25, 'Sea Turtles': 12, 'Clownfishes': 20,
            'Wrasses': 90, 'Angelfishes': 30, 'Parrotfishes': 45, 'Butterflyfishes': 50,
            'Surgeonfishes': 60, 'Groupers & Cods': 40, 'Damselfishes': 95, 'Moray Eels': 35
        };

        // Sort by abundance (most common first)
        const groups = [...DATA.fishGroups].sort((a, b) =>
            (abundanceScale[b.name] || 30) - (abundanceScale[a.name] || 30)
        );

        // Scales
        const y = d3.scaleBand()
            .domain(groups.map(d => d.name))
            .range([0, height])
            .padding(0.25);

        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        // Axes
        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y).tickSize(0))
            .select('.domain').remove();

        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => d))
            .select('.domain').remove();

        // Axis label
        g.append('text')
            .attr('x', width / 2)
            .attr('y', height + 45)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#5D6D7E')
            .text('How common on the reef (abundance score)');

        const barGroups = g.selectAll('.bar-group')
            .data(groups)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(0, ${y(d.name)})`);

        // Abundance bars
        barGroups.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', y.bandwidth())
            .attr('fill', d => d.color)
            .attr('fill-opacity', 0.85)
            .attr('rx', 3)
            .attr('width', 0)
            .transition()
            .duration(800)
            .delay((d, i) => i * 60)
            .attr('width', d => x(abundanceScale[d.name] || 30));

        // Hover tooltip
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'bubble-tooltip');

        barGroups.on('mouseenter', function (event, d) {
            const abundance = abundanceScale[d.name] || 30;
            tooltip.html(`
                <h4>${d.name}</h4>
                <p>Abundance: <span class="tooltip-stat">${abundance}/100</span></p>
                <p style="margin-top:0.3rem;font-size:0.75rem;">${d.description}</p>
            `);
            tooltip.classed('visible', true);
        })
        .on('mousemove', function (event) {
            const rect = container.getBoundingClientRect();
            tooltip.style('left', Math.min(event.clientX - rect.left + 15, rect.width - 300) + 'px');
            tooltip.style('top', (event.clientY - rect.top - 10) + 'px');
        })
        .on('mouseleave', function () {
            tooltip.classed('visible', false);
        });
    }

    // ==========================================
    // PART 4 — Map
    // ==========================================
    function initMap() {
        const container = document.getElementById('viz-map');
        container.innerHTML = '';

        const mapWrap = document.createElement('div');
        mapWrap.className = 'map-container';

        // SVG map
        const svgWrap = document.createElement('div');
        svgWrap.className = 'map-svg-wrap';

        // Info panel
        const infoPanel = document.createElement('div');
        infoPanel.className = 'map-info-panel';
        infoPanel.innerHTML = `
            <h3 id="map-region-name">Select a location</h3>
            <p class="region-desc" id="map-region-desc">Click any dot on the map to explore the marine life at that snorkelling region.</p>
            <div id="map-spots-label" style="font-size:0.72rem; color:#5D6D7E; margin-bottom:0.3rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; display:none;">Top Spots</div>
            <div id="map-spots" style="font-size:0.82rem; color:#2C3E50; margin-bottom:1rem;"></div>
            <div id="map-species-label" style="font-size:0.72rem; color:#5D6D7E; margin-bottom:0.3rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; display:none;">Top 10 Species</div>
            <ol class="species-list" id="map-species-list"></ol>
        `;

        mapWrap.appendChild(svgWrap);
        mapWrap.appendChild(infoPanel);
        container.appendChild(mapWrap);

        // Draw the coastline map
        const mapWidth = 400;
        const mapHeight = 500;

        const svg = d3.select(svgWrap)
            .append('svg')
            .attr('viewBox', `0 0 ${mapWidth} ${mapHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%');

        // Background ocean
        svg.append('rect')
            .attr('width', mapWidth)
            .attr('height', mapHeight)
            .attr('fill', '#D6EAF8')
            .attr('rx', 12);

        // Simplified coastline path (Northern NSW / SE QLD)
        const coastlinePath = `
            M 280,20
            C 270,40 275,60 265,80
            C 255,100 260,120 250,145
            C 242,165 248,180 240,200
            C 232,220 238,240 230,260
            C 222,280 228,300 220,320
            C 212,340 218,360 210,380
            C 202,400 208,420 200,440
            C 192,460 196,475 190,490
        `;

        // Land mass
        svg.append('path')
            .attr('d', coastlinePath + ' L 400,490 L 400,20 Z')
            .attr('fill', '#C8D6B9')
            .attr('stroke', '#A4B494')
            .attr('stroke-width', 1.5);

        // Coastline
        svg.append('path')
            .attr('d', coastlinePath)
            .attr('fill', 'none')
            .attr('stroke', '#8FB996')
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round');

        // Place regions on map — approximate y-positions along our coast
        const regionPositions = {
            'moreton-bay': { x: 230, y: 60 },
            'north-stradbroke': { x: 210, y: 95 },
            'gold-coast': { x: 225, y: 150 },
            'byron-bay': { x: 215, y: 210 },
            'cook-island': { x: 220, y: 180 },
            'coffs-harbour': { x: 195, y: 340 },
            'solitary-islands': { x: 190, y: 310 },
            'south-west-rocks': { x: 195, y: 400 },
        };

        // Region labels on land
        const labelOffsets = {
            'moreton-bay': { dx: 30, dy: -5 },
            'north-stradbroke': { dx: 25, dy: 15 },
            'gold-coast': { dx: 25, dy: 5 },
            'byron-bay': { dx: 30, dy: 5 },
            'cook-island': { dx: 30, dy: -8 },
            'coffs-harbour': { dx: 25, dy: 5 },
            'solitary-islands': { dx: 20, dy: -12 },
            'south-west-rocks': { dx: 25, dy: 5 },
        };

        DATA.regions.forEach(region => {
            const pos = regionPositions[region.id];
            if (!pos) return;

            const group = svg.append('g')
                .attr('class', 'map-spot')
                .attr('transform', `translate(${pos.x}, ${pos.y})`)
                .style('cursor', 'pointer');

            // Pulse ring
            group.append('circle')
                .attr('r', 18)
                .attr('fill', '#2E86AB')
                .attr('fill-opacity', 0.1)
                .attr('stroke', '#2E86AB')
                .attr('stroke-opacity', 0.3)
                .attr('stroke-width', 1);

            // Main dot
            group.append('circle')
                .attr('r', 8)
                .attr('fill', '#2E86AB')
                .attr('fill-opacity', 0.7)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);

            // Label
            const lo = labelOffsets[region.id] || { dx: 25, dy: 5 };
            group.append('text')
                .attr('x', lo.dx)
                .attr('y', lo.dy)
                .text(region.name)
                .style('font-family', "'Source Sans 3', sans-serif")
                .style('font-size', '11px')
                .style('font-weight', '600')
                .style('fill', '#1A3A4A');

            group.on('click', () => selectRegion(region));
        });

        // QLD / NSW labels
        svg.append('text').attr('x', 340).attr('y', 55)
            .text('QLD').style('font-size', '14px').style('font-weight', '700')
            .style('fill', '#5D6D7E').style('opacity', 0.5);
        svg.append('text').attr('x', 340).attr('y', 250)
            .text('NSW').style('font-size', '14px').style('font-weight', '700')
            .style('fill', '#5D6D7E').style('opacity', 0.5);

        // State border hint
        svg.append('line')
            .attr('x1', 220).attr('y1', 167)
            .attr('x2', 400).attr('y2', 167)
            .attr('stroke', '#5D6D7E').attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4').attr('opacity', 0.3);

        // Ocean label
        svg.append('text').attr('x', 60).attr('y', 250)
            .text('Pacific Ocean').style('font-size', '13px')
            .style('fill', '#5D6D7E').style('opacity', 0.4)
            .style('font-style', 'italic');

        function selectRegion(region) {
            // Update active state
            svg.selectAll('.map-spot').classed('active', false);
            svg.selectAll('.map-spot').each(function () {
                const label = d3.select(this).select('text').text();
                if (label === region.name) {
                    d3.select(this).classed('active', true);
                }
            });

            // Update info panel
            document.getElementById('map-region-name').textContent = region.name;
            document.getElementById('map-region-desc').textContent = region.description;

            const spotsLabel = document.getElementById('map-spots-label');
            const spotsDiv = document.getElementById('map-spots');
            spotsLabel.style.display = 'block';
            spotsDiv.textContent = region.topSpots.join(' \u2022 ');

            const speciesLabel = document.getElementById('map-species-label');
            speciesLabel.style.display = 'block';

            const list = document.getElementById('map-species-list');
            const species = DATA.regionSpecies[region.id] || [];
            list.innerHTML = species.map((s, i) =>
                `<li><span class="species-rank">${i + 1}</span> ${s}</li>`
            ).join('');
        }
    }

    // ==========================================
    // PART 5 — Seasonal Line Chart (Water Temp & Visibility)
    // ==========================================
    function initSeasonalChart() {
        const container = document.getElementById('viz-seasonal');
        container.innerHTML = '';

        const margin = { top: 30, right: 60, bottom: 50, left: 50 };
        const width = Math.min(container.clientWidth, 800) - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        const data = DATA.seasonalData;

        // Scales
        const x = d3.scalePoint()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.5);

        const yTemp = d3.scaleLinear()
            .domain([15, 30])
            .range([height, 0]);

        const yVis = d3.scaleLinear()
            .domain([0, 25])
            .range([height, 0]);

        // Grid lines
        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yTemp).ticks(5).tickSize(-width).tickFormat(''))
            .select('.domain').remove();

        g.selectAll('.axis line')
            .attr('stroke', '#E8E8E8')
            .attr('stroke-dasharray', '2,2');

        // X axis
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x).tickSize(0))
            .select('.domain').remove();

        // Y axis left (temperature)
        g.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yTemp).ticks(5).tickFormat(d => d + '°C'))
            .select('.domain').remove();

        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -38)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#E8735A')
            .text('Water Temperature');

        // Y axis right (visibility)
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${width}, 0)`)
            .call(d3.axisRight(yVis).ticks(5).tickFormat(d => d + 'm'))
            .select('.domain').remove();

        g.append('text')
            .attr('transform', 'rotate(90)')
            .attr('x', height / 2)
            .attr('y', -width - 45)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#1B998B')
            .text('Visibility');

        // Water temp area fill
        const areaTemp = d3.area()
            .x(d => x(d.month))
            .y0(height)
            .y1(d => yTemp(d.waterTemp))
            .curve(d3.curveCardinal.tension(0.4));

        g.append('path')
            .datum(data)
            .attr('d', areaTemp)
            .attr('fill', '#E8735A')
            .attr('fill-opacity', 0.1);

        // Water temp line
        const lineTemp = d3.line()
            .x(d => x(d.month))
            .y(d => yTemp(d.waterTemp))
            .curve(d3.curveCardinal.tension(0.4));

        g.append('path')
            .datum(data)
            .attr('d', lineTemp)
            .attr('fill', 'none')
            .attr('stroke', '#E8735A')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        // Visibility line
        const lineVis = d3.line()
            .x(d => x(d.month))
            .y(d => yVis(d.visibility))
            .curve(d3.curveCardinal.tension(0.4));

        g.append('path')
            .datum(data)
            .attr('d', lineVis)
            .attr('fill', 'none')
            .attr('stroke', '#1B998B')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        // Dots for temperature
        g.selectAll('.dot-temp')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'dot-temp')
            .attr('cx', d => x(d.month))
            .attr('cy', d => yTemp(d.waterTemp))
            .attr('r', 4)
            .attr('fill', '#E8735A')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Top sighting labels
        g.selectAll('.sighting-label')
            .data(data)
            .enter()
            .append('text')
            .attr('x', d => x(d.month))
            .attr('y', d => yTemp(d.waterTemp) - 14)
            .attr('text-anchor', 'middle')
            .style('font-size', '8px')
            .style('fill', '#5D6D7E')
            .style('font-weight', '500')
            .text(d => d.topSighting)
            .style('opacity', 0.7);

        // Tooltip
        const tooltip = d3.select(container)
            .append('div')
            .attr('class', 'seasonal-tooltip');

        // Hover overlay
        const hoverLine = g.append('line')
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', '#aaa')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .style('opacity', 0);

        const overlay = g.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent')
            .style('cursor', 'crosshair');

        overlay.on('mousemove', function (event) {
            const [mx] = d3.pointer(event);
            const months = data.map(d => d.month);
            const xPositions = months.map(m => x(m));
            const idx = d3.minIndex(xPositions, xp => Math.abs(xp - mx));
            const d = data[idx];

            hoverLine.attr('x1', x(d.month)).attr('x2', x(d.month)).style('opacity', 1);

            tooltip.html(`
                <h4>${d.month}</h4>
                <div class="tt-row"><span class="tt-label">Water Temp</span><span class="tt-value" style="color:#E8735A">${d.waterTemp}\u00B0C</span></div>
                <div class="tt-row"><span class="tt-label">Visibility</span><span class="tt-value" style="color:#1B998B">${d.visibility}m</span></div>
                <div class="tt-row"><span class="tt-label">Best Sighting</span><span class="tt-value">${d.topSighting}</span></div>
            `);
            tooltip.classed('visible', true);

            const rect = container.getBoundingClientRect();
            tooltip.style('left', Math.min(event.clientX - rect.left + 15, rect.width - 220) + 'px');
            tooltip.style('top', (event.clientY - rect.top - 10) + 'px');
        })
        .on('mouseleave', function () {
            hoverLine.style('opacity', 0);
            tooltip.classed('visible', false);
        });

        // Legend
        const legend = document.createElement('div');
        legend.className = 'chart-legend';
        legend.innerHTML = `
            <div class="legend-item">
                <div class="legend-swatch" style="background: #E8735A;"></div>
                Water Temperature
            </div>
            <div class="legend-item">
                <div class="legend-swatch" style="background: #1B998B;"></div>
                Visibility (m)
            </div>
        `;
        container.appendChild(legend);
    }

    // ==========================================
    // Modal
    // ==========================================
    function initModal() {
        const overlay = document.getElementById('species-modal');
        const closeBtn = overlay.querySelector('.modal-close');

        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') overlay.classList.remove('active');
        });
    }

    function openModal(species) {
        const overlay = document.getElementById('species-modal');
        const icon = fishIcons[species.group] || '\u{1F41F}';

        document.getElementById('modal-icon').textContent = icon;
        document.getElementById('modal-icon').style.background = species.color + '20';
        document.getElementById('modal-title').textContent = species.commonName;
        document.getElementById('modal-scientific').textContent = species.scientificName;
        document.getElementById('modal-description').textContent = species.description;
        document.getElementById('modal-size').textContent = species.maxSize;
        document.getElementById('modal-diet').textContent = species.diet;
        document.getElementById('modal-spot').textContent = species.bestSpot;
        document.getElementById('modal-season').textContent = species.bestSeason;
        document.getElementById('modal-abundance').textContent = species.abundance;

        const conservationEl = document.getElementById('modal-conservation');
        conservationEl.textContent = species.conservation;
        conservationEl.style.color =
            species.conservation === 'Critically Endangered' ? '#C0392B' :
            species.conservation === 'Endangered' ? '#E74C3C' :
            species.conservation === 'Vulnerable' ? '#F39C12' :
            species.conservation === 'Near Threatened' ? '#F6AE2D' :
            '#27AE60';

        overlay.classList.add('active');
    }

    // ==========================================
    // Scroll animations
    // ==========================================
    function initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

        // Also observe section content for fade-in
        document.querySelectorAll('.section-content').forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    }

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (DATA) {
                initBarChart();
                initSeasonalChart();
            }
        }, 300);
    });

})();
