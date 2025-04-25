/*******************************************************************************
 * Introduction *
 * 
 *  1) Randomly select a subset of tiles with
 *     at least 12,500 samples.
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
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

var wd_Main_2_Str = ENA_mod.wd_FU_Str;

// Number of tiles to select.
var tileCount_Num = 40;

// Sample size threshold.
var sampleSize_Thres_Num = 12500;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// All the original tiles.
var allTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");


/*******************************************************************************
 * 1) Randomly select a subset of tiles with
 *    at least 12,500 samples. *
 ******************************************************************************/

// Identify tiles with at least 12,500 samples.
var identifiedTiles_FC = allTiles_FC.filter(
  ee.Filter.gte({
    name: "Sample_Count", 
    value: sampleSize_Thres_Num
  })
);

// Randomize the tiles.
var randomizedTiles_FC = identifiedTiles_FC
  .sort({
    property: "Tile_ID",
    ascending: false
  });

// Select a given number of tiles.
var selectedTiles_FC = randomizedTiles_FC
  .limit(tileCount_Num);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size() // 40.
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 6);
  
  Map.addLayer(allTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "allTiles_FC",
    true);

  Map.addLayer(selectedTiles_FC, 
    {
      color: "FF0000"
    }, 
    "selectedTiles_FC",
    true);

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  var outputName_Str = "Raw_SelectedTiles";
  
  Export.table.toAsset({
    collection: selectedTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + outputName_Str
  });
}

