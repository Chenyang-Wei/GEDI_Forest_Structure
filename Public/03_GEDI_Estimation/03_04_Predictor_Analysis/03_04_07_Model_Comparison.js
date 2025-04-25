/*******************************************************************************
 * Introduction *
 * 
 *  1) For each drawing of a selected non-overlapping tile, 
 *     quantify the contribution of each group of predictors
 *     in modeling a response variable.
 * 
 * Last updated: 10/8/2024
 * 
 * Runtime: ~1m
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

// Predictor group names.
var predictorGroups_List = 
  ENA_mod.predictorGroups_List;

// Property name(s).
var tileID_Name_Str = "Tile_ID";

// Filter(s).
var tileID_Matching_Filter = ee.Filter.equals({
  leftField: tileID_Name_Str, 
  rightField: tileID_Name_Str
});

// Number of drawings.
var drawingNumber_Num = 10;

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Compare the complete and partial models.
function Compare_Models(modelComparison_Ftr) {
  
  // Assessment result of the complete model.
  var R2_Complete_Num = modelComparison_Ftr
    .get("R_squared");
  
  var RMSE_Complete_Num = modelComparison_Ftr
    .get("RMSE");
  
  // Assessment result of the partial model.
  var partialResult_Ftr = ee.Feature(
    modelComparison_Ftr
      .get(R2_Name_Str)
  );
  
  var R2_Partial_Num = partialResult_Ftr
    .get("R_squared");
  
  var RMSE_Partial_Num = partialResult_Ftr
    .get("RMSE");
  
  // Calculate the differences.
  var d_R2_Num = ee.Number(R2_Complete_Num)
    .subtract(R2_Partial_Num);
  
  var d_RMSE_Num = ee.Number(RMSE_Complete_Num)
    .subtract(RMSE_Partial_Num);
  
  modelComparison_Ftr = modelComparison_Ftr
    .set(
      R2_Name_Str, d_R2_Num,
      RMSE_Name_Str, d_RMSE_Num
    );
  
  return modelComparison_Ftr;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) For each drawing of a selected non-overlapping tile, 
 *    quantify the contribution of each group of predictors
 *    in modeling a response variable. *
 ******************************************************************************/

for (var responseVarID_Num = 11; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  for (var drawingID_Num = 1; drawingID_Num <= drawingNumber_Num; 
    drawingID_Num ++) {
    
    // Load the result of the complete model.
    var completeModel_FC = ee.FeatureCollection(
      wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + "Modeling_Results/"
      + responseVarName_Str + "/"
      + "Drawing" + drawingID_Num + "_Complete"
    );
    
    // Prepare the result for model comparison.
    var modelComparison_FC = completeModel_FC;
    
    for (var groupID_Num = 0; groupID_Num < 7; 
      groupID_Num ++) {
      
      // Determine a group of predictors to exclude.
      var excludedGroup_Str = 
        predictorGroups_List[groupID_Num];
      
      // Load the result of the corresponding partial model.
      var partialModel_FC = ee.FeatureCollection(
        wd_Main_1_Str
        + "GEDI_Estimation/"
        + "Predictor_Comparison/"
        + "Modeling_Results/"
        + responseVarName_Str + "/"
        + "Drawing" + drawingID_Num + "_" + excludedGroup_Str
      );
      
      // Names of the difference properties.
      var R2_Name_Str = "d_R2_" + excludedGroup_Str;
      
      var RMSE_Name_Str = "d_RMSE_" + excludedGroup_Str;
      
      // Join the results of each tile.
      var saveFirst_Join = ee.Join.saveFirst({
        matchKey: R2_Name_Str
      });
      
      modelComparison_FC = saveFirst_Join.apply({
        primary: modelComparison_FC, 
        secondary: partialModel_FC, 
        condition: tileID_Matching_Filter
      });
      
      // Compare the complete and partial models.
      modelComparison_FC = modelComparison_FC
        .map(Compare_Models);
    }
    
    
    /**** Export the results. ****/
    
    if (export_Bool) {
      
      var outputName_Str = "Drawing"
        + drawingID_Num
        + "_Comparison";
      
      Export.table.toAsset({
        collection: modelComparison_FC, 
        description: outputName_Str, 
        assetId: wd_Main_1_Str
          + "GEDI_Estimation/"
          + "Predictor_Comparison/"
          + "Modeling_Results/"
          + responseVarName_Str + "/"
          + outputName_Str
      });
    }
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("completeModel_FC:", 
    completeModel_FC.size(), // 30.
    completeModel_FC.first());
  
  print("partialModel_FC:", // Excluded_Group: Soil.
    partialModel_FC.size(), // 30.
    partialModel_FC.first());
}

