import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { parseSalesData, filterData, calcSummaryStats, calcMoMStats } from '../utils/dataUtils';
import rawSalesCsv from '../data/Sales_BY_Category_202606040914-1.csv?raw';
import { ref, get, set } from 'firebase/database';
import { db } from '../services/firebase';

var DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  var [rawData, setRawData] = useState([]);
  var [isLoading, setIsLoading] = useState(true);
  var [error, setError] = useState(null);

  var [regionFilter, setRegionFilter]           = useState('All');
  var [categoryFilter, setCategoryFilter]       = useState('All');
  var [subCategoryFilter, setSubCategoryFilter] = useState('All');
  var [segmentFilter, setSegmentFilter]         = useState('All');
  var [cityFilter, setCityFilter]               = useState('All');
  var [zScoreThreshold, setZScoreThreshold]     = useState(1.5);
  var [momThreshold, setMomThreshold]           = useState(25);
  var [hasLoadedConfig, setHasLoadedConfig]     = useState(false);

  useEffect(function() {
    var fetchConfig = async function() {
      try {
        var snapshot = await get(ref(db, 'filter_config/current'));
        if (snapshot.exists()) {
          var val = snapshot.val();
          if (val.region) setRegionFilter(val.region);
          if (val.category) setCategoryFilter(val.category);
          if (val.subCategory) setSubCategoryFilter(val.subCategory);
          if (val.segment) setSegmentFilter(val.segment);
          if (val.city) setCityFilter(val.city);
          if (typeof val.zScoreThreshold === 'number') setZScoreThreshold(val.zScoreThreshold);
          if (typeof val.momThreshold === 'number') setMomThreshold(val.momThreshold);
        }
      } catch (err) {
        console.warn('[Firebase] Failed to load filter configuration:', err.message);
      } finally {
        setHasLoadedConfig(true);
      }
    };
    fetchConfig();
  }, []);

  useEffect(function() {
    if (!hasLoadedConfig) return;
    var saveFilters = async function() {
      try {
        await set(ref(db, 'filter_config/current'), {
          region: regionFilter,
          category: categoryFilter,
          subCategory: subCategoryFilter,
          segment: segmentFilter,
          city: cityFilter,
          zScoreThreshold: zScoreThreshold,
          momThreshold: momThreshold,
        });
      } catch (err) {
        console.warn('[Firebase] Failed to save filter configuration:', err.message);
      }
    };
    saveFilters();
  }, [hasLoadedConfig, regionFilter, categoryFilter, subCategoryFilter, segmentFilter, cityFilter, zScoreThreshold, momThreshold]);


  var changeCategory = function(cat) {
    setCategoryFilter(cat);
    setSubCategoryFilter('All');
  };

  var changeRegion = function(reg) {
    setRegionFilter(reg);
    setCityFilter('All');
  };

  useEffect(function() {
    var loadData = async function() {
      try {
        setIsLoading(true);
        await new Promise(function(resolve) { setTimeout(resolve, 600); });
        var parsed = parseSalesData(rawSalesCsv);
        setRawData(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  var REGIONS = useMemo(function() {
    if (!rawData.length) return ['All'];
    var unique = Array.from(new Set(rawData.map(function(d) { return d.region; }))).filter(Boolean).sort();
    return ['All'].concat(unique);
  }, [rawData]);

  var CATEGORIES = useMemo(function() {
    if (!rawData.length) return ['All'];
    var unique = Array.from(new Set(rawData.map(function(d) { return d.category; }))).filter(Boolean).sort();
    return ['All'].concat(unique);
  }, [rawData]);

  var SUB_CATEGORIES = useMemo(function() {
    if (!rawData.length) return ['All'];
    var dataForSub = rawData;
    if (categoryFilter !== 'All') {
      dataForSub = rawData.filter(function(d) { return d.category === categoryFilter; });
    }
    var unique = Array.from(new Set(dataForSub.map(function(d) { return d.subCategory; }))).filter(Boolean).sort();
    return ['All'].concat(unique);
  }, [rawData, categoryFilter]);

  var SEGMENTS = useMemo(function() {
    if (!rawData.length) return ['All'];
    var unique = Array.from(new Set(rawData.map(function(d) { return d.segment; }))).filter(Boolean).sort();
    return ['All'].concat(unique);
  }, [rawData]);

  var CITIES = useMemo(function() {
    if (!rawData.length) return ['All'];
    var dataForCity = rawData;
    if (regionFilter !== 'All') {
      dataForCity = rawData.filter(function(d) { return d.region === regionFilter; });
    }
    var unique = Array.from(new Set(dataForCity.map(function(d) { return d.city; }))).filter(Boolean).sort();
    return ['All'].concat(unique);
  }, [rawData, regionFilter]);

  var filteredData = useMemo(function() {
    return filterData(rawData, {
      region: regionFilter,
      category: categoryFilter,
      subCategory: subCategoryFilter,
      segment: segmentFilter,
      city: cityFilter,
    });
  }, [rawData, regionFilter, categoryFilter, subCategoryFilter, segmentFilter, cityFilter]);

  var summaryStats = useMemo(function() {
    return calcSummaryStats(filteredData);
  }, [filteredData]);

  var momStats = useMemo(function() {
    return calcMoMStats(filteredData);
  }, [filteredData]);

  var value = {
    isLoading: isLoading || !hasLoadedConfig,
    error: error,
    regionFilter: regionFilter,
    setRegionFilter: changeRegion,
    categoryFilter: categoryFilter,
    setCategoryFilter: changeCategory,
    subCategoryFilter: subCategoryFilter,
    setSubCategoryFilter: setSubCategoryFilter,
    segmentFilter: segmentFilter,
    setSegmentFilter: setSegmentFilter,
    cityFilter: cityFilter,
    setCityFilter: setCityFilter,
    zScoreThreshold: zScoreThreshold,
    setZScoreThreshold: setZScoreThreshold,
    momThreshold: momThreshold,
    setMomThreshold: setMomThreshold,
    rawData: rawData,
    filteredData: filteredData,
    summaryStats: summaryStats,
    momStats: momStats,
    REGIONS: REGIONS,
    CATEGORIES: CATEGORIES,
    SUB_CATEGORIES: SUB_CATEGORIES,
    SEGMENTS: SEGMENTS,
    CITIES: CITIES,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  var ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider');
  return ctx;
}
