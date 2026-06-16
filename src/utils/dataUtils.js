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
  var curr = monthly[monthly.length - 1];
  var prev = monthly[monthly.length - 2];

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
