/*******************************************************************************
 * Introduction *
 * 
 *  1) Re-arrange the variable importance for each tile 
 *     and each response variable.
 * 
 * Last updated: 10/28/2024
 * 
 * Runtime: 3h
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

// Number of the top-ranked predictors in each RF model.
var topVarNumber_Num = 20;

// Groups of all predictors.
var predictorGroups_Dict = ee.Dictionary({
  "B2": "L8",
  "B3": "L8",
  "B4": "L8",
  "B5": "L8",
  "B6": "L8",
  "B7": "L8",
  "NDVI": "L8",
  "kNDVI": "L8",
  "NIRv": "L8",
  "EVI": "L8",
  "NDWI": "L8",
  "mNDWI": "L8",
  "NBR": "L8",
  "BSI": "L8",
  "SI": "L8",
  "BU": "L8",
  "Brightness": "L8",
  "Greenness": "L8",
  "Wetness": "L8",
  "SR_B2": "S2",
  "SR_B3": "S2",
  "SR_B4": "S2",
  "SR_B8": "S2",
  "S2_B5": "S2",
  "S2_B6": "S2",
  "S2_B7": "S2",
  "S2_B8A": "S2",
  "S2_B11": "S2",
  "S2_B12": "S2",
  "S2_NDVI": "S2",
  "S2_kNDVI": "S2",
  "S2_NIRv": "S2",
  "S2_EVI": "S2",
  "S2_NDWI": "S2",
  "S2_mNDWI": "S2",
  "S2_NBR": "S2",
  "S2_BSI": "S2",
  "S2_SI": "S2",
  "S2_BU": "S2",
  "S2_Brightness": "S2",
  "S2_Greenness": "S2",
  "S2_Wetness": "S2",
  "VV_median": "S1",
  "VH_median": "S1",
  "VH_VV_ratio": "S1",
  "NDRI": "S1",
  "RVI": "S1",
  "Elevation": "TP",
  "Slope": "TP",
  "Aspect": "TP",
  "East-westness": "TP",
  "North-southness": "TP",
  "CHILI": "TP",
  "mTPI": "TP",
  "Topo_Diversity": "TP",
  "Landform": "TP",
  "LandCover_ESRI": "LC",
  "LandCover_GLC": "LC",
  "SLA": "LT",
  "LNC": "LT",
  "LPC": "LT",
  "LDMC": "LT",
  "bdod_0-5cm_mean": "SP",
  "cec_0-5cm_mean": "SP",
  "cfvo_0-5cm_mean": "SP",
  "clay_0-5cm_mean": "SP",
  "sand_0-5cm_mean": "SP",
  "silt_0-5cm_mean": "SP",
  "nitrogen_0-5cm_mean": "SP",
  "phh2o_0-5cm_mean": "SP",
  "soc_0-5cm_mean": "SP",
  "ocd_0-5cm_mean": "SP",
  "bdod_5-15cm_mean": "SP",
  "cec_5-15cm_mean": "SP",
  "cfvo_5-15cm_mean": "SP",
  "clay_5-15cm_mean": "SP",
  "sand_5-15cm_mean": "SP",
  "silt_5-15cm_mean": "SP",
  "nitrogen_5-15cm_mean": "SP",
  "phh2o_5-15cm_mean": "SP",
  "soc_5-15cm_mean": "SP",
  "ocd_5-15cm_mean": "SP",
  "bdod_15-30cm_mean": "SP",
  "cec_15-30cm_mean": "SP",
  "cfvo_15-30cm_mean": "SP",
  "clay_15-30cm_mean": "SP",
  "sand_15-30cm_mean": "SP",
  "silt_15-30cm_mean": "SP",
  "nitrogen_15-30cm_mean": "SP",
  "phh2o_15-30cm_mean": "SP",
  "soc_15-30cm_mean": "SP",
  "ocd_15-30cm_mean": "SP",
  "ocs_0-30cm_mean": "SP"
});

// Whether to output the result(s).
var output_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Create property names for the top-ranked predictors and their importance.
function Create_ImportanceName(topVarID_Num) {
  
  topVarID_Num = ee.Number(topVarID_Num).toInt();
  
  var topVarID_Str = ee.String(topVarID_Num);
  
  var topVar_Str = ee.String("Var").cat(topVarID_Str);
  
  var topVarName_Str = topVar_Str.cat("_Name");
  
  var topVarImportance_Str = topVar_Str.cat("_Importance");
  
  return ee.List([
    topVarID_Num,
    topVarName_Str,
    topVarImportance_Str
  ]);
}

// Re-arrange the properties of the top-ranked predictors and their importance.
function Rearrange_Properties(raw_Accuracy_OneVarTile_Ftr) {
  
  var rearranged_Accuracy_OneVarTile_Ftr = raw_Accuracy_OneVarTile_Ftr
    .select(["Tile_ID", "R.*"]);
  
  var rearranged_Accuracy_OneVarTile_FC = importanceNames_List
    .map(
      function Extract_ImportanceNames(importanceName_List) {
        
        var varRank_Num = ee.List(importanceName_List).get(0);
        
        // Derive the property names.
        var name_Str = ee.List(importanceName_List).get(1);
        var importance_Str = ee.List(importanceName_List).get(2);
        
        // Extract the property values.
        var varName_Str = raw_Accuracy_OneVarTile_Ftr.get(name_Str);
        var varImportance_Num = raw_Accuracy_OneVarTile_Ftr.get(importance_Str);
        
        // Determine the predictor group.
        var predictorGroup_Str = predictorGroups_Dict.getString(varName_Str);
        
        return rearranged_Accuracy_OneVarTile_Ftr.set({
          Pred_Grp: predictorGroup_Str,
          Var_Rank: varRank_Num,
          Var_Name: varName_Str,
          Var_Impt: varImportance_Num
        });
      }
    );
  
  return ee.FeatureCollection(rearranged_Accuracy_OneVarTile_FC);
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Accuracy assessment of all response variables and tiles.
var raw_Accuracy_AllVarsTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Accuracy_AllResponseVars");


/*******************************************************************************
 * 1) Re-arrange the variable importance for each tile 
 *    and each response variable. *
 ******************************************************************************/

// Name the properties of the top-ranked predictors and their importance.
var topVarIDs_List = ee.List.sequence({
  start: 1, 
  end: topVarNumber_Num
});

var importanceNames_List = topVarIDs_List.map(
  Create_ImportanceName
);

// Re-arrange the top-ranked predictors and their importance.
var rearranged_Accuracy_AllVarsTiles_FC = raw_Accuracy_AllVarsTiles_FC.map(
  Rearrange_Properties
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!output_Bool) {
  
  // Data examination.
  print(
    "importanceNames_List",
    importanceNames_List
  );
  
  print(
    "raw_Accuracy_AllVarsTiles_FC:",
    raw_Accuracy_AllVarsTiles_FC.first(),
    raw_Accuracy_AllVarsTiles_FC.size() // 23702 = 1693 * 14.
  );
  
  print(
    "rearranged_Accuracy_AllVarsTiles_FC:",
    rearranged_Accuracy_AllVarsTiles_FC.first(), // 8 properties.
    rearranged_Accuracy_AllVarsTiles_FC.size() // 474040 = 23702 * 20.
  );
  
} else {
  
  // Export the result(s).
  
  var outputName_Str = "RearrangedAccuracy_AllResponseVars";
  
  Export.table.toAsset({
    collection: rearranged_Accuracy_AllVarsTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}

