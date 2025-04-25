/*******************************************************************************
 * Introduction *
 * 
 *  1) Derive GEDI Level-2A variables.
 * 
 * Last updated: 6/27/2024
 * 
 * Runtime: 35m
 * 
 * https://code.earthengine.google.com/4ed06d26aa17fb58dc4ae6cac12eda2c?noload=1
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
var prj_25m = {
  crs: "EPSG:4326",
  scale: 25
};

// Major working directories.
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var startMonth_Num = 5;
var endMonth_Num = 9;

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Mask GEDI Level-2A data.
var Mask_L2A = function(L2A_Img) {
  
  var qualityMask_Img = L2A_Img.select("quality_flag")
    .eq(1);
  
  var degradeMask_Img = L2A_Img.select("degrade_flag")
    .eq(0);
  
  // Use GEDI data acquired at night.
  var solarMask_Img = L2A_Img.select("solar_elevation")
    .lt(0);
  
  // High penetration sensitivity.
  var sensitivity_Img = L2A_Img.select("sensitivity");
  
  var sensitivityMask_Img = sensitivity_Img
    .gt(0.95)
    .and(sensitivity_Img.lte(1));
  
  // Full-power beams.
  var beamID_Img = L2A_Img.select("beam");
  
  var fullPowerMask_Img = beamID_Img.eq(5)
    .or(beamID_Img.eq(6))
    .or(beamID_Img.eq(8))
    .or(beamID_Img.eq(11));
  
  // "Leaf-on" vegetation observations.
  var leafOnMask_Img = L2A_Img.select("leaf_off_flag")
    .eq(0);
  
  // Land cover information.
  var urbanMask_Img = L2A_Img.select("urban_proportion")
    .lt(50);
  
  var waterMask_Img = L2A_Img.select("landsat_water_persistence")
    .lt(10);
  
  // Ground surface elevation.
  var surfaceMask_Img = L2A_Img.select("surface_flag")
    .eq(1);
  
  // Lowest mode elevation.
  var lowestModeElv_Img = L2A_Img.select("elev_lowestmode");
  
  var lowestModeMask_Img = lowestModeElv_Img.gt(-200)
    .and(lowestModeElv_Img.lt(9000));
  
  // Highest relative height.
  var rh100_Img = L2A_Img.select("rh100");
  
  var rh100Mask_Img = rh100_Img.gte(0)
    .and(rh100_Img.lt(120));
  
  return L2A_Img.updateMask(qualityMask_Img)
    .updateMask(degradeMask_Img)
    .updateMask(solarMask_Img)
    .updateMask(sensitivityMask_Img)
    .updateMask(fullPowerMask_Img)
    .updateMask(leafOnMask_Img)
    .updateMask(urbanMask_Img)
    .updateMask(waterMask_Img)
    .updateMask(surfaceMask_Img)
    .updateMask(lowestModeMask_Img)
    .updateMask(rh100Mask_Img);
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// Overlapping tiles.
var tiles_FC = ee.FeatureCollection(wd_Main_Str
  + "Study_Domain/Tiles_withID_30km"
);

// GEDI Level-2A data located within the AOI and
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

var L2A_IC = ee.ImageCollection(
  "LARSE/GEDI/GEDI02_A_002_MONTHLY")
  .filter(studyPeriod_AOI_Filter);


/*******************************************************************************
 * 1) Derive GEDI Level-2A variables. *
 ******************************************************************************/

// GEDI data preprocessing.
var preprocessedL2A_IC = L2A_IC
  .map(Mask_L2A);

// Select the bands of interest.
var bandNames_List = ["rh25", "rh50", "rh75", "rh95", "rh98"];

preprocessedL2A_IC = preprocessedL2A_IC
  .select(bandNames_List);

// Generate a temporal median composite within the study area.
var L2A_MedianVariables_Img = preprocessedL2A_IC
  .median()
  .setDefaultProjection(prj_25m)
  .clip(studyArea_Geom)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "L2A_MedianVariables_Img:",
    L2A_MedianVariables_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(tiles_FC, 
    {
      color: "00FFFF"
    }, 
    "tiles_FC");

  Map.addLayer(L2A_MedianVariables_Img, 
    {
      bands: ["rh98"],
      min: 1,
      max: 30,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "rh98");

} else {
  
  // Output to Asset.
  var fileName_Str = "L2A_MedianVariables";
  
  Export.image.toAsset({
    image: L2A_MedianVariables_Img, 
    description: fileName_Str, 
    assetId: wd_Main_Str
      + "Environmental_Data/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_25m.scale,  
    crs: prj_25m.crs,
    maxPixels: 1e13
  });
}

