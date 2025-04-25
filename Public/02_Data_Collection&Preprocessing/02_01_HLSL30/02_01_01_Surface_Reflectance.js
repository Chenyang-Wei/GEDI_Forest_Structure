/*******************************************************************************
 * Introduction *
 * 
 *  1) Preprocess the HLS-2 Landsat imagery.
 * 
 *  2) Calculate the temporal median surface reflectance
 *     of each selected Landsat band and clip it to the study area.
 * 
 * Last updated: 6/13/2024
 * 
 * Runtime: 1h
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
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

// Preprocess each HLS-2 Landsat surface reflectance Image.
var Preprocess_HLSL30 = function(HLSL30_Img) {
  
  // Create a set of bit masks.
  var cloud_BitMask = 1 << 1;
  // Push "1" one space to the left: 00000010.
  var cloudShadowAdjacency_BitMask = 1 << 2;
  // Push "1" two spaces to the left: 00000100.
  var cloudShadow_BitMask = 1 << 3;
  // Push "1" three spaces to the left: 00001000.

  // Get the pixel QA band.
  var qa_Img = HLSL30_Img.select("Fmask");

  // All flags should be set to zero,
  //   indicating neither cloud nor shadow conditions.
  var qaMask_Img = qa_Img.bitwiseAnd(cloud_BitMask).eq(0)
    .and(qa_Img.bitwiseAnd(cloudShadowAdjacency_BitMask).eq(0))
    .and(qa_Img.bitwiseAnd(cloudShadow_BitMask).eq(0));
  
  return HLSL30_Img.updateMask(qaMask_Img);
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// 30-m LANDSAT-8 Level 2, Collection 2, Tier 1 data
//   located within the AOI and
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

var HLSL30_IC = ee.ImageCollection("NASA/HLS/HLSL30/v002")
  .filter(studyPeriod_AOI_Filter);


/*******************************************************************************
 * 1) Preprocess the HLS-2 Landsat imagery. *
 ******************************************************************************/

// Preprocess each HLS-2 Landsat Image.
var preprocessedHLSL30_IC = HLSL30_IC
  .map(Preprocess_HLSL30)
  .select("B.*");

// Remove "B1" (coastal aerosol) and
//   the TOA "B9" (cirrus), "B10" (TIRS1), and "B11" (TIRS2).
var bandNames_List = preprocessedHLSL30_IC
  .first()
  .bandNames();

bandNames_List = bandNames_List.removeAll(["B1", "B9", "B10", "B11"]);

preprocessedHLSL30_IC = preprocessedHLSL30_IC
  .select(bandNames_List);


/*******************************************************************************
 * 2) Calculate the temporal median surface reflectance
 *    of each selected Landsat band and clip it to the study area. *
 ******************************************************************************/

var preprocessedHLSL30_Median_Img = preprocessedHLSL30_IC
  .median()
  .setDefaultProjection(prj_30m)
  .clip(studyArea_Geom)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  print("preprocessedHLSL30_Median_Img:",
    preprocessedHLSL30_Median_Img,
    preprocessedHLSL30_Median_Img.projection().crs(),
    preprocessedHLSL30_Median_Img.projection().nominalScale());
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(studyArea_Geom, 10);

  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(preprocessedHLSL30_Median_Img, 
    {
      bands: ["B4", "B3", "B2"],
      min: 0.0,
      max: 0.3
    }, 
    "preprocessedHLSL30_Median_Img");

} else {
  
  // Output to Asset.
  var fileName_Str = "HLSL30_MedianSR";
  
  Export.image.toAsset({
    image: preprocessedHLSL30_Median_Img, 
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

