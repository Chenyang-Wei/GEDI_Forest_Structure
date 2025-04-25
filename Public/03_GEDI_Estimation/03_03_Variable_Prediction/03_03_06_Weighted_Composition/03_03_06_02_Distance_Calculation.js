/*******************************************************************************
 * Introduction *
 * 
 *  1) Derive a normalized weight Image (range: (0, 1]) based on 
 *     the distance to the corresponding geometric centroid
 *     within each tile.
 * 
 * Last updated: 12/19/2024
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

// var PAL_mod = require(
//   "users/gena/packages:palettes");


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

// Tile centroids.
var tileCtrs_Img = ee.Image(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Weighted_Composition/"
  + "Selected_TileCentroids"
);


/*******************************************************************************
 * 1) Derive a normalized weight Image (range: (0, 1]) based on 
 *    the distance to the corresponding geometric centroid
 *    within each tile. *
 ******************************************************************************/

// Determine a List of tile IDs.
var tileIDs_List = selectedTiles_FC.aggregate_array("Tile_ID");

// Calculate the distance by tile.
function Calculate_Distance(current_TileID_Num, previous_Dist_Img) {
  
  // Convert the current tile ID to an integer.
  current_TileID_Num = ee.Number(current_TileID_Num)
    .toInt();
  
  // Identify the current tile.
  var oneTile_Ftr = selectedTiles_FC.filter(
    ee.Filter.eq({
      name: "Tile_ID", 
      value: current_TileID_Num
    })
  ).first();
  
  // Extract the corresponding geometric centroid.
  var oneCtr_Img = tileCtrs_Img.eq(
    current_TileID_Num
  );
  
  // Calculate the distance to the centroid in 30-m pixel number.
  var squaredPxNum_Dist_Img = oneCtr_Img
    .fastDistanceTransform({
      neighborhood: 2e3, 
      units: "pixels", 
      metric: "squared_euclidean"
    })
    .reproject(prj_30m);
  
  var pxNum_Dist_Img = squaredPxNum_Dist_Img.sqrt()
    .clip(oneTile_Ftr)
    .rename(
      ee.String("Tile_").cat(current_TileID_Num)
    );

  return ee.Image(previous_Dist_Img).addBands(pxNum_Dist_Img);
}

var pxNum_Distances_Img = tileIDs_List.iterate({
  function: Calculate_Distance, 
  first: ee.Image() // Use an empty Image as the first band.
});

// Remove the empty Image.
pxNum_Distances_Img = ee.Image(pxNum_Distances_Img)
  .select("Tile_.*");

// Derive a normalized weight Image based on the distance metric.
var pseudo_MaxDist_Num = 1415;

var reversedDistances_Img = ee.Image(pseudo_MaxDist_Num)
  .subtract(pxNum_Distances_Img);

var normalizedRevDistances_Img = reversedDistances_Img
  .divide(pseudo_MaxDist_Num)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size());
  
  IMG_mod.Print_ImgInfo(
    "tileCtrs_Img:",
    tileCtrs_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "normalizedRevDistances_Img:",
    normalizedRevDistances_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  // Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(normalizedRevDistances_Img.select("Tile_1747"), 
    {
      min: 0,
      max: 1,
      palette: "0000FF, FFFFFF, FF0000"
    }, 
    "normalizedRevDistances_Img");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var outputName_Str = "Normal_RevDist";
  
  Export.image.toAsset({
    image: normalizedRevDistances_Img, 
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

