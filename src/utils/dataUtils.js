import React from 'react';
import * as d3 from 'd3';

export function parseSalesData(csvString) {
  return d3.csvParse(csvString, function(d) {
    var date = new Date(d.OrderDate);
    var month = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');

    return {
      id: d.SalesOrderID,
      orderDate: date,
      month: month,
      region: d.Territory || d.CountryRegion || 'Unknown',
      category: d.Category,
      subCategory: d.SubCategory,
      segment: d.Segment,
      city: d.City,
      units: +d.Qty || 0,
      unitPrice: +d.UnitPrice || 0,
      revenue: +d.Sales || 0,
      discount: +d.Discount || 0,
      productCost: +d.ProductCost || 0,
      totalCost: +d.TotalCost || 0,
      profit: +d.Profit || 0,
    };
  });
}

export function filterData(data, filters) {
  if (!filters) return data;
  return data.filter(function(d) {
    if (filters.region && filters.region !== 'All' && d.region !== filters.region) return false;
    if (filters.category && filters.category !== 'All' && d.category !== filters.category) return false;
    if (filters.subCategory && filters.subCategory !== 'All' && d.subCategory !== filters.subCategory) return false;
    if (filters.segment && filters.segment !== 'All' && d.segment !== filters.segment) return false;
    if (filters.city && filters.city !== 'All' && d.city !== filters.city) return false;
    return true;
  });
}

export function calcSummaryStats(data) {
  var totalRevenue = data.reduce(function(s, d) { return s + d.revenue; }, 0);
  var totalProfit  = data.reduce(function(s, d) { return s + d.profit; }, 0);
  var totalUnits   = data.reduce(function(s, d) { return s + d.units; }, 0);
  
  var discountedRows = data.filter(function(d) { return d.discount > 0; });
  var avgDiscount = discountedRows.length
    ? discountedRows.reduce(function(s, d) { return s + d.discount; }, 0) / discountedRows.length
    : 0;
    
  var discountedRatio = data.length
    ? discountedRows.length / data.length
    : 0;
    
  var profitMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  return { totalRevenue, totalProfit, totalUnits, avgDiscount, discountedRatio, profitMargin };
}

export function aggregateByMonth(data) {
  var map = {};
  data.forEach(function(d) {
    if (!map[d.month]) map[d.month] = { month: d.month, revenue: 0, profit: 0, units: 0, count: 0 };
    map[d.month].revenue += d.revenue;
    map[d.month].profit  += d.profit;
    map[d.month].units   += d.units;
    map[d.month].count   += 1;
  });
  return Object.values(map).sort(function(a, b) { return a.month.localeCompare(b.month); });
}

export function aggregateByMonthCategory(data) {
  var map = {};
  data.forEach(function(d) {
    var key = d.month + '||' + d.category;
    if (!map[key]) map[key] = { month: d.month, category: d.category, revenue: 0, profit: 0, units: 0, count: 0 };
    map[key].revenue += d.revenue;
    map[key].profit  += d.profit;
    map[key].units   += d.units;
    map[key].count   += 1;
  });
  return Object.values(map).sort(function(a, b) { return a.month.localeCompare(b.month); });
}

export function aggregateByMonthRegion(data) {
  var map = {};
  data.forEach(function(d) {
    var key = d.month + '||' + d.region;
    if (!map[key]) map[key] = { month: d.month, region: d.region, revenue: 0, profit: 0 };
    map[key].revenue += d.revenue;
    map[key].profit  += d.profit;
  });
  return Object.values(map).sort(function(a, b) { return a.month.localeCompare(b.month); });
}

export function groupByCategory(data) {
  var map = {};
  data.forEach(function(d) {
    if (!map[d.category]) map[d.category] = { category: d.category, revenue: 0, profit: 0, discount: 0, count: 0, discountedCount: 0 };
    map[d.category].revenue  += d.revenue;
    map[d.category].profit   += d.profit;
    map[d.category].discount += d.discount;
    map[d.category].count    += 1;
    if (d.discount > 0) {
      map[d.category].discountedCount += 1;
    }
  });
  return Object.values(map).map(function(d) {
    return Object.assign({}, d, {
      avgDiscount: d.discountedCount > 0 ? d.discount / d.discountedCount : 0,
      profitMargin: d.revenue > 0 ? d.profit / d.revenue : 0,
      discountedRatio: d.count > 0 ? d.discountedCount / d.count : 0,
    });
  });
}

export function groupByRegion(data) {
  var map = {};
  data.forEach(function(d) {
    if (!map[d.region]) map[d.region] = { region: d.region, revenue: 0, profit: 0 };
    map[d.region].revenue += d.revenue;
    map[d.region].profit  += d.profit;
  });
  return Object.values(map).map(function(d) {
    return Object.assign({}, d, {
      profitMargin: d.revenue > 0 ? d.profit / d.revenue : 0,
    });
  });
}

export function calcMoMStats(data) {
  var monthly = aggregateByMonth(data);
  if (monthly.length < 2) {
    return { current: calcSummaryStats(data), previous: null, months: [] };
  }

  var last = monthly[monthly.length - 1];
  var secondLast = monthly[monthly.length - 2];

  var isLastIncomplete = secondLast.revenue > 0 && last.revenue < secondLast.revenue * 0.10;

  var curr, prev;
  if (isLastIncomplete && monthly.length >= 3) {
    curr = secondLast;
    prev = monthly[monthly.length - 3];
  } else {
    curr = last;
    prev = secondLast;
  }

  var currData = data.filter(function(d) { return d.month === curr.month; });
  var prevData = data.filter(function(d) { return d.month === prev.month; });

  return {
    current: calcSummaryStats(currData),
    previous: calcSummaryStats(prevData),
    months: [prev.month, curr.month],
  };
}

