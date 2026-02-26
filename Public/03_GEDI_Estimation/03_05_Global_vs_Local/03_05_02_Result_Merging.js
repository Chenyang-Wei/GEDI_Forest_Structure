/*******************************************************************************
 * Introduction *
 * 
 *  1) Merge the results of globally trained and locally tested
 *     complete models for all response variables.
 * 
 * Last updated: 6/11/2025
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
 * 1) Merge the results of globally trained and locally tested
 *    complete models for all response variables. *
 ******************************************************************************/

// Create an empty List to store the merging result.
var globalModels_AllResponseVars_List = ee.List([]);

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable name.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  // Load the global modeling result of one response variable.
  var globalModel_OneResponseVar_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Model_Comparison/"
    + "GlobalModels_LocallyTested/"
    + responseVarName_Str
    + "_Complete"
  );
  
  // Add the loaded result to the List.
  globalModels_AllResponseVars_List = globalModels_AllResponseVars_List
    .add(globalModel_OneResponseVar_FC);
}

// Convert the merging result to a FeatureCollection.
var globalModels_AllResponseVars_FC = ee.FeatureCollection(
  globalModels_AllResponseVars_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("globalModels_AllResponseVars_FC:", 
    globalModels_AllResponseVars_FC.size(), // 4200 = 14 * 10 * 30.
    globalModels_AllResponseVars_FC.first());
  
} else {
  
  // Export the result(s).
  var outputName_Str = "globalModels_AllResponseVars";
  
  Export.table.toAsset({
    collection: globalModels_AllResponseVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Model_Comparison/"
      + "GlobalModels_LocallyTested/"
      + outputName_Str
  });
}

