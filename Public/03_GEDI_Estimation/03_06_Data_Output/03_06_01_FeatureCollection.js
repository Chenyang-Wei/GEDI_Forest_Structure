/*******************************************************************************
 * Introduction *
 * 
 *  1) Output the FeatureCollection(s) of interest to Google Drive.
 * 
 * Last updated: 6/27/2025
 * 
 * Runtime: 40m
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

// // Study area.
// var studyArea_FC = ee.FeatureCollection(
//   wd_Main_1_Str
//   + "Study_Domain/StudyArea_SelectedBCRs"
// );

// // Randomly collected samples.
// var collectedSamples_FC = ee.FeatureCollection(
//   wd_Main_2_Str
//   + "GEDI_Estimation/"
//   + "CollectedSamples_10perCell"
// );

// // Tiles (60 km).
// var tiles_FC = ee.FeatureCollection(
//   wd_Main_1_Str
//   + "Study_Domain/"
//   + "Tiles_60km");

// // Grid cells (30 km).
// var gridCells_FC = ee.FeatureCollection(
//   wd_Main_1_Str
//   + "Study_Domain/"
//   + "GridCells_30km");

// // Selected tiles.
// var selectedTiles_FC = ee.FeatureCollection(
//   wd_Main_2_Str
//   + "GEDI_Estimation/"
//   + "Tiles_60km/"
//   + "Selected_Tiles");

// // Selected grid cells.
// var selectedGridCells_FC = ee.FeatureCollection(
//   wd_Main_2_Str
//   + "GEDI_Estimation/"
//   + "Tiles_60km/"
//   + "Selected_GridCells");

// // Predictor analysis tiles.
// var predictorAnalysisTiles_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Predictor_Comparison/"
//   + "NonOverlapping_Tiles");

// // Accuracy assessment results.
// var accuracy_AllVars_FC = ee.FeatureCollection(
//   wd_Main_4_Str
//   + "GEDI_Estimation/"
//   + "Accuracy_AllResponseVars");

// // Load the aggregated result of predictor's contribution comparison.
// var aggregated_AllTiles_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Predictor_Comparison/"
//   + "Modeling_Results/"
//   + "ModelComparison_Aggregated"
// );

// var oldNames_List = aggregated_AllTiles_FC
//   .select(
//     ["Mean_.*", "SD_.*"]
//   )
//   .first().propertyNames()
//   .remove("system:index");

// var newNames_List = oldNames_List
//   .map(
//     function Rename(oldName_Str) {
      
//       oldName_Str = ee.String(oldName_Str);
      
//       var firstLetter_Str = oldName_Str.slice(0, 1);
      
//       var secondPart_Str = oldName_Str.slice(
//         oldName_Str.index("R")
//       );
      
//       return firstLetter_Str.cat("_").cat(secondPart_Str);
//     }
//   );

// oldNames_List = oldNames_List.cat(["Response_Var", "Tile_ID"]);
// newNames_List = newNames_List.cat(["Response_Var", "Tile_ID"]);

// print(oldNames_List);
// print(newNames_List);

// aggregated_AllTiles_FC = aggregated_AllTiles_FC
//   .select(oldNames_List, newNames_List);

// // Global modeling results of all response variables.
// var global_AllVars_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Model_Comparison/"
//   + "All_SelectedTiles/"
//   + "CompleteModel_Aggregated"
// );

// // Aggregated local testing results of global models.
// var aggregated_LocalTesting_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Model_Comparison/"
//   + "GlobalModels_LocallyTested/"
//   + "globalModels_Aggregated"
// );

// // Raw local testing results of global models.
// var raw_LocalTesting_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Model_Comparison/"
//   + "GlobalModels_LocallyTested/"
//   + "globalModels_AllResponseVars"
// );

// // Local model comparison results of all drawings.
// var localModelComparison_AllTiles_FC = ee.FeatureCollection(
//   wd_Main_3_Str
//   + "GEDI_Estimation/"
//   + "Predictor_Comparison/"
//   + "Modeling_Results/"
//   + "ModelComparison_10drawings"
// ).select([
//   "Response_Var",
//   "Tile_ID",
//   "Drawing_ID",
//   "R_squared",
//   "RMSE"
// ]);

// Randomly collected samples of 10 drawings from all 30 tiles.
//   (splitted into "training" and "testing" subsets.)
var allTileSamples_AllDrawings_FC = ee.FeatureCollection(
  ENA_mod.wd_FU_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "SplittedSamples_10drawings"
);

// Select the properties of interest.
var propertyNames_List = [
  "RHD_25to50",
  "RHD_50to75",
  "RHD_75to98",
  "rh98",
  "cover",
  "pai",
  "fhd_normal",
  "PAVD_0_10m",
  "PAVD_10_20m",
  "PAVD_20_30m",
  "PAVD_30_40m",
  "PAVD_40_50m",
  "PAVD_50_60m",
  "PAVD_over60m",
  ".*ID",
  "Category"
];

allTileSamples_AllDrawings_FC = allTileSamples_AllDrawings_FC
  .select(propertyNames_List);


/*******************************************************************************
 * 1) Determine the FeatureCollection(s) to output. *
 ******************************************************************************/

var outputData_1_FC = allTileSamples_AllDrawings_FC;
var outputName_1_Str = "RandomSamples_30tiles_10drawings";

// var outputData_2_FC = selectedGridCells_FC;
// var outputName_2_Str = "Selected_GridCells";


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s) of interest. ******/
  
  print("outputData_1_FC:",
    outputData_1_FC.first(),
    outputData_1_FC.size());
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 6);
  
  // Map.addLayer(AOI_Geom, 
  //   {
  //     color: "FFFFFF"
  //   }, 
  //   "AOI_Geom");

} else {
  
  /****** Export the result(s). ******/
  
  Export.table.toDrive({
    collection: outputData_1_FC, 
    description: outputName_1_Str, 
    folder: outputName_1_Str, 
    fileFormat: "SHP"
  });
  
  // Export.table.toDrive({
  //   collection: outputData_2_FC, 
  //   description: outputName_2_Str, 
  //   folder: outputName_2_Str, 
  //   fileFormat: "SHP"
  // });
}

