/*******************************************************************************
 * Introduction *
 * 
 *  1) Manually choose a subset of non-overlapping tiles.
 * 
 * Last updated: 10/7/2024
 * 
 * Runtime: <1m
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
var wd_Main_1_Str = ENA_mod.wd_FU_Str;

// Number of non-overlapping tiles to select.
var tileCount_Num = 30;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// All the selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "Raw_SelectedTiles");


/*******************************************************************************
 * 1) Manually choose a subset of non-overlapping tiles. *
 ******************************************************************************/

// Determine a List of IDs for all the selected tiles.
var tileIDs_List = selectedTiles_FC.aggregate_array("Tile_ID");

// Remove the overlapping tiles.
var nonOverlapping_TileIDs_List = tileIDs_List
  .removeAll([2022, 2033, 2055, 2066, 2091]);

var nonOverlappingTiles_FC = selectedTiles_FC.filter(
  ee.Filter.inList({
    leftField: "Tile_ID", 
    rightValue: nonOverlapping_TileIDs_List
  })
);

// Choose a subset of non-overlapping tiles.
nonOverlappingTiles_FC = nonOverlappingTiles_FC
  .sort({
    property: "Sample_Count",
    ascending: false
  })
  .limit(tileCount_Num);


/*******************************************************************************
* Results *
******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("Sample size:",
    selectedTiles_FC.aggregate_min("Sample_Count")); // 12671.
  
  print("nonOverlappingTiles_FC:",
    nonOverlappingTiles_FC.first(),
    nonOverlappingTiles_FC.size() // 1693.
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 4);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "selectedTiles_FC",
    true);

  Map.addLayer(nonOverlappingTiles_FC, 
    {
      color: "FF0000"
    }, 
    "nonOverlappingTiles_FC",
    true);

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  var outputName_Str = "NonOverlapping_Tiles";
  
  Export.table.toAsset({
    collection: nonOverlappingTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + outputName_Str
  });
}

