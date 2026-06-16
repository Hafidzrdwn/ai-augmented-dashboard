import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CHART, COLOR, FONT } from '../../styles/tokens';
import { groupByCategory, formatRupiah, formatPct } from '../../utils/dataUtils';
import ChartCard from './ChartCard';
import { useChartResize } from '../../hooks/useChartResize';

export default function CategoryProfitChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const resizeToken = useChartResize(containerRef);

  const byCategory = useMemo(() => groupByCategory(data), [data]);

  const sorted = useMemo(() =>
    [...byCategory].sort((a, b) => a.profit - b.profit),
  [byCategory]);

  const maxProfit = useMemo(() => d3.max(byCategory, d => d.profit), [byCategory]);

  const title = useMemo(() => {
    const losers = byCategory.filter(d => d.profit < 0);
    if (losers.length > 0) {
      const worstCategory = losers.reduce((w, d) => d.profit < w.profit ? d : w, losers[0]);
      return `Kategori ${worstCategory.category} Merugi Rp ${formatRupiah(Math.abs(worstCategory.profit))} — Evaluasi Strategi Diperlukan`;
    }
    const best = byCategory.reduce((b, d) => d.profit > (b?.profit ?? 0) ? d : b, null);
    if (best) {
      return `Kategori ${best.category} Menjadi Pilar Utama Profitabilitas dengan Kontribusi Rp ${formatRupiah(best.profit)}`;
    }
    return 'Distribusi Profit per Kategori Produk';
  }, [byCategory]);

  const chartData = useMemo(() => byCategory.map(d => ({
    category:     d.category,
    profit:       d.profit,
    profitMargin: d.profitMargin,
    avgDiscount:  d.avgDiscount,
  })), [byCategory]);

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
    const H     = Math.max(CHART.height, sorted.length * 52);
    const m     = { top: 8, right: 85, bottom: 16, left: 110 };
    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;

    svg.attr('width', W).attr('height', H);

    const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

    const xExtent = d3.extent(sorted, d => d.profit);
    const xScale  = d3.scaleLinear()
      .domain([Math.min(xExtent[0] * 1.1, 0), xExtent[1] * 1.1])
      .range([0, innerW]);

    const yScale = d3.scaleBand()
      .domain(sorted.map(d => d.category))
      .range([0, innerH])
      .padding(0.35);

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
      .attr('x1', xScale(0)).attr('x2', xScale(0))
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', COLOR.border)
      .attr('stroke-width', 1);

    g.selectAll('.bar')
      .data(sorted)
      .enter()
      .append('rect')
      .attr('x',      d => d.profit < 0 ? xScale(d.profit) : xScale(0))
      .attr('y',      d => yScale(d.category))
      .attr('width',  d => Math.abs(xScale(d.profit) - xScale(0)))
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => {
        if (d.profit < 0)          return COLOR.negative;
        if (d.profit === maxProfit) return COLOR.positive;
        return COLOR.neutral;
      })
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 1.0);
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
              ${d.category}
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Sales:</span>
              <strong style="font-family: monospace;"> Rp ${d.revenue.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Profit:</span>
              <strong style="font-family: monospace; color: ${d.profit >= 0 ? '#60a5fa' : '#f87171'}"> Rp ${d.profit.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Margin:</span>
              <strong style="font-family: monospace;"> ${formatPct(d.profitMargin)}</strong>
            </div>
            <div>
              <span style="color: #94a3b8;">Avg Discount:</span>
              <strong style="font-family: monospace;"> ${formatPct(d.avgDiscount)}</strong>
            </div>
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 0.85);
        tooltip.style('opacity', 0);
      });

    g.selectAll('.label')
      .data(sorted)
      .enter()
      .append('text')
      .attr('x', d => d.profit >= 0 ? xScale(d.profit) + 6 : xScale(0) + 6)
      .attr('y', d => yScale(d.category) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('fill', d => d.profit < 0 ? COLOR.negative : COLOR.textSecondary)
      .attr('font-size', '10px')
      .attr('font-family', FONT.mono)
      .text(d => formatRupiah(d.profit) + ' (' + formatPct(d.profitMargin) + ')');

  }, [sorted, maxProfit, resizeToken]);

  return (
    <ChartCard
      title={title}
      subtitle="Profit bersih & margin per kategori produk"
      chartId="category-profit"
      chartData={chartData}
    >
      <div ref={containerRef} className="relative w-full">
        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      </div>
    </ChartCard>
  );
}
