/*******************************************************************************
 * Introduction *
 * 
 *  1) Collect the pre-processed Sentinel-1 data within the AOI
 *     during the study period.
 * 
 *  2) Calculate relevant variables based on the Sentinel-1 data
 *     at 30 m.
 * 
 * Last updated: 6/16/2024
 * 
 * Runtime: 4h
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
var prj_10m = {
  crs: "EPSG:4326",
  scale: 10
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


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// Sentinel-1 Ground Range Detected (GRD) data.
var S1_IC = ee.ImageCollection("COPERNICUS/S1_GRD");


/*******************************************************************************
 * 1) Collect the pre-processed Sentinel-1 data within the AOI
 *    during the study period. *
 ******************************************************************************/

// Data filtering.
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

S1_IC = S1_IC.filter(studyPeriod_AOI_Filter)
  .filter(ee.Filter.eq("instrumentMode", "IW"));
  // IW (Interferometric Wide Swath).

// VV polarization.
//   (Single co-polarization, vertical transmit/vertical receive.)
var S1_VV_IC = S1_IC
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
  .select("VV")
  .map(function(image) {
    var edge = image.lt(-30.0);
    var maskedImage = image.mask().and(edge.not());
    return image.updateMask(maskedImage);
  });

// VH polarization.
//   (Dual-band cross-polarization, vertical transmit/horizontal receive.)
var S1_VH_IC = S1_IC
  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
  .select("VH")
  .map(function(image) {
    var edge = image.lt(-30.0);
    var maskedImage = image.mask().and(edge.not());
    return image.updateMask(maskedImage);
  });


/*******************************************************************************
 * 2) Calculate relevant variables based on the Sentinel-1 data
 *    at 30 m. *
 ******************************************************************************/

// Median composites.
var VV_median_Img = S1_VV_IC.median()
  .setDefaultProjection(prj_10m)
  .rename("VV_median");

var VH_median_Img = S1_VH_IC.median()
  .setDefaultProjection(prj_10m)
  .rename("VH_median");

// VH/VV ratio.
var VH_VV_ratio_Img = VH_median_Img.divide(VV_median_Img)
  .rename("VH_VV_ratio");

// Normalized difference radar index.
var NDRI_Img = VH_median_Img.subtract(VV_median_Img)
  .divide(VH_median_Img.add(VV_median_Img))
  .rename("NDRI");

// Radar vegetation index.
var RVI_Img = VH_median_Img.multiply(4)
  .divide(VH_median_Img.add(VV_median_Img))
  .rename("RVI");

// Combine all the derived variables.
var S1_variables_Img = ee.Image.cat(
  VV_median_Img,
  VH_median_Img,
  VH_VV_ratio_Img,
  NDRI_Img,
  RVI_Img
);

// Aggregate the variables to 30 m.
var aggregatedS1_variables_Img = S1_variables_Img
  .reduceResolution({
    reducer: ee.Reducer.mean()
  })
  .reproject(prj_30m);

// Clip to the study area.
aggregatedS1_variables_Img = aggregatedS1_variables_Img
  .clip(studyArea_Geom)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "aggregatedS1_variables_Img:",
    aggregatedS1_variables_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);

  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(S1_variables_Img.select("NDRI"), 
    {
      min: -1,
      max: 1,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "NDRI");

} else {
  
  // Output to Asset.
  var fileName_Str = "S1_Variables";
  
  Export.image.toAsset({
    image: aggregatedS1_variables_Img, 
    description: fileName_Str, 
    assetId: wd_Main_Str
      + "Environmental_Data/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

