/*******************************************************************************
 * Introduction *
 * 
 *  1) Output FeatureCollections of interest to Google Drive
 * 
 * Last updated: 11/11/2024
 * 
 * Runtime: <1m ~ 10m
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
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_EO_Str;

var wd_Main_3_Str = ENA_mod.wd_FU_Str;

var wd_Main_4_Str = ENA_mod.wd_Birds_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/StudyArea_SelectedBCRs"
);

// // Randomly collected samples.
// var collectedSamples_FC = ee.FeatureCollection(
//   wd_Main_2_Str
//   + "GEDI_Estimation/"
//   + "CollectedSamples_10perCell"
// );

// Tiles (60 km).
var tiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "Tiles_60km");

// Grid cells (30 km).
var gridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "GridCells_30km");

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Predictor analysis tiles.
var predictorAnalysisTiles_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Accuracy assessment results.
var accuracy_AllVars_FC = ee.FeatureCollection(
  wd_Main_4_Str
  + "GEDI_Estimation/"
  + "Accuracy_AllResponseVars");

// Load the aggregated result of predictor's contribution comparison.
var aggregated_AllTiles_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "Modeling_Results/"
  + "ModelComparison_Aggregated"
);

var oldNames_List = aggregated_AllTiles_FC
  .select(
    ["Mean_.*", "SD_.*"]
  )
  .first().propertyNames()
  .remove("system:index");

var newNames_List = oldNames_List
  .map(
    function Rename(oldName_Str) {
      
      oldName_Str = ee.String(oldName_Str);
      
      var firstLetter_Str = oldName_Str.slice(0, 1);
      
      var secondPart_Str = oldName_Str.slice(
        oldName_Str.index("R")
      );
      
      return firstLetter_Str.cat("_").cat(secondPart_Str);
    }
  );

oldNames_List = oldNames_List.cat(["Response_Var", "Tile_ID"]);
newNames_List = newNames_List.cat(["Response_Var", "Tile_ID"]);

// print(oldNames_List);
// print(newNames_List);

aggregated_AllTiles_FC = aggregated_AllTiles_FC
  .select(oldNames_List, newNames_List);

// Global modeling results of all response variables.
var global_AllVars_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Model_Comparison/"
  + "All_SelectedTiles/"
  + "CompleteModel_Aggregated"
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("studyArea_FC:",
    studyArea_FC.first(),
    studyArea_FC.size());
  
  // print("collectedSamples_FC:",
  //   collectedSamples_FC.first(),
  //   collectedSamples_FC.size()); // 16930.
  
  print("aggregated_AllTiles_FC:",
    aggregated_AllTiles_FC.first(),
    aggregated_AllTiles_FC.size()); // 420 = 14 * 30.
  
  print("global_AllVars_FC:",
    global_AllVars_FC.first(),
    global_AllVars_FC.size()); // 14.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(studyArea_FC, 
    {
      color: "FF0000"
    }, 
    "studyArea_FC");

  Map.addLayer(selectedTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "selectedTiles_FC");

  Map.addLayer(selectedGridCells_FC, 
    {
      color: "0000FF"
    }, 
    "selectedGridCells_FC");

  Map.addLayer(accuracy_AllVars_FC, 
    {
      color: "228B22"
    }, 
    "accuracy_AllVars_FC");

  Map.addLayer(predictorAnalysisTiles_FC, 
    {
      color: "00FF00"
    }, 
    "predictorAnalysisTiles_FC",
    true);

  // Map.addLayer(collectedSamples_FC, 
  //   {
  //     color: "00FFFF"
  //   }, 
  //   "collectedSamples_FC",
  //   false);

} else {
  
  /****** Export the result(s). ******/
  
  // Select FeatureCollections to output.
  
  var outputData_1_FC = aggregated_AllTiles_FC;
  var outputName_1_Str = "ModelComparison_Aggregated";
  
  Export.table.toDrive({
    collection: outputData_1_FC, 
    description: outputName_1_Str, 
    folder: outputName_1_Str, 
    fileFormat: "SHP"
  });
  
  // var outputData_2_FC = selectedGridCells_FC;
  // var outputName_2_Str = "Selected_GridCells";
  
  // Export.table.toDrive({
  //   collection: outputData_2_FC, 
  //   description: outputName_2_Str, 
  //   folder: outputName_2_Str, 
  //   fileFormat: "SHP"
  // });
}

