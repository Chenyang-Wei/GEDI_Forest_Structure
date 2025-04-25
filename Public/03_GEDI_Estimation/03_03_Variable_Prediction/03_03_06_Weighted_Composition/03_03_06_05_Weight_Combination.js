/*******************************************************************************
 * Introduction *
 * 
 *  1) Combine the MSE-based and location-based weights of each selected tile
 *     for each selected response variable.
 * 
 * Last updated: 1/8/2025
 * 
 * Runtime: 2h ~ 7h
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
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

// var wd_Main_2_Str = ENA_mod.wd_CW_Str; // 0 ~ 7.

var wd_Main_2_Str = ENA_mod.wd_WEI_Str; // 8 ~ 10.

// Names of selected response variables.
var selectedVarNames_List = [
  "RHD_25to50",
  "RHD_50to75",
  "RHD_75to98",
  "rh98",
  "cover",
  "fhd_normal",
  "pai",
  "PAVD_0_10m",
  "PAVD_10_20m",
  "PAVD_20_30m",
  "PAVD_30_40m"
];

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Iteratively combine the two types of weights.
function Combine_Weights(current_TileID_Num, previous_Weights_Img) {
  
  // Convert the tile ID to an integer.
  current_TileID_Num = ee.Number(current_TileID_Num)
    .toInt();
  
  // Identify the location-based weight of each tile.
  var bandName_OneTile_Str = ee.String("Tile_")
    .cat(current_TileID_Num);
  
  var dist_OneTile_Img = dist_AllTiles_Img
    .select(bandName_OneTile_Str);
  
  // Identify the corresponding tile.
  var tileID_Filter = ee.Filter.eq({
    name: "Tile_ID", 
    value: current_TileID_Num
  });
  
  var oneTile_OneVar_Ftr = tiles_OneVar_FC
    .filter(tileID_Filter)
    .first();
  
  // Obtain the normalized MSE inverse of each tile.
  var normalMSEinv_Num = oneTile_OneVar_Ftr
    .getNumber("Normal_MSEinv");
  
  var combined_OneTile_Img = dist_OneTile_Img
    .multiply(normalMSEinv_Num);
  
  var current_Weights_Img = ee.Image(previous_Weights_Img)
    .addBands(combined_OneTile_Img);
  
  return current_Weights_Img;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected tiles with normalized MSE inverse of 
//   each response variable.
var tiles_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Weighted_Composition/"
  + "Tiles_NormalMSEinv"
);

// Normalized reversed distance to the centroid of 
//   each selected tile.
var dist_AllTiles_Img = ee.Image(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Weighted_Composition/"
  + "Normal_RevDist"
);


/*******************************************************************************
 * 1) Combine the MSE-based and location-based weights of each selected tile
 *    for each selected response variable. *
 ******************************************************************************/

// Determine a List of tile IDs.
var tileIDs_List = tiles_AllVars_FC.aggregate_array("Tile_ID")
  .distinct();

// Perform the weight combination by response variable.
for (var varID_Num = 10; varID_Num < 11; varID_Num ++) {
  
  var varName_Str = selectedVarNames_List[varID_Num];
  
  // Identify the selected tiles of each response variable.
  var responseVar_Filter = ee.Filter.eq({
    name: "Response_Var", 
    value: varName_Str
  });
  
  var tiles_OneVar_FC = tiles_AllVars_FC
    .filter(responseVar_Filter);
  
  // Iteratively combine the two types of weights.
  var combined_AllTiles_Img = tileIDs_List.iterate({
    function: Combine_Weights, 
    first: ee.Image() // Use an empty Image as the first band.
  });
  
  // Remove the empty Image.
  combined_AllTiles_Img = ee.Image(combined_AllTiles_Img)
    .select("Tile_.*")
    .reproject(prj_30m)
    .toFloat();


  /****** Export the result(s). ******/
  
  if (export_Bool) {
    
    //// Output to Asset.
    
    var outputName_Str = varName_Str;
    
    Export.image.toAsset({
      image: combined_AllTiles_Img, 
      description: outputName_Str, 
      assetId: wd_Main_2_Str
        + "GEDI_Estimation/"
        + "Weighted_Composition/"
        + "Combined_Weights/"
        + outputName_Str, 
      region: AOI_Geom, 
      scale: prj_30m.scale,  
      crs: prj_30m.crs,
      maxPixels: 1e13
    });
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("tiles_AllVars_FC:",
    tiles_AllVars_FC.first(),
    tiles_AllVars_FC.size()); // 23702.
  
  IMG_mod.Print_ImgInfo(
    "dist_AllTiles_Img:",
    dist_AllTiles_Img // 1693 bands.
  );
  
  IMG_mod.Print_ImgInfo(
    "combined_AllTiles_Img:",
    combined_AllTiles_Img // 1693 bands.
  );
}

