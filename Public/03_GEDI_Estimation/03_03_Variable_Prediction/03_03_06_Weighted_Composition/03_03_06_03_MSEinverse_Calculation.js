/*******************************************************************************
 * Introduction *
 * 
 *  1) Calculate the inverse of MSE for each selected grid cell.
 * 
 *  2) Add each inverse of MSE to the corresponding selected tile.
 * 
 * Last updated: 1/6/2025
 * 
 * Runtime: 3m
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

var wd_Main_2_Str = ENA_mod.wd_EO_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Calculate the inverse of each selected grid cell's MSE.
function Calculate_MSEinverse(selectedCell_Ftr) {
  
  // Compute MSE.
  var RMSE_Num = selectedCell_Ftr.getNumber("RMSE");
  
  var MSE_Num = RMSE_Num.pow(2);
  
  // Inverse of MSE.
  var MSEinverse_Num = ee.Number(1).divide(MSE_Num);
  
  return selectedCell_Ftr.set({
    MSE: MSE_Num,
    MSE_Inverse: MSEinverse_Num
  });
}

// Replace the Geometry of each joined Feature with
//   the corresponding tile.
function Replace_Geometry(joinedCell_Ftr) {
  
  var matchedTile_Ftr = joinedCell_Ftr.get("Matched_Tile");
  
  matchedTile_Ftr = ee.Feature(matchedTile_Ftr)
    .select(["Tile_ID"]);
  
  matchedTile_Ftr = matchedTile_Ftr.copyProperties({
    source: joinedCell_Ftr, 
    exclude: ["Matched_Tile", "Tile_ID"]
  });
  
  return matchedTile_Ftr;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected grid cells with model accuracy.
var selectedCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "CellAccuracy_AllResponseVars"
).select([
  "Tile_ID",
  "Response_Var",
  "R_squared",
  "RMSE"
]);

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles"
);


/*******************************************************************************
 * 1) Calculate the inverse of MSE for each selected grid cell. *
 ******************************************************************************/

selectedCells_FC = selectedCells_FC.map(
  Calculate_MSEinverse
);


/*******************************************************************************
 * 2) Add each inverse of MSE to the corresponding selected tile. *
 ******************************************************************************/

// Join each tile with the corresponding grid cell.
var cellGrid_Join = ee.Join.saveFirst({
  matchKey: "Matched_Tile"
});

var tileID_Filter = ee.Filter.equals({
  leftField: "Tile_ID", 
  rightField: "Tile_ID"
});

var joinedCells_FC = cellGrid_Join.apply({
  primary: selectedCells_FC, 
  secondary: selectedTiles_FC, 
  condition: tileID_Filter
});

// Replace the Geometry of each joined Feature with
//   the corresponding tile.
var tileAccuracy_FC = joinedCells_FC.map(
  Replace_Geometry
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedCells_FC:",
    selectedCells_FC.first(),
    selectedCells_FC.size()); // 23702.
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size()); // 1693.
  
  print("tileAccuracy_FC:",
    tileAccuracy_FC.first(),
    tileAccuracy_FC.size()); // 23702.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(selectedCells_FC, 
    {
      color: "0000FF"
    }, 
    "selectedCells_FC");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var outputName_Str = "TileAccuracy_AllResponseVars";
  
  Export.table.toAsset({
    collection: tileAccuracy_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}

