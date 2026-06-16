import { aggregateByMonthCategory, groupByRegion } from './dataUtils';

// ─────────────────────────────────────────
// INTERNAL MATH HELPERS
// ─────────────────────────────────────────

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  var m = mean(arr);
  var variance = arr.reduce(function(s, v) { return s + Math.pow(v - m, 2); }, 0) / arr.length;
  return Math.sqrt(variance);
}

function zScore(value, m, sd) {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

function formatCompact(value) {
  var abs = Math.abs(value);
  if (abs >= 1000000) return (value / 1000000).toFixed(1) + 'Jt';
  if (abs >= 1000) return (value / 1000).toFixed(0) + 'Rb';
  return String(value.toFixed(0));
}

/**
 * @param {Array} rawData - raw filtered sales rows (will be aggregated internally)
 * @param {number} threshold - Z-Score threshold (user-controlled)
 * @returns {Array} anomalyItems
 */
export function detectPointAnomalies(rawData, threshold) {
  var aggregated = aggregateByMonthCategory(rawData);

  var byCategory = {};
  aggregated.forEach(function(d) {
    if (!byCategory[d.category]) byCategory[d.category] = [];
    byCategory[d.category].push(d);
  });

  var anomalies = [];

  Object.entries(byCategory).forEach(function(entry) {
    var category = entry[0];
    var records = entry[1];
    var profits = records.map(function(r) { return r.profit; });
    var m  = mean(profits);
    var sd = stdDev(profits);

    records.forEach(function(record) {
      var z = zScore(record.profit, m, sd);
      if (Math.abs(z) > threshold) {
        anomalies.push({
          id: 'point-' + record.month + '-' + category,
          type: 'point',
          severity: Math.abs(z) > threshold * 1.5 ? 'high' : 'medium',
          month: record.month,
          category: category,
          metric: 'profit',
          value: record.profit,
          mean: m,
          stdDev: sd,
          zScore: z,
          direction: z < 0 ? 'negative' : 'positive',
          label: record.month + ' · ' + category,
          detail: 'Profit ' + formatCompact(record.profit) + ' (Z=' + z.toFixed(2) + ') menyimpang ' + Math.abs(z).toFixed(1) + 'σ dari rata-rata ' + formatCompact(m),
        });
      }
    });
  });

  return anomalies.sort(function(a, b) {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return Math.abs(b.zScore) - Math.abs(a.zScore);
  });
}

/**
 * @param {Array} rawData - raw filtered sales rows (will be aggregated internally)
 * @param {number} momThreshold - % threshold (e.g., 25 means 25%)
 * @returns {Array} anomalyItems
 */
export function detectMoMAnomalies(rawData, momThreshold) {
  var aggregated = aggregateByMonthCategory(rawData);
  var thresholdFraction = momThreshold / 100;

  var groups = {};
  aggregated.forEach(function(d) {
    if (!groups[d.category]) groups[d.category] = [];
    groups[d.category].push(d);
  });

  var anomalies = [];

  Object.entries(groups).forEach(function(entry) {
    var category = entry[0];
    var records = entry[1];
    var sorted = records.slice().sort(function(a, b) { return a.month.localeCompare(b.month); });

    for (var i = 1; i < sorted.length; i++) {
      var prev = sorted[i - 1];
      var curr = sorted[i];

      var prevDate = new Date(prev.month + '-01');
      var currDate = new Date(curr.month + '-01');
      var monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12
        + (currDate.getMonth() - prevDate.getMonth());
      if (monthDiff !== 1) continue;

      if (Math.abs(prev.revenue) > 0) {
        var revChange = (curr.revenue - prev.revenue) / Math.abs(prev.revenue);
        if (Math.abs(revChange) > thresholdFraction) {
          anomalies.push({
            id: 'mom-' + curr.month + '-' + category,
            type: 'mom',
            severity: Math.abs(revChange) > thresholdFraction * 1.5 ? 'high' : 'medium',
            month: curr.month,
            prevMonth: prev.month,
            category: category,
            metric: 'revenue',
            value: curr.revenue,
            prevValue: prev.revenue,
            changePercent: revChange * 100,
            direction: revChange < 0 ? 'negative' : 'positive',
            label: curr.month + ' · ' + category,
            detail: 'Revenue berubah ' + (revChange >= 0 ? '+' : '') + (revChange * 100).toFixed(1) + '% dari ' + prev.month + ' ke ' + curr.month + ' (' + formatCompact(prev.revenue) + ' → ' + formatCompact(curr.revenue) + ')',
          });
        }
      }
    }
  });

  return anomalies.sort(function(a, b) {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return Math.abs(b.changePercent) - Math.abs(a.changePercent);
  });
}

/**
 * @param {Array} rawData - raw sales data (should be unfiltered for cross-region comparison)
 * @returns {Array} anomalyItems
 */
export function detectRegionOutliers(rawData) {
  var regionStats = groupByRegion(rawData);
  if (regionStats.length < 2) return [];

  var margins = regionStats.map(function(r) { return r.profitMargin; });
  var m  = mean(margins);
  var sd = stdDev(margins);
  var FIXED_THRESHOLD = 1.0;

  return regionStats
    .filter(function(r) {
      var z = zScore(r.margin || r.profitMargin, m, sd);
      return z < -FIXED_THRESHOLD;
    })
    .map(function(r) {
      var margin = r.margin || r.profitMargin;
      var z = zScore(margin, m, sd);
      return {
        id: 'region-' + r.region,
        type: 'contextual',
        severity: z < -(FIXED_THRESHOLD * 1.5) ? 'high' : 'medium',
        region: r.region,
        metric: 'profitMargin',
        value: margin,
        mean: m,
        stdDev: sd,
        zScore: z,
        direction: 'negative',
        label: 'Margin Wilayah · ' + r.region,
        detail: 'Margin ' + r.region + ' (' + (margin * 100).toFixed(1) + '%) berada ' + Math.abs(z).toFixed(1) + 'σ di bawah rata-rata lintas wilayah (' + (m * 100).toFixed(1) + '%)',
      };
    })
    .sort(function(a, b) { return a.zScore - b.zScore; });
}

/**
 * Run all three detectors. Returns unified, deduplicated list.
 * @param {Array} filteredData - filtered raw rows
 * @param {Array} allData - full unfiltered raw rows (for region context)
 * @param {number} zThreshold
 * @param {number} momThreshold
 * @returns {Array} allAnomalies
 */
export function runAnomalyEngine(filteredData, allData, zThreshold, momThreshold) {
  var point      = detectPointAnomalies(filteredData, zThreshold);
  var mom        = detectMoMAnomalies(filteredData, momThreshold);
  var contextual = detectRegionOutliers(allData);

  var activeRegions = new Set(filteredData.map(function(d) { return d.region; }).filter(Boolean));

  var filteredContextual = contextual.filter(function(a) {
    return activeRegions.has(a.region);
  });

  var all = [].concat(point, mom, filteredContextual);
  var seen = {};
  return all.filter(function(a) {
    if (seen[a.id]) return false;
    seen[a.id] = true;
    return true;
  });
}
