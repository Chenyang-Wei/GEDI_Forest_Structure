/*******************************************************************************
 * Introduction *
 * 
 *  1) For each tile and each response variable, 
 *     aggregate the local testing results of global models
 *     for all 10 drawings.
 * 
 * Last updated: 6/11/2025
 * 
 * Runtime: <1m
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

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// To perform the aggregation by tile.
function Aggregate_ByTile(tileID_Num) {
  
  var tileID_Filter = ee.Filter.eq({
    name: "Tile_ID", 
    value: tileID_Num
  });
  
  // Derive a single tile.
  var singleTile_Ftr = selectedTiles_FC
    .filter(tileID_Filter)
    .first();
  
  // Identify the local testing results of a single tile.
  var testingResults_OneTile_AllVars_FC = testingResults_AllTiles_AllVars_FC
    .filter(tileID_Filter);
  
  // Aggregate the properties of interest.
  var aggregated_OneTile_AllVars_List = testingResults_OneTile_AllVars_FC
    .reduceColumns({
      reducer: meanSD_Reducer.repeat(
        propertiesToAggregate_List.size()
      ).group({
        groupField: 0, 
        groupName: "Response_V"
      }), 
      selectors: ee.List(["Response_V"])
        .cat(propertiesToAggregate_List)
        // Select the properties of interest.
    }).get("groups");
  
  // Convert the aggregation result to a FeatureCollection.
  aggregated_OneTile_AllVars_List = ee.List(aggregated_OneTile_AllVars_List)
    .map(
      function Convert_To_Feature(aggregated_OneTile_OneVar_Dict) {
        
        aggregated_OneTile_OneVar_Dict = ee.Dictionary(
          aggregated_OneTile_OneVar_Dict
        );
        
        // Extract the response variable name.
        var responseVar_Str = aggregated_OneTile_OneVar_Dict
          .getString("Response_V");
        
        // Convert the mean List to a Dictionary.
        var mean_Values_List = aggregated_OneTile_OneVar_Dict
          .get("mean");
        
        var mean_Properties_Dict = ee.Dictionary.fromLists({
          keys: mean_Names_List, 
          values: mean_Values_List
        });
        
        // Convert the SD List to a Dictionary.
        var sd_Values_List = aggregated_OneTile_OneVar_Dict
          .get("stdDev");
        
        var sd_Properties_Dict = ee.Dictionary.fromLists({
          keys: sd_Names_List, 
          values: sd_Values_List
        });
        
        var aggregated_OneTile_OneVar_Ftr = singleTile_Ftr
          .set({
            Response_V: responseVar_Str
          })
          .set(mean_Properties_Dict)
          .set(sd_Properties_Dict);
        
        return aggregated_OneTile_OneVar_Ftr;
      }
    );
  
  var aggregated_OneTile_AllVars_FC = ee.FeatureCollection(
    aggregated_OneTile_AllVars_List
  );
  
  return aggregated_OneTile_AllVars_FC;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles")
  .select(["Tile_ID"]);

// Local testing results of all 30 tiles and 
//   all 14 response variables.
var testingResults_AllTiles_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Model_Comparison/"
  + "GlobalModels_LocallyTested/"
  + "globalModels_AllResponseVars"
);


/*******************************************************************************
* 1) For each tile and each response variable, 
*    aggregate the local testing results of global models
*    for all 10 drawings. *
******************************************************************************/

// Determine a List of properties to aggregate.
var propertiesToAggregate_List = ee.List([
  "R_squared",
  "RMSE"
]);

// Create a mean and SD Reducer for aggregation.
var meanSD_Reducer = ee.Reducer.mean()
  .combine({
    reducer2: ee.Reducer.stdDev(), 
    sharedInputs: true
  });

// Determine names of the aggregated properties.
var mean_Names_List = ee.List([
  "GloR2_mn",
  "GloRMSE_mn"
]);

var sd_Names_List = ee.List([
  "GloR2_sd",
  "GloRMSE_sd"
]);

// Derive a List of the tile IDs.
var tileIDs_List = selectedTiles_FC
  .aggregate_array("Tile_ID")
  .sort();

// Aggregate the local testing results by tile.
var aggregated_AllTiles_AllVars_List = tileIDs_List.map(
  Aggregate_ByTile
);

// Convert the aggregation results to a FeatureCollection.
var aggregated_AllTiles_AllVars_FC = ee.FeatureCollection(
  aggregated_AllTiles_AllVars_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the object(s) and dataset(s) of interest.
  print(
    "propertiesToAggregate_List:",
    propertiesToAggregate_List,
    "mean_Names_List:",
    mean_Names_List,
    "sd_Names_List:",
    sd_Names_List
  );

  print(
    "testingResults_AllTiles_AllVars_FC:", 
    testingResults_AllTiles_AllVars_FC.size(), // 4200 = 14 * 30 * 10.
    testingResults_AllTiles_AllVars_FC.first()
  );
  
  print(
    "aggregated_AllTiles_AllVars_FC:",
    aggregated_AllTiles_AllVars_FC.size(), // 420 = 14 * 30.
    aggregated_AllTiles_AllVars_FC.first()
  );

} else {
  
  // Export the result(s).
  var outputName_Str = "globalModels_Aggregated";
  
  Export.table.toAsset({
    collection: aggregated_AllTiles_AllVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Model_Comparison/"
      + "GlobalModels_LocallyTested/"
      + outputName_Str
  });
}

