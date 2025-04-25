/*******************************************************************************
 * Introduction *
 * 
 *  1) Preprocess the Sentinel-2 imagery.
 * 
 *  2) Calculate the temporal median of each selected Sentinel-2 band and
 *     aggregate the result to 30 m.
 * 
 * Last updated: 6/16/2024
 * 
 * Runtime: 6h
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");

var IMG_mod = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
var prj_20m = {
  crs: "EPSG:4326",
  scale: 20
};

var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var startMonth_Num = 5;
var endMonth_Num = 9;

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";

var wd_Cloud_Str = "projects/ee-lidar-birds/assets/"
  + "Eastern_North_America/";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Mask pixels with low CS+ QA scores.
var Mask_S2LowQA = function(S2_Img) {
  var qaBand_Str = "cs";
  
  var clearThreshold_Num = 0.5;
  
  var qaMask_Img = S2_Img.select(qaBand_Str)
    .gte(clearThreshold_Num);
  
  return S2_Img.updateMask(qaMask_Img);
};

// Apply scale factor to convert pixel values to reflectances
var Scale_S2Bands = function(S2_Img) {
  
  return S2_Img.multiply(0.0001)
    .copyProperties(S2_Img, ["system:time_start"]);
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// Sentinel-2 data.
var S2_IC = ee.ImageCollection(
  "COPERNICUS/S2_SR_HARMONIZED");

// "Cloud Score +" cloud mask.
var csPlus_IC = ee.ImageCollection(
  "GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED");


/*******************************************************************************
 * 1) Preprocess the Sentinel-2 imagery. *
 ******************************************************************************/

// Sentinel-2 data located within the AOI and
//   collected during the study period.
var studyPeriod_AOI_Filter = ee.Filter.and(
  ee.Filter.bounds(AOI_Geom),
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

S2_IC = S2_IC.filter(studyPeriod_AOI_Filter);

// Add "Cloud Score +" bands to each Sentinel-2 Image in the collection.
var csPlusBands_List = csPlus_IC.first().bandNames();

var S2_withCS_IC = S2_IC.linkCollection(
  csPlus_IC, csPlusBands_List);

// Preprocess each Sentinel-2 Image.
var preprocessedS2_IC = S2_withCS_IC
  .map(Mask_S2LowQA)
  .select([
    "B5", "B6", "B7", "B8A", "B11", "B12"
  ]) // 20-m bands
  .map(Scale_S2Bands);


/*******************************************************************************
 * 2) Calculate the temporal median of each selected Sentinel-2 band and
 *    aggregate the result to 30 m. *
 ******************************************************************************/

// Calculate the temporal median.
var S2median_Img = preprocessedS2_IC
  .median()
  .setDefaultProjection(prj_20m);

// Spatial aggregation.
var aggregatedS2median_Img = S2median_Img
  .reduceResolution({
    reducer: ee.Reducer.mean()
  })
  .reproject(prj_30m);

// Clip to the study area.
aggregatedS2median_Img = aggregatedS2median_Img
  .clip(studyArea_Geom)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "S2median_Img:",
    S2median_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "aggregatedS2median_Img:",
    aggregatedS2median_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 15);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(preprocessedS2_IC.select("B11"), 
    {
      min: 0.0,
      max: 0.3,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "SWIR - 1 (20 m)");

  // Map.addLayer(preprocessedS2_IC.select("B4"), 
  //   {
  //     min: 0.0,
  //     max: 0.3,
  //     palette: ["0000FF", "FFFFFF", "FF0000"]
  //   }, 
  //   "Red (10 m)");

} else {
  
  // Output to Asset.
  var fileName_Str = "S2_MedianSR_20mBands";

  Export.image.toAsset({
    image: aggregatedS2median_Img, 
    description: fileName_Str, 
    assetId: wd_Cloud_Str
      + "Environmental_Data/"
      + "Sentinel-2_Variables/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

