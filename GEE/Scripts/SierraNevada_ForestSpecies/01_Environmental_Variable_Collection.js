/*******************************************************************************
 * Introduction *
 * 
 *  1) NDVI and topographic features
 * 
 *  2) NLCD land cover
 * 
 *  3) GEDI products
 * 
 * Updated: 3/11/2024
 * 
 * Runtime: 9m ~ 24m
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
var GEDI_prj = {
  crs: "EPSG:4326",
  scale: 25
};

var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Study area.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "Sierra_Nevada_US_GMBAv2_Standard"
).first()).geometry();

var AOI = studyArea_Geom.bounds();

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var startMonth_Num = 6;
var endMonth_Num = 8;

// Combined spatio-temporal filter.
var combined_Filter = ee.Filter.and(
  ee.Filter.bounds(AOI),
  ee.Filter.calendarRange({
    start: startYear_Num, 
    end: endYear_Num, 
    field: "year"
  }),
  ee.Filter.calendarRange({
    start: startMonth_Num, 
    end: endMonth_Num, 
    field: "month"
  })
);


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Apply scaling factors to the LANDSAT-8 imagery.
var applyScaleFactors = function(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
};

// Calculate the NDVI of the LANDSAT-8 imagery.
var Calculate_NDVI = function(img) {
  var bandName_Str = "NDVI";
  
  var NDVI_Img = img.normalizedDifference(
    ["SR_B5", "SR_B4"]
  ).rename(bandName_Str);
  
  return img.addBands(NDVI_Img)
    .select(bandName_Str);
};

// Compute the annual max. NDVI.
var Compute_MaxNDVI = function(year_Num) {
  // Extract all the LANDSAT NDVIs in one year.
  var allNDVIs_IC = NDVI_IC.filter(ee.Filter.calendarRange({
    start: year_Num, 
    end: year_Num, 
    field: "year"
  }));
  
  // Calculate their annual maximum value.
  var maxNDVI_Img = allNDVIs_IC.max()
    .set("Year", year_Num); // Add the year as a property.
  
  return maxNDVI_Img;
};

// GEDI quality mask.
var qualityMask_L2A = function(im) {
  return im.updateMask(im.select('quality_flag').eq(1))
    .updateMask(im.select('degrade_flag').eq(0));
};

var qualityMask_L2B = function(im) {
  return im.updateMask(im.select('l2b_quality_flag').eq(1))
    .updateMask(im.select('degrade_flag').eq(0));
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// 30-m SRTM elevation data.
var SRTM_Img = ee.Image("USGS/SRTMGL1_003");

// 30-m LANDSAT-8 Level 2, Collection 2, Tier 1 data.
var LANDSAT_IC = ee.ImageCollection(
  'LANDSAT/LC08/C02/T1_L2')
  .filter(combined_Filter);

// GEDI Level 2 datasets.
var GEDI_L2A_IC = ee.ImageCollection(
  'LARSE/GEDI/GEDI02_A_002_MONTHLY')
  .filter(combined_Filter)
  .map(qualityMask_L2A)
  .select('rh98');

var GEDI_L2B_IC = ee.ImageCollection(
  'LARSE/GEDI/GEDI02_B_002_MONTHLY')
  .filter(combined_Filter)
  .map(qualityMask_L2B)
  .select(['cover', 'fhd_normal', 'pai']);

// 30-m NLCD datasets.
var NLCD_2019_Img = ee.ImageCollection(
  "USGS/NLCD_RELEASES/2019_REL/NLCD")
  .filter(ee.Filter.eq('system:index', '2019'))
  .first()
  .select(['landcover'], ['landcover_2019']);

var NLCD_2021_Img = ee.ImageCollection(
  "USGS/NLCD_RELEASES/2021_REL/NLCD")
  .filter(ee.Filter.eq('system:index', '2021'))
  .first()
  .select(['landcover'], ['landcover_2021']);


/*******************************************************************************
 * 1) NDVI and topographic features *
 ******************************************************************************/

// Median of annual max. NDVIs.
LANDSAT_IC = LANDSAT_IC.map(applyScaleFactors);

var NDVI_IC = LANDSAT_IC.map(Calculate_NDVI);

var studyYears_List = ee.List.sequence(
  startYear_Num, endYear_Num);

var maxNDVIs_IC = ee.ImageCollection.fromImages(
  studyYears_List.map(Compute_MaxNDVI)
);

var NDVImedian_Img = maxNDVIs_IC.median();

// Topographic features.
var Terrain_Img = ee.Algorithms.Terrain(SRTM_Img);

Terrain_Img = Terrain_Img.select([
  "elevation", "slope", "aspect"
]);


/*******************************************************************************
 * 2) NLCD land cover *
 ******************************************************************************/

var NLCD_Img = NLCD_2019_Img.addBands(NLCD_2021_Img);

var deciduous_Img = NLCD_Img.updateMask(
  NLCD_Img.eq(41)
).selfMask();

var evergreen_Img = NLCD_Img.updateMask(
  NLCD_Img.eq(42)
).selfMask();

var mixed_Img = NLCD_Img.updateMask(
  NLCD_Img.eq(43)
).selfMask();


/*******************************************************************************
 * 3) GEDI products *
 ******************************************************************************/

var GEDI_L2A_Img = GEDI_L2A_IC.median();

var GEDI_L2B_Img = GEDI_L2B_IC.median();

var GEDI_median = GEDI_L2A_Img.addBands(
  GEDI_L2B_Img
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  print("NDVImedian_Img:", NDVImedian_Img);
  
  // Visualization.
  Map.setOptions("Satellite");
  
  Map.addLayer(AOI, 
    {
      color: "FFFFFF"
    }, 
    "AOI");
  
  Map.addLayer(studyArea_Geom, 
    {
      color: "0000FF"
    }, 
    "studyArea_Geom");
  
  Map.addLayer(deciduous_Img, 
    {
      bands: ["landcover_2021"],
      palette: ["228B22"]
    }, 
    "deciduous_Img");
  
} else {
  
  // NDVI.
  var fileName = "maxNDVI_Median";
  
  Export.image.toAsset({
    image: NDVImedian_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  // Topographic features.
  var fileName = "topography";
  
  Export.image.toAsset({
    image: Terrain_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  // Deciduous forest.
  var fileName = "deciduous_Forest";
  
  Export.image.toAsset({
    image: deciduous_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  // Evergreen forest.
  var fileName = "evergreen_Forest";
  
  Export.image.toAsset({
    image: evergreen_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  // Mixed forest.
  var fileName = "mixed_Forest";
  
  Export.image.toAsset({
    image: mixed_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  // GEDI.
  var fileName = "GEDI_median";
  
  Export.image.toAsset({
    image: GEDI_median, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
      + fileName, 
    region: AOI, 
    scale: GEDI_prj.scale,  
    crs: GEDI_prj.crs,
    maxPixels: 1e13
  });
}

