import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { groupByCategory, formatPct, formatRupiah } from '../../utils/dataUtils';
import { COLOR, CHART } from '../../styles/tokens';
import ChartCard from './ChartCard';

export default function ProfitScatterChart({ data }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: CHART.height });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions(prev => ({ ...prev, width: containerRef.current.offsetWidth }));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const title = useMemo(() => {
    const aggregated = groupByCategory(data || []);
    if (!aggregated.length) return 'Analisis Efisiensi Kategori: Hubungan Volume Penjualan & Margin';
    const negativeCategories = aggregated.filter(d => d.profitMargin < 0);
    if (negativeCategories.length > 0) {
      const worst = negativeCategories.reduce((w, d) => d.profitMargin < w.profitMargin ? d : w, negativeCategories[0]);
      return `Kategori ${worst.category} Merugi dengan Margin ${formatPct(worst.profitMargin)} (Revenue Rp ${formatRupiah(worst.revenue)})`;
    }
    const maxMarginItem = aggregated.reduce((max, d) => d.profitMargin > (max?.profitMargin ?? -Infinity) ? d : max, null);
    if (maxMarginItem) {
      return `Kategori ${maxMarginItem.category} Unggul dengan Margin Profit Tertinggi ${formatPct(maxMarginItem.profitMargin)} (Revenue Rp ${formatRupiah(maxMarginItem.revenue)})`;
    }
    return 'Analisis Hubungan Volume Pendapatan terhadap Efisiensi Margin Profit';
  }, [data]);

  useEffect(() => {
    if (dimensions.width === 0) return;

    if (!data || data.length === 0) {
      d3.select(containerRef.current).select('svg').remove();
      const svg = d3.select(containerRef.current)
        .append('svg')
        .attr('width', dimensions.width)
        .attr('height', dimensions.height);
      svg.append('text')
        .attr('x', '50%').attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#52566A')
        .attr('font-size', '12px')
        .text('Tidak ada data untuk filter ini');
      return;
    }

    const aggregated = groupByCategory(data);

    d3.select(containerRef.current).select('svg').remove();

    const margin = { 
      top: CHART.marginTop, 
      right: CHART.marginRight + 25, 
      bottom: CHART.marginBottom + 10, 
      left: CHART.marginLeft + 15 
    };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .style('overflow', 'visible');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

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

    const maxRevenue = d3.max(aggregated, d => d.revenue) || 100000;
    const xScale = d3.scaleLinear()
      .domain([-maxRevenue * 0.05, maxRevenue * 1.1])
      .range([0, innerWidth]);

    const yMax = d3.max(aggregated, d => Math.abs(d.profitMargin)) || 0.1;
    const yDomainLimit = Math.max(0.1, yMax * 1.25); 
    const yScale = d3.scaleLinear()
      .domain([-yDomainLimit, yDomainLimit])
      .range([innerHeight, 0]);

    const rScale = d3.scaleSqrt()
      .domain([0, d3.max(aggregated, d => d.count)])
      .range([4, 16]);

    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(-innerHeight)
      .tickFormat(d => formatRupiah(d));

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(d => (d * 100).toFixed(0) + '%');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', '#F1F5F9'))
      .call(g => g.selectAll('.tick text')
        .attr('fill', COLOR.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
      );

    g.append('g')
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', '#F1F5F9'))
      .call(g => g.selectAll('.tick text')
        .attr('fill', COLOR.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
      );

    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', COLOR.border)
      .attr('stroke-width', 2);

    const nodes = g.selectAll('.scatter-dot')
      .data(aggregated)
      .enter()
      .append('circle')
      .attr('class', 'scatter-dot')
      .attr('cx', d => xScale(d.revenue))
      .attr('cy', d => yScale(d.profitMargin))
      .attr('r', 0)
      .attr('fill', d => d.profitMargin < 0 ? COLOR.negative : COLOR.positive)
      .attr('fill-opacity', 0.6)
      .attr('stroke', d => d.profitMargin < 0 ? COLOR.negative : COLOR.positive)
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill-opacity', 0.95)
          .attr('stroke-width', 2.5);
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
              ${d.category}
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Revenue:</span>
              <strong style="font-family: monospace;"> Rp ${d.revenue.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Profit:</span>
              <strong style="font-family: monospace; color: ${d.profit >= 0 ? '#60a5fa' : '#f87171'}"> Rp ${d.profit.toLocaleString('id-ID')}</strong>
            </div>
            <div style="margin-bottom: 2px;">
              <span style="color: #94a3b8;">Margin:</span>
              <strong style="font-family: monospace; color: ${d.profitMargin >= 0 ? '#60a5fa' : '#f87171'}"> ${formatPct(d.profitMargin)}</strong>
            </div>
            <div>
              <span style="color: #94a3b8;">Transaksi:</span>
              <strong style="font-family: monospace;"> ${d.count} order</strong>
            </div>
          `);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('fill-opacity', 0.6)
          .attr('stroke-width', 1.5);
        tooltip.style('opacity', 0);
      });

    nodes.transition()
      .duration(600)
      .ease(d3.easeBackOut.overshoot(1.5))
      .attr('r', d => rScale(d.count));

    const sortedByRevenue = [...aggregated].sort((a,b) => b.revenue - a.revenue);
    const sortedByMargin = [...aggregated].sort((a,b) => a.profitMargin - b.profitMargin);
    const labelsToShow = new Set([
      ...sortedByRevenue.slice(0, 2).map(d => d.category),
      ...sortedByMargin.slice(0, 2).map(d => d.category)
    ]);

    g.selectAll('.label')
      .data(aggregated.filter(d => labelsToShow.has(d.category)))
      .enter()
      .append('text')
      .attr('x', d => {
        const xPos = xScale(d.revenue);
        if (xPos < 70) return xPos + rScale(d.count) + 8;
        return xPos;
      })
      .attr('y', d => {
        const yPos = yScale(d.profitMargin);
        const dotRadius = rScale(d.count);
        if (yPos - dotRadius - 6 < 15) return yPos + dotRadius + 14;
        return yPos - dotRadius - 6;
      })
      .attr('text-anchor', d => {
        const xPos = xScale(d.revenue);
        if (xPos < 70) return 'start';
        return 'middle';
      })
      .attr('fill', COLOR.textPrimary)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .text(d => d.category)
      .style('opacity', 0)
      .transition()
      .delay(400)
      .duration(400)
      .style('opacity', 1);

    g.append('text')
      .attr('x', innerWidth)
      .attr('y', innerHeight + margin.bottom - 4)
      .attr('text-anchor', 'end')
      .attr('fill', COLOR.textMuted)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('PENDAPATAN (REVENUE) →');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .attr('text-anchor', 'middle')
      .attr('fill', COLOR.textMuted)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text('MARGIN PROFIT (%)');

  }, [data, dimensions]);

  return (
    <ChartCard 
      chartId="scatter-profit"
      title={title}
      chartData={groupByCategory(data || [])}
    >
      <div ref={containerRef} className="relative w-full" style={{ height: CHART.height }} />
    </ChartCard>
  );
}
