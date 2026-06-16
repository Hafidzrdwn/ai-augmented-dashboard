import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CHART, COLOR } from '../../styles/tokens';
import { aggregateByMonth, formatRupiah } from '../../utils/dataUtils';
import ChartCard from './ChartCard';
import { useChartResize } from '../../hooks/useChartResize';

export default function RevenueTrendChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const monthly = useMemo(() => aggregateByMonth(data), [data]);
  const resizeToken = useChartResize(containerRef);

  const title = useMemo(() => {
    if (monthly.length < 2) return 'Tren Pendapatan Bulanan';
    const first = monthly[0].revenue;
    const last  = monthly[monthly.length - 1].revenue;
    if (first === 0) return `Pendapatan Terakumulasi Rp ${formatRupiah(last)} pada Bulan Terakhir`;
    const change = (last - first) / first;
    const changePct = (change * 100).toFixed(1).replace('.', ',');
    if (change > 0.15) {
      return `Tren Pendapatan Tumbuh Positif +${changePct}% dari Rp ${formatRupiah(first)} ke Rp ${formatRupiah(last)}`;
    }
    if (change < -0.1) {
      return `Tren Pendapatan Menurun ${changePct}% dari Rp ${formatRupiah(first)} ke Rp ${formatRupiah(last)}`;
    }
    return `Tren Pendapatan Stagnan (${changePct}%) di kisaran Rp ${formatRupiah(last)}`;
  }, [monthly]);

  const chartData = useMemo(() => ({
    totalMonths:   monthly.length,
    avgRevenue:    monthly.reduce((s, d) => s + d.revenue, 0) / (monthly.length || 1),
    maxMonth:      monthly.reduce((m, d) => d.revenue > (m?.revenue ?? 0) ? d : m, null),
    minMonth:      monthly.reduce((m, d) => d.revenue < (m?.revenue ?? Infinity) ? d : m, null),
    latestRevenue: monthly.length ? monthly[monthly.length - 1].revenue : 0,
    firstRevenue:  monthly.length ? monthly[0].revenue : 0,
  }), [monthly]);

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

    const W = containerRef.current ? containerRef.current.clientWidth : svgRef.current.clientWidth;
    const H = CHART.height;
    const m = { top: CHART.marginTop, right: CHART.marginRight, bottom: CHART.marginBottom + 10, left: CHART.marginLeft };
    const innerW = W - m.left - m.right;
    const innerH = H - m.top - m.bottom;

    const g = svg
      .attr('width', W)
      .attr('height', H)
      .append('g')
      .attr('transform', 'translate(' + m.left + ',' + m.top + ')');

    const xScale = d3.scalePoint()
      .domain(monthly.map(d => d.month))
      .range([0, innerW])
      .padding(0.1);

    const yMax = d3.max(monthly, d => d.revenue) * 1.1;
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerH, 0]);

    const meanRevenue = d3.mean(monthly, d => d.revenue);

    const tickInterval = monthly.length > 24 ? 4 : monthly.length > 12 ? 2 : 1;

    let tooltip = d3.select(containerRef.current)
      .selectAll('.d3-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('color', '#ffffff')
      .style('padding', '10px 14px')
      .style('border-radius', '8px')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('line-height', '1.45')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)')
      .style('z-index', '50')
      .style('transition', 'opacity 0.1s ease');

    const xAxis = d3.axisBottom(xScale)
      .tickValues(monthly.filter((_, i) => i % tickInterval === 0).map(d => d.month))
      .tickSize(0);

    g.append('g')
      .attr('transform', 'translate(0,' + innerH + ')')
      .call(xAxis)
      .call(ax => ax.select('.domain').attr('stroke', COLOR.border))
      .call(ax => ax.selectAll('text')
        .attr('fill', COLOR.textMuted)
        .attr('font-size', '10px')
        .attr('dy', '0.7em')
        .attr('dx', '-0.8em')
        .attr('transform', 'rotate(-25)')
        .style('text-anchor', 'end'));

    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickSize(0)
      .tickFormat(v => formatRupiah(v));

    g.append('g')
      .call(yAxis)
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text')
        .attr('fill', COLOR.textMuted)
        .attr('font-size', '10px')
        .attr('dx', '-4px'));

    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', yScale(meanRevenue))
      .attr('y2', yScale(meanRevenue))
      .attr('stroke', COLOR.border)
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1);

    const area = d3.area()
      .x(d => xScale(d.month))
      .y0(innerH)
      .y1(d => yScale(d.revenue))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(monthly)
      .attr('d', area)
      .attr('fill', COLOR.positive)
      .attr('opacity', 0.06);

    const line = d3.line()
      .x(d => xScale(d.month))
      .y(d => yScale(d.revenue))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(monthly)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', COLOR.neutral)
      .attr('stroke-width', 1.5);

    g.selectAll('.dot')
      .data(monthly)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.month))
      .attr('cy', d => yScale(d.revenue))
      .attr('r', monthly.length > 36 ? 2.5 : 4)
      .attr('fill', d => {
        if (d.revenue > meanRevenue * 1.1) return COLOR.positive;
        if (d.revenue < meanRevenue * 0.9) return COLOR.negative;
        return COLOR.neutral;
      })
      .attr('stroke', COLOR.surface)
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', 7)
          .attr('stroke-width', 2);
        tooltip.style('opacity', 1);
      })
      .on('mousemove', function(event, d) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        const containerW = containerRef.current.offsetWidth;
        const tooltipW = 200;
        let leftPos = mx + 15;
        if (leftPos + tooltipW > containerW) {
          leftPos = mx - tooltipW - 15;
        }
        tooltip
          .style('left', leftPos + 'px')
          .style('top', (my - 15) + 'px')
          .html(`
            <div style="font-weight: 600; margin-bottom: 5px; border-bottom: 1px solid #475569; padding-bottom: 3px;">
              Bulan ${d.month}
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Sales:</span>
              <strong style="font-family: monospace;"> Rp ${d.revenue.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Profit:</span>
              <strong style="font-family: monospace; color: ${d.profit >= 0 ? '#60a5fa' : '#f87171'}"> Rp ${d.profit.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span style="color: #94a3b8;">Volume:</span>
              <strong style="font-family: monospace;"> ${d.units.toLocaleString('id-ID')} unit</strong>
            </div>
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', monthly.length > 36 ? 2.5 : 4)
          .attr('stroke-width', 1.5);
        tooltip.style('opacity', 0);
      });

  }, [monthly, resizeToken]);

  return (
    <ChartCard
      title={title}
      subtitle={monthly.length + ' bulan · diperbarui saat filter berubah'}
      chartId="revenue-trend"
      chartData={chartData}
    >
      <div ref={containerRef} className="relative w-full">
        <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
      </div>
    </ChartCard>
  );
}
