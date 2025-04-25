/*******************************************************************************
 * Introduction *
 * 
 *  1) Derive topographic features based on the 30-m ALOS elevation.
 * 
 * Last updated: 6/3/2024
 * 
 * Runtime: 34m
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

// ALOS elevation.
var ALOSelv_Img = ee.ImageCollection(
  "JAXA/ALOS/AW3D30/V3_2")
  .select("DSM")
  .filterBounds(AOI_Geom)
  .mosaic()
  .setDefaultProjection(prj_30m);


/*******************************************************************************
 * 1) Derive topographic features based on the 30-m ALOS elevation. *
 ******************************************************************************/

// Slope and aspect.
var topography_Img = ee.Terrain.products(ALOSelv_Img)
  .select(
    ["DSM", "slope", "aspect"],
    ["Elevation", "Slope", "Aspect"]
  );

// Convert to radians, compute the sine of the slope.
var sinSlope_Img = topography_Img.select("Slope")
  .divide(180).multiply(Math.PI)
  .sin();

// Convert to radians, compute the sine and cosine of the aspect.
var aspectRadians_Img = topography_Img.select("Aspect")
  .divide(180).multiply(Math.PI);

var sinAspect_Img = aspectRadians_Img.sin();

var cosAspect_Img = aspectRadians_Img.cos();

// Topographic indices.
var eastWestness_Img = sinSlope_Img.multiply(sinAspect_Img)
  .toFloat()
  .rename("East-westness");

var northSouthness_Img = sinSlope_Img.multiply(cosAspect_Img)
  .toFloat()
  .rename("North-southness");

// Combine all the features.
var topographicFeatures_Img = topography_Img
  .addBands(eastWestness_Img)
  .addBands(northSouthness_Img);

// Clip to the study area.
topographicFeatures_Img = topographicFeatures_Img
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  print("topographicFeatures_Img:",
    topographicFeatures_Img,
    topographicFeatures_Img.projection().crs(),
    topographicFeatures_Img.projection().nominalScale());
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 10);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(topographicFeatures_Img, 
    {
      bands: ["Slope"],
      // Units are degrees, range is [0, 90).
      min: 0,
      max: 20,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Slope");

  Map.addLayer(topographicFeatures_Img, 
    {
      bands: ["Aspect"],
      // Units are degrees where 0 = N, 90 = E, 180 = S, 270 = W.
      min: 0,
      max: 360,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Aspect");

  Map.addLayer(topographicFeatures_Img, 
    {
      bands: ["East-westness"],
      min: -0.5,
      max: 0.5,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "East-westness");

  Map.addLayer(topographicFeatures_Img, 
    {
      bands: ["North-southness"],
      min: -0.5,
      max: 0.5,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "North-southness");

} else {
  
  // Output to Asset.
  var fileName_Str = "ALOS_TopographicFeatures";
  
  Export.image.toAsset({
    image: topographicFeatures_Img, 
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

