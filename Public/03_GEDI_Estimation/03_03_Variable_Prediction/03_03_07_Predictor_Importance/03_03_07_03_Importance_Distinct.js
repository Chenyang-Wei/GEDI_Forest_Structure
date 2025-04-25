/*******************************************************************************
 * Introduction *
 * 
 *  1) For each tile and each response variable, identify 
 *     the distinct summarized variable importance of each predictor group.
 * 
 * Last updated: 10/29/2024
 * 
 * Runtime: 22m
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
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

// Whether to output the result(s).
var output_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Summarized variable importance of each predictor group.
var summarized_Importance_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "SummarizedImportance_AllResponseVars");


/*******************************************************************************
 * 1) For each tile and each response variable, identify 
 *    the distinct summarized variable importance of each predictor group. *
 ******************************************************************************/

summarized_Importance_FC = summarized_Importance_FC
  .distinct("Group_ID");


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!output_Bool) {
  
  // Data examination.
  print(
    "summarized_Importance_FC:",
    summarized_Importance_FC.first(), // 9 properties.
    summarized_Importance_FC.size(), // 115208 <= 1693 * 14 * 7 (groups).
    summarized_Importance_FC.limit(20)
  );
  
} else {
  
  // Export the result(s).
  
  var outputName_Str = "SummarizedImportance_Distinct";
  
  Export.table.toAsset({
    collection: summarized_Importance_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}


