/*******************************************************************************
 * Introduction *
 * 
 *  1) Downscale each ALOS topographic variable to 30 m.
 * 
 * Last updated: 6/14/2024
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

var IMG_mod = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


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

// CHILI (Continuous Heat-Insolation Load Index).
var chili_Img = ee.Image("CSP/ERGo/1_0/Global/ALOS_CHILI")
  .select(["constant"], ["CHILI"])
  .clip(AOI_Geom);

// Landforms.
var landforms_Img = ee.Image("CSP/ERGo/1_0/Global/ALOS_landforms")
  .select(["constant"], ["Landform"])
  .clip(AOI_Geom);

// mTPI (Multi-Scale Topographic Position Index).
var mTPI_Img = ee.Image("CSP/ERGo/1_0/Global/ALOS_mTPI")
  .select(["AVE"], ["mTPI"])
  .clip(AOI_Geom);

// Topographic diversity.
var topoDiv_Img = ee.Image("CSP/ERGo/1_0/Global/ALOS_topoDiversity")
  .select(["constant"], ["Topo_Diversity"])
  .clip(AOI_Geom);


/*******************************************************************************
 * 1) Downscale each ALOS topographic variable to 30 m. *
 ******************************************************************************/

// Using the "bilinear" resampling algorithm
//  for non-categorical variables.
var chili_30m_Img = chili_Img.resample("bilinear")
  .reproject(prj_30m);

var mTPI_30m_Img = mTPI_Img.resample("bilinear")
  .reproject(prj_30m);

var topoDiv_30m_Img = topoDiv_Img.resample("bilinear")
  .reproject(prj_30m);

// Using the default "nearest-neighbor" metric
//   for the categorical "landform" dataset.
var landforms_30m_Img = landforms_Img
  .reproject(prj_30m);

// Combine all the resampled topographic variables.
var topoFeatures_30m_Img = chili_30m_Img
  .addBands(mTPI_30m_Img)
  .addBands(topoDiv_30m_Img)
  .addBands(landforms_30m_Img)
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  // IMG_mod.Print_ImgInfo(
  //   "chili_Img:",
  //   chili_Img
  // );
  
  // IMG_mod.Print_ImgInfo(
  //   "landforms_Img:",
  //   landforms_Img
  // );
  
  // IMG_mod.Print_ImgInfo(
  //   "mTPI_Img:",
  //   mTPI_Img
  // );
  
  // IMG_mod.Print_ImgInfo(
  //   "topoDiv_Img:",
  //   topoDiv_Img
  // );
  
  IMG_mod.Print_ImgInfo(
    "topoFeatures_30m_Img:",
    topoFeatures_30m_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 14);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(chili_Img, 
    {
      min: 0.0,
      max: 255.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "chili_Img");

  Map.addLayer(topoFeatures_30m_Img.select("CHILI"), 
    {
      min: 0.0,
      max: 255.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "CHILI");

  Map.addLayer(landforms_Img, 
    {
      min: 11.0,
      max: 42.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "landforms_Img");

  Map.addLayer(topoFeatures_30m_Img.select("Landform"), 
    {
      min: 11.0,
      max: 42.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Landform");

  Map.addLayer(mTPI_Img, 
    {
      min: -200.0,
      max: 200.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "mTPI_Img");

  Map.addLayer(topoFeatures_30m_Img.select("mTPI"), 
    {
      min: -200.0,
      max: 200.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "mTPI");

  Map.addLayer(topoDiv_Img, 
    {
      min: 0.0,
      max: 1.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "topoDiv_Img");

  Map.addLayer(topoFeatures_30m_Img.select("Topo_Diversity"), 
    {
      min: 0.0,
      max: 1.0,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Topo_Diversity");

} else {
  
  // Output to Asset.
  var fileName_Str = "ALOS_ResampledVariables";
  
  Export.image.toAsset({
    image: topoFeatures_30m_Img, 
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