export function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function formatRupiah(value) {
  var abs = Math.abs(value);
  if (abs >= 1000000000) return (value / 1000000000).toFixed(1).replace('.', ',') + ' M';
  if (abs >= 1000000) return (value / 1000000).toFixed(1).replace('.', ',') + ' Jt';
  if (abs >= 1000) return (value / 1000).toFixed(1).replace('.', ',') + ' Rb';
  return value.toFixed(0);
}

export function formatPct(value) {
  return (value * 100).toFixed(1).replace('.', ',') + '%';
}

export function buildCompressedChatbotContext(filteredData, anomalies) {
  var stats = calcSummaryStats(filteredData);
  
  var catProfitMap = {};
  var catSalesMap = {};
  groupByCategory(filteredData).forEach(function(cat) {
    catProfitMap[cat.category] = Math.round(cat.profit);
    catSalesMap[cat.category] = Math.round(cat.revenue);
  });

  var regionProfitMap = {};
  var regionSalesMap = {};
  groupByRegion(filteredData).forEach(function(reg) {
    regionProfitMap[reg.region] = Math.round(reg.profit);
    regionSalesMap[reg.region] = Math.round(reg.revenue);
  });

  var segmentProfitMap = {};
  var segmentSalesMap = {};
  filteredData.forEach(function(d) {
    if (d.segment) {
      segmentProfitMap[d.segment] = (segmentProfitMap[d.segment] || 0) + d.profit;
      segmentSalesMap[d.segment] = (segmentSalesMap[d.segment] || 0) + d.revenue;
    }
  });

  Object.keys(segmentProfitMap).forEach(function(k) {
    segmentProfitMap[k] = Math.round(segmentProfitMap[k]);
    segmentSalesMap[k] = Math.round(segmentSalesMap[k]);
  });

  var cityDataMap = {};
  filteredData.forEach(function(d) {
    if (d.city) {
      if (!cityDataMap[d.city]) {
        cityDataMap[d.city] = { city: d.city, sales: 0, profit: 0 };
      }
      cityDataMap[d.city].sales += d.revenue;
      cityDataMap[d.city].profit += d.profit;
    }
  });

  var sortedCities = Object.values(cityDataMap)
    .sort(function(a, b) { return b.sales - a.sales; })
    .slice(0, 5)
    .map(function(c) {
      return {
        city: c.city,
        sales: Math.round(c.sales),
        profit: Math.round(c.profit),
      };
    });

  var slimAnomalies = (anomalies || []).map(function(anom) {
    return {
      label: anom.label,
      detail: anom.detail,
    };
  });

  return {
    kpis: {
      totalSales: Math.round(stats.totalRevenue),
      totalProfit: Math.round(stats.totalProfit),
      totalUnits: stats.totalUnits,
      avgDiscountPercentage: parseFloat((stats.avgDiscount * 100).toFixed(1)),
      discountedTransactionsRatio: parseFloat((stats.discountedRatio * 100).toFixed(1)),
      profitMarginPercentage: parseFloat((stats.profitMargin * 100).toFixed(1)),
    },
    salesByCategory: catSalesMap,
    profitByCategory: catProfitMap,
    salesByRegion: regionSalesMap,
    profitByRegion: regionProfitMap,
    salesBySegment: segmentSalesMap,
    profitBySegment: segmentProfitMap,
    top5Cities: sortedCities,
    anomalies: slimAnomalies,
  };
}

export function parseMarkdownToReact(text) {
  if (!text) return null;
  var lines = text.split('\n');
  var elements = [];
  var listBuffer = [];

  var flushList = function(key) {
    if (listBuffer.length > 0) {
      elements.push(React.createElement('ul', { key: 'list-' + key, className: 'list-disc ml-6 my-2 space-y-1' }, listBuffer));
      listBuffer = [];
    }
  };

  lines.forEach(function(line, idx) {
    var trimmed = line.trim();
    var isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');

    if (!isBullet) {
      flushList(idx);
    }

    var content = isBullet ? trimmed.replace(/^[\-\*]\s+/, '') : line;

    var parts = [];
    var regex = /(\*\*.*?\*\*|\*.*?\*)/g;
    var lastIndex = 0;
    var match;

    while ((match = regex.exec(content)) !== null) {
      var matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }
      var matchedStr = match[0];
      if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
        parts.push(React.createElement('strong', { key: 'b-' + matchIndex, className: 'font-bold' }, matchedStr.slice(2, -2)));
      } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
        parts.push(React.createElement('em', { key: 'i-' + matchIndex, className: 'italic' }, matchedStr.slice(1, -1)));
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    if (isBullet) {
      listBuffer.push(React.createElement('li', { key: 'li-' + idx, className: 'pl-1' }, parts));
    } else if (trimmed === '') {
      elements.push(React.createElement('div', { key: 'br-' + idx, className: 'h-2' }));
    } else {
      elements.push(React.createElement('p', { key: 'p-' + idx, className: 'm-0 mb-2 leading-relaxed' }, parts));
    }
  });

  flushList('end');
  return elements;
}


