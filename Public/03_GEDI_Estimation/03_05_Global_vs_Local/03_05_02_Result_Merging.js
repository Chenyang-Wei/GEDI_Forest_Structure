/*******************************************************************************
 * Introduction *
 * 
 *  1) Merge the complete modeling results of all response variables.
 * 
 * Last updated: 10/22/2024
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
 * 1) Merge the complete modeling results of 
 *    all response variables. *
 ******************************************************************************/

// Create an empty List to store the merging result.
var completeModel_AllResponseVars_List = ee.List([]);

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  // Load the result of complete modeling.
  var completeModel_OneResponseVar_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Model_Comparison/"
    + "All_SelectedTiles/"
    + responseVarName_Str + "_Complete"
  );
  
  // Add the loaded result to the List.
  completeModel_AllResponseVars_List = completeModel_AllResponseVars_List
    .add(completeModel_OneResponseVar_FC);
}

// Convert the merging result to a FeatureCollection.
var completeModel_AllResponseVars_FC = ee.FeatureCollection(
  completeModel_AllResponseVars_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("completeModel_AllResponseVars_FC:", 
    completeModel_AllResponseVars_FC.size(), // 140 = 14 * 10.
    completeModel_AllResponseVars_FC.first());
  
} else {
  
  // Export the result(s).
  var outputName_Str = "CompleteModel_AllResponseVars";
  
  Export.table.toAsset({
    collection: completeModel_AllResponseVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Model_Comparison/"
      + "All_SelectedTiles/"
      + outputName_Str
  });
}

