/*******************************************************************************
 * Introduction *
 * 
 *  1) Merging the modeling results of all response variables
 *     for determining the number of trees.
 * 
 * Last updated: 9/6/2024
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

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) Merging the modeling results of all response variables
 *    for determining the number of trees. *
 ******************************************************************************/

// Create an empty List to store the modeling results of all response variables.
var modelingResults_AllVars_List = ee.List([]);

// Load and merge the modeling results of each response variable.
for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  // Load the modeling results of the response variable.
  var modelingResults_OneVar_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Hyperparameter_Tuning/"
    + "TreeNumber_Determination/"
    + responseVarName_Str);
  
  // Merge the modeling results.
  modelingResults_AllVars_List = modelingResults_AllVars_List
    .add(modelingResults_OneVar_FC);
}

// Convert the final dataset to a FeatureCollection.
var modelingResults_AllVars_FC = ee.FeatureCollection(
  modelingResults_AllVars_List
).flatten();



/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("modelingResults_AllVars_FC:",
    modelingResults_AllVars_FC.first(),
    modelingResults_AllVars_FC.size()); // 574 = 41 * 14.
  
} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var outputName_Str = "All_ResponseVars";
  
  Export.table.toAsset({
    collection: modelingResults_AllVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Hyperparameter_Tuning/"
      + "TreeNumber_Determination/"
      + outputName_Str
  });
}

