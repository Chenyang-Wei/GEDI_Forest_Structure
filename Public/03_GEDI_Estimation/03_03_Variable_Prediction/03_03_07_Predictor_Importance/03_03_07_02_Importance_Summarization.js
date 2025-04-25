/*******************************************************************************
 * Introduction *
 * 
 *  1) Summarize the variable importance of each predictor group 
 *     for each tile and each response variable.
 * 
 * Last updated: 10/28/2024
 * 
 * Runtime: 4h
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

// Create a unique "group ID" property.
function Create_GroupID(accuracy_OneVarTile_Ftr) {
  
  var groupID_Str = accuracy_OneVarTile_Ftr.getString("Response_Var")
    .cat("_")
    .cat(accuracy_OneVarTile_Ftr.getNumber("Tile_ID").toInt())
    .cat("_")
    .cat(accuracy_OneVarTile_Ftr.getString("Pred_Grp"));
  
  return accuracy_OneVarTile_Ftr.set({
    Group_ID: groupID_Str
  });
}

// Convert the summarized variable importance to a FeatureCollection.
function Convert_To_Feature(summarized_Importance_Dict) {
  
  summarized_Importance_Dict = ee.Dictionary(
    summarized_Importance_Dict
  );
  
  // Extract the group ID.
  var groupID_Str = summarized_Importance_Dict
    .getString("Group_ID");
  
  // Extract the summarization results.
  var groupImportance_Mean_Num = summarized_Importance_Dict
    .getNumber("mean");
  var groupImportance_Count_Num = summarized_Importance_Dict
    .getNumber("count");
  var groupImportance_Sum_Num = summarized_Importance_Dict
    .getNumber("sum");
  
  // Construct a Feature.
  var summarized_Importance_Ftr = ee.Feature(null)
    .set({
      Group_ID: groupID_Str,
      GrpImpt_Mean: groupImportance_Mean_Num,
      GrpImpt_Count: groupImportance_Count_Num,
      GrpImpt_Sum: groupImportance_Sum_Num
    });
  
  return summarized_Importance_Ftr;
}

// Add the corresponding tile information.
function Add_TileInfo(joined_Ftr) {
  
  var summarized_Importance_Ftr = ee.Feature(
    joined_Ftr.get("Joined")
  );
  
  var tile_Ftr = joined_Ftr.set({
    GrpImpt_Mean: summarized_Importance_Ftr.getNumber("GrpImpt_Mean"),
    GrpImpt_Count: summarized_Importance_Ftr.getNumber("GrpImpt_Count"),
    GrpImpt_Sum: summarized_Importance_Ftr.getNumber("GrpImpt_Sum")
  });
  
  return tile_Ftr;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Re-arranged accuracy assessment of all response variables and tiles.
var accuracy_AllVarsTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "RearrangedAccuracy_AllResponseVars");


/*******************************************************************************
 * 1) Summarize the variable importance of each predictor group 
 *    for each tile and each response variable. *
 ******************************************************************************/

// Create a unique ID for each combination of predictor group, tile, and 
//   response variable.
accuracy_AllVarsTiles_FC = accuracy_AllVarsTiles_FC.map(
  Create_GroupID
);

// Create a combined Reducer for summarization.
var meanCountSum_Reducer = ee.Reducer.mean()
  .combine({
    reducer2: ee.Reducer.count(), 
    sharedInputs: true
  })
  .combine({
    reducer2: ee.Reducer.sum(), 
    sharedInputs: true
  });

// Summarize the variable importance for each predictor group.
var inputProperties_List = ["Group_ID", "Var_Impt"];

var summarized_Importance_List = accuracy_AllVarsTiles_FC
  .filter(ee.Filter.notNull(inputProperties_List))
  // Include only Features with non-null entries for selected properties.
  .reduceColumns({
    reducer: meanCountSum_Reducer.group({
      groupField: 0, 
      groupName: "Group_ID"
    }), 
    selectors: inputProperties_List
  }).get("groups");

// Convert the summarized variable importance to a FeatureCollection.
summarized_Importance_List = ee.List(summarized_Importance_List)
  .map(Convert_To_Feature);

var summarized_Importance_FC = ee.FeatureCollection(
  summarized_Importance_List
);

// Join the result to the corresponding tile.
accuracy_AllVarsTiles_FC = accuracy_AllVarsTiles_FC
  .select([
    "Group_ID", "Tile_ID", "Pred_Grp", "R.*"
  ]);

var saveFirst_Join = ee.Join.saveFirst({
  matchKey: "Joined"
});

var groupID_Matching_Filter = ee.Filter.equals({
  leftField: "Group_ID", 
  rightField: "Group_ID"
});

summarized_Importance_FC = saveFirst_Join.apply({
  primary: accuracy_AllVarsTiles_FC, 
  secondary: summarized_Importance_FC, 
  condition: groupID_Matching_Filter
});

// Add the corresponding tile information.
summarized_Importance_FC = summarized_Importance_FC
  .map(Add_TileInfo);

summarized_Importance_FC = summarized_Importance_FC
  .select([
    "G.*", "Tile_ID", "Pred_Grp", "R.*"
  ]);


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!output_Bool) {
  
  // Data examination.
  print(
    "accuracy_AllVarsTiles_FC:",
    accuracy_AllVarsTiles_FC.first(),
    accuracy_AllVarsTiles_FC.size() // 474040 = 1693 * 14 * 20.
  );
  
  print(
    "summarized_Importance_FC:",
    summarized_Importance_FC.first() // 9 properties.
  );
  
} else {
  
  // Export the result(s).
  
  var outputName_Str = "SummarizedImportance_AllResponseVars";
  
  Export.table.toAsset({
    collection: summarized_Importance_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}


