/*******************************************************************************
 * Introduction *
 * 
 *  1) For each response variable, 
 *     compare the estimation accuracy between
 *     its global and local models.
 * 
 * Last updated: 10/22/2024
 * 
 * Runtime: N/A
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");

var PAL_mod = require(
  "users/gena/packages:palettes");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_FU_Str;

// Names of all response variables.
var allVarNames_List = 
  ENA_mod.allResponseVarNames_List; 

// Whether to display the result(s).
var display_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Local modeling results of all response variables.
var local_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "Modeling_Results/"
  + "ModelComparison_Aggregated"
);

// Global modeling results of all response variables.
var global_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Model_Comparison/"
  + "All_SelectedTiles/"
  + "CompleteModel_Aggregated"
);


/*******************************************************************************
 * 1) For each response variable, 
 *    visualize the predictor comparison result. *
 ******************************************************************************/

var local_HighR2s_List = ee.List([]);
var local_LowRMSEs_List = ee.List([]);

for (var varID_Num = 0; varID_Num < allVarNames_List.length; 
  varID_Num ++) {

  // Determine the response variable for visualization.
  var varName_Str = 
    allVarNames_List[varID_Num];
  
  // Extract the results of the corresponding local and global models.
  var local_OneVar_FC = local_AllVars_FC
    .filter(ee.Filter.eq("Response_Var", varName_Str));
  
  var global_OneVar_FC = global_AllVars_FC
    .filter(ee.Filter.eq("Response_Var", varName_Str))
    .first();
  
  var global_R2_Num = global_OneVar_FC.get("Mean_R_squared");
  
  var global_RMSE_Num = global_OneVar_FC.get("Mean_RMSE");
  
  // Compare the local model results again the global model results.
  var local_HighR2_Num = local_OneVar_FC.filter(ee.Filter.gte({
    name: "Mean_R_squared", 
    value: global_R2_Num
  }))
  .size().divide(30);
  
  var local_LowRMSE_Num = local_OneVar_FC.filter(ee.Filter.lte({
    name: "Mean_RMSE", 
    value: global_RMSE_Num
  }))
  .size().divide(30);
  
  local_HighR2s_List = local_HighR2s_List
    .add(local_HighR2_Num);
  
  local_LowRMSEs_List = local_LowRMSEs_List
    .add(local_LowRMSE_Num);
  
  local_HighR2_Num = local_HighR2_Num
    .multiply(1e2).round().divide(1e2);
  
  local_LowRMSE_Num = local_LowRMSE_Num
    .multiply(1e2).round().divide(1e2);
  
  // print(local_HighR2_Num, local_LowRMSE_Num);
  
  // Make a histogram of R-squared.
  var R2_OneVar_Chart =
    ui.Chart.feature
      .histogram({
        features: local_OneVar_FC, 
        property: "Mean_R_squared", 
        maxBuckets: 20
      })
      .setOptions({
        title: varName_Str
          + " (global model: " + ee.Number(global_R2_Num)
            .multiply(1e3).round().divide(1e3).getInfo() + ","
          + " local improvement: " + local_HighR2_Num.getInfo() + ")",
        titleTextStyle: {italic: true, bold: true},
        hAxis: {
          title: "R-squared", 
          titleTextStyle: {italic: false, bold: true}
        },
        vAxis: {
          title: "Tile count",
          titleTextStyle: {italic: false, bold: true}
        },
        fontName: "arial",
        fontSize: 24,
        pointSize: 12,
        colors: ["228B22"],
        legend: {position: "none"},
        explorer: {}
      });

  // Make a histogram of RMSE.
  var RMSE_OneVar_Chart =
    ui.Chart.feature
      .histogram({
        features: local_OneVar_FC, 
        property: "Mean_RMSE", 
        maxBuckets: 20
      })
      .setOptions({
        title: varName_Str 
          + " (global model: " + ee.Number(global_RMSE_Num)
            .multiply(1e4).round().divide(1e4).getInfo() + ","
          + " local improvement: " + local_LowRMSE_Num.getInfo() + ")",
        titleTextStyle: {italic: true, bold: true},
        hAxis: {
          title: "RMSE", 
          titleTextStyle: {italic: false, bold: true}
        },
        vAxis: {
          title: "Tile count",
          titleTextStyle: {italic: false, bold: true}
        },
        fontName: "arial",
        fontSize: 24,
        pointSize: 12,
        colors: ["FF6700"],
        legend: {position: "none"},
        explorer: {}
      });
  
  if (display_Bool) {
    
    print(R2_OneVar_Chart,
      RMSE_OneVar_Chart);
  }
}

if (display_Bool) {
  
  print("local_AllVars_FC:",
    local_AllVars_FC.first(),
    local_AllVars_FC.size());
  
  print("global_AllVars_FC:",
    global_AllVars_FC.first(),
    global_AllVars_FC.size());
    
  print(
    "local_HighR2s:",
    local_HighR2s_List.reduce(ee.Reducer.mean()),
    "local_LowRMSEs:",
    local_LowRMSEs_List.reduce(ee.Reducer.mean())
  );
}

