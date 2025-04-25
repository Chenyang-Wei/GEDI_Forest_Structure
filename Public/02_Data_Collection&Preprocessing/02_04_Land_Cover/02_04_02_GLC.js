/*******************************************************************************
 * Introduction *
 * 
 *  1) Determine the most common land cover type at each 30-m pixel
 *     during 2019-2022.
 * 
 * Last updated: 6/16/2024
 * 
 * Runtime: 27m
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

// GLC_FCS30D Global 30-meter Land Cover Change Dataset
//   (annual).
var landCover_IC = ee.ImageCollection(
  "projects/sat-io/open-datasets/GLC-FCS30D/annual");


/*******************************************************************************
 * 1) Determine the most common land cover type at each 30-m pixel
 *    during 2019-2022. *
 ******************************************************************************/

// Extract the land cover data within the AOI during 2019-2022.
landCover_IC = landCover_IC
  .select(["b20", "b21", "b22", "b23"])
  .filterBounds(AOI_Geom);

// Mosaic the land cover dataset by year (i.e., by band).
var landCover_Composite_Img = landCover_IC
  .mosaic()
  .setDefaultProjection(prj_30m);

// Convert the land cover composite to an ImageCollection.
var landCover_Composite_IC = ee.ImageCollection.fromImages([
  landCover_Composite_Img.select(["b20"], ["LandCover_GLC"]),
  landCover_Composite_Img.select(["b21"], ["LandCover_GLC"]),
  landCover_Composite_Img.select(["b22"], ["LandCover_GLC"]),
  landCover_Composite_Img.select(["b23"], ["LandCover_GLC"])
]);

// Determine the most common land cover type
//   at each pixel.
var landCover_Mode_Img = landCover_Composite_IC
  .mode()
  .setDefaultProjection(prj_30m);

// Clip to the study area.
landCover_Mode_Img = landCover_Mode_Img
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "landCover_Mode_Img:",
    landCover_Mode_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(landCover_Mode_Img, 
    {
      min: 10,
      max: 220,
      palette: "0000FF, FFFFFF, FF0000"
    }, 
    "landCover_Mode_Img");

} else {
  
  // Output to Asset.
  var fileName_Str = "LandCover_GLC";
  
  Export.image.toAsset({
    image: landCover_Mode_Img, 
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

