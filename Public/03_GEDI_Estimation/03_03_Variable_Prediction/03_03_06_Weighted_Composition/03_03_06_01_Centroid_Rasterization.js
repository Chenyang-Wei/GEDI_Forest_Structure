/*******************************************************************************
 * Introduction *
 * 
 *  1) Rasterize the geometric centroid of each selected tile.
 * 
 * Last updated: 12/16/2024
 * 
 * Runtime: 16m
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

var PAL_mod = require(
  "users/gena/packages:palettes");


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
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

var wd_Main_2_Str = ENA_mod.wd_Birds_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles"
);


/*******************************************************************************
 * 1) Rasterize the geometric centroid of each selected tile. *
 ******************************************************************************/

// Determine the centroid of each selected tile.
var tileCtrs_FC = selectedTiles_FC.map(
  
  function Determine_Centroids(selectedTile_Ftr) {
    
    return selectedTile_Ftr.centroid();
  }
).filter(
  ee.Filter.notNull(["Tile_ID"])
);

// Rasterize the determined centroids.
var tileCtrs_Img = tileCtrs_FC.reduceToImage({
  properties: ["Tile_ID"], 
  reducer: ee.Reducer.first()
}).rename(["Tile_ID"])
  .reproject(prj_30m)
  .toInt();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  IMG_mod.Print_ImgInfo(
    "tileCtrs_Img:",
    tileCtrs_Img
  );
  
  print("tileCtrs_FC:",
    tileCtrs_FC.first(),
    tileCtrs_FC.size());
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "selectedTiles_FC");

  Map.addLayer(tileCtrs_FC, 
    {
      color: "FF0000"
    }, 
    "tileCtrs_FC");

  Map.addLayer(tileCtrs_Img, 
    {
      min: 1,
      max: 1693,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "tileCtrs_Img");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var outputName_Str = "Selected_TileCentroids";
  
  Export.image.toAsset({
    image: tileCtrs_Img, 
    description: outputName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Weighted_Composition/"
      + outputName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

