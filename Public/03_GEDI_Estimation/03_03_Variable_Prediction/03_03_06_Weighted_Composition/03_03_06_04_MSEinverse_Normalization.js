/*******************************************************************************
 * Introduction *
 * 
 *  1) Normalize the inverse of each response variable's MSE
 *     for each tile.
 * 
 * Last updated: 1/7/2025
 * 
 * Runtime: 4m
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Normalize the inverse of each MSE.
function Normalize_MSEinverse(tile_Ftr) {
  
  var MSEinverse_Num = tile_Ftr.getNumber("MSE_Inverse");
  
  var normalizedInverse_Num = MSEinverse_Num
    .subtract(minInverse_Num)
    .divide(inverseRange_Num);
  
  return tile_Ftr.set({
    Normal_MSEinv: normalizedInverse_Num
  });
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected tiles with model accuracy (including MSE inverse).
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "TileAccuracy_AllResponseVars"
);


/*******************************************************************************
 * 1) Normalize the inverse of each response variable's MSE
 *    for each tile. *
 ******************************************************************************/

// Create an empty List to store the normalization results.
var normalized_AllVars_List = ee.List([]);

// Perform the normalization by response variable.
for (var responseVarID_Num = 0; responseVarID_Num < 14; responseVarID_Num ++) {
  
  var responseVarName_Str = allResponseVarNames_List[responseVarID_Num];
  
  // Identify the selected tiles of each response variable.
  var responseVar_Filter = ee.Filter.eq({
    name: "Response_Var", 
    value: responseVarName_Str
  });
  
  var tiles_OneVar_FC = selectedTiles_FC.filter(responseVar_Filter);
  
  // Determine the extreme values of MSE inverse.
  var inverseExtremes_Dict = tiles_OneVar_FC.reduceColumns({
    reducer: ee.Reducer.minMax(), 
    selectors: ["MSE_Inverse"]
  });
  
  var minInverse_Num = inverseExtremes_Dict
    .getNumber("min");
  
  var maxInverse_Num = inverseExtremes_Dict
    .getNumber("max");
  
  var inverseRange_Num = maxInverse_Num
    .subtract(minInverse_Num);
  
  // Normalize the inverse of each MSE.
  var normalized_OneVar_FC = tiles_OneVar_FC.map(
    Normalize_MSEinverse
  );
  
  normalized_AllVars_List = normalized_AllVars_List
    .add(normalized_OneVar_FC);
}

// Convert the List to a FeatureCollection.
var normalized_AllVars_FC = ee.FeatureCollection(
  normalized_AllVars_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("allResponseVarNames_List:",
    allResponseVarNames_List);
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size()); // 23702.
  
  print("normalized_AllVars_FC:",
    normalized_AllVars_FC.first(),
    normalized_AllVars_FC.size()); // 23702.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(selectedTiles_FC, 
    {
      color: "0000FF"
    }, 
    "selectedTiles_FC");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var outputName_Str = "Tiles_NormalMSEinv";
  
  Export.table.toAsset({
    collection: normalized_AllVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Weighted_Composition/"
      + outputName_Str
  });
}

