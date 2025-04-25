/*******************************************************************************
 * Introduction *
 * 
 *  1) Merge the model comparison results of all 10 drawings
 *     of all response variables.
 * 
 * Last updated: 10/8/2024
 * 
 * Runtime: 2m
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

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_FU_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Number of drawings.
var drawingNumber_Num = 10;

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) Merge the model comparison results of all 10 drawings
 *    of all response variables. *
 ******************************************************************************/

// Create an empty List to store the merging result.
var modelComparison_AllDrawings_List = ee.List([]);

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  for (var drawingID_Num = 1; drawingID_Num <= drawingNumber_Num; 
    drawingID_Num ++) {
    
    // Load the result of model comparison.
    var modelComparison_OneDrawing_FC = ee.FeatureCollection(
      wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + "Modeling_Results/"
      + responseVarName_Str + "/"
      + "Drawing" + drawingID_Num + "_Comparison"
    );
    
    // Add the loaded result to the List.
    modelComparison_AllDrawings_List = modelComparison_AllDrawings_List
      .add(modelComparison_OneDrawing_FC);
  }
}

// Convert the merging result to a FeatureCollection.
var modelComparison_AllDrawings_FC = ee.FeatureCollection(
  modelComparison_AllDrawings_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("modelComparison_AllDrawings_FC:", 
    modelComparison_AllDrawings_FC.size(), // 4200 = 14 * 30 * 10.
    modelComparison_AllDrawings_FC.first());
  
} else {
  
  // Export the result(s).
  var outputName_Str = "ModelComparison_10drawings";
  
  Export.table.toAsset({
    collection: modelComparison_AllDrawings_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + "Modeling_Results/"
      + outputName_Str
  });
}

