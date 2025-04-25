/*******************************************************************************
 * Introduction *
 * 
 *  1) For each tile and each response variable,
 *     rank predictor groups based on their summarized
 *     variable importance.
 * 
 * Last updated: 11/11/2024
 * 
 * Runtime: 5m
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

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Whether to output the result(s).
var output_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Raw accuracy assessment of all response variables and tiles.
var raw_Accuracy_AllVarsTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Accuracy_AllResponseVars");

// Distinct summarized variable importance of each predictor group.
var summarized_Importance_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "SummarizedImportance_CountRatio");


/*******************************************************************************
 * 1) For each tile and each response variable,
 *    rank predictor groups based on their summarized
 *    variable importance. *
 ******************************************************************************/

// Create an empty List to store the ranking results.
var ranked_AllResponseVars_List = ee.List([]);

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable name.
  var responseVar_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  var summarizedImportance_OneVar_FC = summarized_Importance_FC
    .filter(ee.Filter.eq("Response_Var", responseVar_Str));
  
  var raw_Tiles_FC = raw_Accuracy_AllVarsTiles_FC
    .filter(ee.Filter.eq("Response_Var", responseVar_Str))
    .select(["Tile_ID"]);
  
  // print(raw_Tiles_FC.first())
  
  // Choose a ranking metric.
  var inputProperties_List = ["Tile_ID", "GrpImpt_Mean", "Pred_Grp"];
  // var inputProperties_List = ["Tile_ID", "GrpImpt_Sum", "Pred_Grp"];
  // var inputProperties_List = ["Tile_ID", "GrpImpt_Count", "Pred_Grp"];
  // var inputProperties_List = ["Tile_ID", "GrpImpt_CountRatio", "Pred_Grp"];
  
  // Rank the group importance.
  var ranked_List = summarizedImportance_OneVar_FC
    .filter(ee.Filter.notNull(inputProperties_List))
    // Include only Features with non-null entries for selected properties.
    .reduceColumns({
      reducer: ee.Reducer.max({numInputs: 2}).group({
        groupField: 0, 
        groupName: "Tile_ID"
      }), 
      selectors: inputProperties_List
    }).get("groups");
  
  ranked_List = ee.List(ranked_List)
    .map(function Convert_To_Feature(summarized_Importance_Dict) {
      
      summarized_Importance_Dict = ee.Dictionary(
        summarized_Importance_Dict
      );
      
      // Extract the tile ID.
      var tileID_Num = summarized_Importance_Dict
        .getNumber("Tile_ID");
      
      // Extract the ranking results.
      var topValue_Num = summarized_Importance_Dict
        .getNumber("max");
      var topGroup_Num = summarized_Importance_Dict
        .getString("max1");
      
      // Construct a Feature.
      var topRanked_Ftr = ee.Feature(null)
        .set({
          Tile_ID: tileID_Num,
          Top_Value: topValue_Num,
          Top_Group: topGroup_Num
        });
      
      return topRanked_Ftr;
    });
  
  // print(ranked_List)
  
  var ranked_FC = ee.FeatureCollection(
    ranked_List
  );
  
  // Join the result to the corresponding tile.
  var saveFirst_Join = ee.Join.saveFirst({
    matchKey: "Joined"
  });
  
  var tileID_Matching_Filter = ee.Filter.equals({
    leftField: "Tile_ID", 
    rightField: "Tile_ID"
  });
  
  ranked_FC = saveFirst_Join.apply({
    primary: raw_Tiles_FC, 
    secondary: ranked_FC, 
    condition: tileID_Matching_Filter
  });
  
  // Add the corresponding tile information.
  ranked_FC = ranked_FC
    .map(function Add_TileInfo(joined_Ftr) {
    
      var summarized_Importance_Ftr = ee.Feature(
        joined_Ftr.get("Joined")
      );
      
      var tile_Ftr = joined_Ftr.set({
        Top_Group: summarized_Importance_Ftr.getString("Top_Group"),
        Top_Value: summarized_Importance_Ftr.getNumber("Top_Value")
      });
      
      return tile_Ftr;
    });
  
  // IDs of all predictor groups.
  var predictorGroups_Dict = ee.Dictionary({
    "L8": 1,
    "S2": 2,
    "S1": 3,
    "TP": 4,
    "LC": 5,
    "LT": 6,
    "SP": 7
  });
  
  ranked_FC = ranked_FC.map(
    function Assign_GroupID(ranked_Ftr) {
      
      var topGroup_Str = ranked_Ftr.getString("Top_Group");
      
      var topGroupID_Num = predictorGroups_Dict.getNumber(topGroup_Str);
      
      return ranked_Ftr.set({
        Top_GrpID: topGroupID_Num,
        Response_Var: responseVar_Str
      });
    }
  );
  
  // Select the properties of interest.
  ranked_FC = ranked_FC.select(["T.*", "Response_Var"]);
  
  // print(ranked_FC.first(),
  //   ranked_FC.size());
  
  ranked_AllResponseVars_List = ranked_AllResponseVars_List
    .add(ranked_FC);
  
  
  /*******************************************************************************
   * Results *
   ******************************************************************************/
  
  if (!output_Bool) {
    
    // // Data examination.
    // print(
    //   "summarized_Importance_FC:",
    //   summarized_Importance_FC.first(),
    //   summarized_Importance_FC.size(), // 115208 <= 1693 * 14 * 7 (groups).
    //   summarized_Importance_FC.limit(20)
    // );
    
    // print(
    //   "summarizedImportance_OneVar_FC:",
    //   summarizedImportance_OneVar_FC.first(),
    //   summarizedImportance_OneVar_FC.size()
    // );
    
    // Visualization.
    var empty_Img = ee.Image().toShort();
    
    var top_GroupID_Img = empty_Img.paint({
      featureCollection: ranked_FC, 
      color: "Top_GrpID"
    });
    
    // Map visualization.
    Map.setOptions("Satellite");
    Map.setCenter(-78.083, 40.167, 6);
  
    Map.addLayer(top_GroupID_Img, 
      {
        min: 1,
        max: 7,
        palette: "#e41a1c, #377eb8, #4daf4a," 
          + "#984ea3, #ff7f00, #ffff33, #a65628"
      }, 
      "Top-1 Predictor Group",
      true);
  }
}

// Convert the merging result to a FeatureCollection.
var ranked_AllResponseVars_FC = ee.FeatureCollection(
  ranked_AllResponseVars_List)
  .flatten();

// print(ranked_AllResponseVars_FC.first(),
//   ranked_AllResponseVars_FC.size()); // 23702 = 1693 * 14.

if (output_Bool) {

  /**** Export the result(s). ****/
  
  var outputName_Str = "PredictorGroup_AverageImportance";
  
  Export.table.toAsset({
    collection: ranked_AllResponseVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
  
  Export.table.toDrive({
    collection: ranked_AllResponseVars_FC, 
    description: outputName_Str, 
    folder: outputName_Str, 
    fileFormat: "SHP"
  });
}
