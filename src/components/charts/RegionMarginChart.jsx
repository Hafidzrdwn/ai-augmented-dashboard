import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CHART, COLOR, FONT } from '../../styles/tokens';
import { groupByRegion, formatPct } from '../../utils/dataUtils';
import ChartCard from './ChartCard';
import { useChartResize } from '../../hooks/useChartResize';

export default function RegionMarginChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const resizeToken = useChartResize(containerRef);

  const byRegion = useMemo(() => groupByRegion(data), [data]);

  const stats = useMemo(() => {
    const margins = byRegion.map(r => r.profitMargin);
    if (!margins.length) return { mean: 0, stdDev: 0 };
    const m = margins.reduce((a, b) => a + b, 0) / margins.length;
    const sd = Math.sqrt(margins.reduce((s, v) => s + (v - m) ** 2, 0) / margins.length);
    return { mean: m, stdDev: sd };
  }, [byRegion]);

  const chartData = useMemo(() => ({
    regions: byRegion.map(r => ({
      region:       r.region,
      profitMargin: r.profitMargin,
      revenue:      r.revenue,
    })),
    crossRegionMeanMargin: stats.mean,
    stdDev: stats.stdDev,
  }), [byRegion, stats]);

  const title = useMemo(() => {
    if (!byRegion.length) return 'Margin Profit per Wilayah';
    const outliers = byRegion.filter(r => {
      const z = stats.stdDev > 0 ? (r.profitMargin - stats.mean) / stats.stdDev : 0;
      return z < -1.0;
    });
    if (outliers.length > 0) {
      const worst = outliers.reduce((w, r) => r.profitMargin < w.profitMargin ? r : w, outliers[0]);
      return `Wilayah ${worst.region} Tertinggal dengan Margin ${formatPct(worst.profitMargin)} (Rata-rata: ${formatPct(stats.mean)})`;
    }
    return `Margin Profit Antar Wilayah Relatif Merata di kisaran Rata-rata ${formatPct(stats.mean)}`;
  }, [byRegion, stats]);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      d3.select(svgRef.current)
        .append('text')
        .attr('x', '50%').attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#52566A')
        .attr('font-size', '12px')
        .text('Tidak ada data untuk filter ini');
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W     = containerRef.current ? containerRef.current.clientWidth : svgRef.current.clientWidth;
    const H     = Math.max(CHART.height, byRegion.length * 44);
    const m     = { top: 24, right: 24, bottom: 48, left: 100 };
    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;

    svg.attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

    const allMargins = byRegion.map(d => d.profitMargin);
    const absMax = d3.max(allMargins.map(Math.abs)) || 0.1;
    const xPadding = absMax * 0.3;
    const xMin = Math.min(d3.min(allMargins) - xPadding, -0.01);
    const xMax = Math.max(d3.max(allMargins) + xPadding, 0.01);

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

    const yScale = d3.scaleBand()
      .domain(byRegion.map(d => d.region))
      .range([0, innerH])
      .padding(0.4);

    let tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('color', '#ffffff')
      .style('padding', '10px 14px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('line-height', '1.4')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('box-shadow', '0 4px 6px -1px rgb(0 0 0 / 0.1)')
      .style('z-index', '50')
      .style('transition', 'opacity 0.1s ease');

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text')
        .attr('fill', COLOR.textSecondary)
        .attr('font-size', '11px')
        .attr('font-weight', 500));

    g.append('line')
      .attr('x1', xScale(stats.mean)).attr('x2', xScale(stats.mean))
      .attr('y1', -8).attr('y2', innerH)
      .attr('stroke', COLOR.border)
      .attr('stroke-dasharray', '4,3')
      .attr('stroke-width', 1);

    g.append('text')
      .attr('x', xScale(stats.mean) + 4)
      .attr('y', -2)
      .attr('fill', COLOR.textMuted)
      .attr('font-size', '9px')
      .text('Rata-rata: ' + formatPct(stats.mean));

    if (stats.stdDev > 0) {
      g.append('rect')
        .attr('x', xScale(stats.mean - stats.stdDev))
        .attr('y', 0)
        .attr('width', Math.max(0, xScale(stats.mean + stats.stdDev) - xScale(stats.mean - stats.stdDev)))
        .attr('height', innerH)
        .attr('fill', COLOR.neutral)
        .attr('opacity', 0.08);
    }

    byRegion.forEach(r => {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yScale(r.region) + yScale.bandwidth() / 2)
        .attr('y2', yScale(r.region) + yScale.bandwidth() / 2)
        .attr('stroke', COLOR.border)
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.4);
    });

    const maxMarginValue = d3.max(byRegion, d => d.profitMargin);
    g.selectAll('.dot')
      .data(byRegion)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.profitMargin))
      .attr('cy', d => yScale(d.region) + yScale.bandwidth() / 2)
      .attr('r', 6.5)
      .attr('fill', d => {
        const z = stats.stdDev > 0 ? (d.profitMargin - stats.mean) / stats.stdDev : 0;
        if (z < -1.0) return COLOR.negative;
        if (d.profitMargin === maxMarginValue) return COLOR.positive;
        return COLOR.neutral;
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', 9)
          .attr('stroke-width', 2);
        tooltip.style('opacity', 1);
      })
      .on('mousemove', function(event, d) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        const containerW = containerRef.current.offsetWidth;
        const tooltipW = 210;
        let leftPos = mx + 15;
        if (leftPos + tooltipW > containerW) {
          leftPos = mx - tooltipW - 15;
        }
        tooltip
          .style('left', leftPos + 'px')
          .style('top', (my - 15) + 'px')
          .html(`
            <div style="font-weight: 600; margin-bottom: 4px; border-bottom: 1px solid #475569; padding-bottom: 2px;">
              Wilayah: ${d.region}
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Total Revenue:</span>
              <strong style="font-family: monospace;"> Rp ${d.revenue.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Total Profit:</span>
              <strong style="font-family: monospace; color: ${d.profit >= 0 ? '#60a5fa' : '#f87171'}"> Rp ${d.profit.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span style="color: #94a3b8;">Profit Margin:</span>
              <strong style="font-family: monospace; color: ${d.profitMargin >= 0 ? '#60a5fa' : '#f87171'}"> ${formatPct(d.profitMargin)}</strong>
            </div>
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', 6.5)
          .attr('stroke-width', 1.5);
        tooltip.style('opacity', 0);
      });

    g.selectAll('.mlabel')
      .data(byRegion)
      .enter()
      .append('text')
      .attr('x', d => xScale(d.profitMargin) + 12)
      .attr('y', d => yScale(d.region) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', COLOR.textSecondary)
      .attr('font-size', '10px')
      .attr('font-family', FONT.mono)
      .text(d => formatPct(d.profitMargin));

    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(formatPct).tickSize(0))
      .call(ax => ax.select('.domain').attr('stroke', COLOR.border))
      .call(ax => ax.selectAll('text')
        .attr('fill', COLOR.textMuted)
        .attr('font-size', '10px')
        .attr('dy', '1.2em'));

  }, [byRegion, stats, resizeToken]);

  return (
    <ChartCard
      title={title}
      subtitle="Margin profit per wilayah vs rata-rata lintas wilayah (±1 SD)"
      chartId="region-margin"
      chartData={chartData}
    >
      <div ref={containerRef} className="relative w-full">
        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      </div>
    </ChartCard>
  );
}
