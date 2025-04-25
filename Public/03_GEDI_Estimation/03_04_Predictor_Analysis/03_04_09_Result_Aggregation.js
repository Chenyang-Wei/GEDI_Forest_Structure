/*******************************************************************************
 * Introduction *
 * 
 *  1) For each tile and each response variable, 
 *     aggregate the model comparison results 
 *     of all 10 drawings.
 * 
 * Last updated: 10/8/2024
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

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Model comparison results of all tiles.
var modelComparison_AllTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "Modeling_Results/"
  + "ModelComparison_10drawings"
);


/*******************************************************************************
 * 1) For each tile and each response variable, 
 *    aggregate the model comparison results 
 *    of all 10 drawings. *
 ******************************************************************************/

// Determine a List of properties to aggregate.
var propertiesToAggregate_List = modelComparison_AllTiles_FC
  .select("d.*")
  .first()
  .propertyNames();

propertiesToAggregate_List = propertiesToAggregate_List
  .remove("system:index")
  .sort();

propertiesToAggregate_List = ee.List([
  "R_squared",
  "RMSE"
]).cat(propertiesToAggregate_List);

// Create a mean and SD Reducer for aggregation.
var meanSD_Reducer = ee.Reducer.mean()
  .combine({
    reducer2: ee.Reducer.stdDev(), 
    sharedInputs: true
  });

// Determine names of the aggregated properties.
var mean_Names_List = propertiesToAggregate_List.map(
  function Rename_Means(propertyToAggregate_Str) {
    
    return ee.String("Mean_").cat(propertyToAggregate_Str);
  }
);

var sd_Names_List = propertiesToAggregate_List.map(
  function Rename_SDs(propertyToAggregate_Str) {
    
    return ee.String("SD_").cat(propertyToAggregate_Str);
  }
);

// Derive a List of the tile IDs.
var tileIDs_List = selectedTiles_FC
  .aggregate_array("Tile_ID")
  .sort();

// Aggregate the model comparison results of all 10 drawings by tile.
var aggregated_AllTiles_List = tileIDs_List.map(
  function Aggregate_ByTile(tileID_Num) {
    
    var tileID_Filter = ee.Filter.eq({
      name: "Tile_ID", 
      value: tileID_Num
    });
    
    // Derive a single tile.
    var singleTile_Ftr = selectedTiles_FC
      .filter(tileID_Filter)
      .first();
    
    // Identify the model comparison results of the single tile.
    var modelComparison_OneTile_FC = modelComparison_AllTiles_FC
      .filter(tileID_Filter);
    
    // Aggregate the properties of interest.
    var aggregated_OneTile_List = modelComparison_OneTile_FC
      .reduceColumns({
        reducer: meanSD_Reducer.repeat(
          propertiesToAggregate_List.size()
        ).group({
          groupField: 0, 
          groupName: "Response_Var"
        }), 
        selectors: ee.List(["Response_Var"])
          .cat(propertiesToAggregate_List)
      }).get("groups");
    
    // Convert the aggregation result to a FeatureCollection.
    aggregated_OneTile_List = ee.List(aggregated_OneTile_List)
      .map(
        function Convert_To_Feature(aggregated_OneVar_Dict) {
          
          aggregated_OneVar_Dict = ee.Dictionary(
            aggregated_OneVar_Dict
          );
          
          // Extract the response variable name.
          var responseVar_Str = aggregated_OneVar_Dict
            .getString("Response_Var");
          
          // Convert the mean List to a Dictionary.
          var mean_Values_List = aggregated_OneVar_Dict
            .get("mean");
          
          var mean_Properties_Dict = ee.Dictionary.fromLists({
            keys: mean_Names_List, 
            values: mean_Values_List
          });
          
          // Convert the SD List to a Dictionary.
          var sd_Values_List = aggregated_OneVar_Dict
            .get("stdDev");
          
          var sd_Properties_Dict = ee.Dictionary.fromLists({
            keys: sd_Names_List, 
            values: sd_Values_List
          });
          
          var aggregated_OneVar_Ftr = singleTile_Ftr
            .set({
              Response_Var: responseVar_Str
            })
            .set(mean_Properties_Dict)
            .set(sd_Properties_Dict);
          
          return aggregated_OneVar_Ftr;
        }
      );
    
    var aggregated_OneTile_FC = ee.FeatureCollection(
      aggregated_OneTile_List
    );
    
    return aggregated_OneTile_FC;
  }
);

// Convert the aggregation result of all tiles to a FeatureCollection.
var aggregated_AllTiles_FC = ee.FeatureCollection(
  aggregated_AllTiles_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print(
    "propertiesToAggregate_List:",
    propertiesToAggregate_List,
    "mean_Names_List:",
    mean_Names_List,
    "sd_Names_List:",
    sd_Names_List
  );

  print(
    "modelComparison_AllTiles_FC:", 
    modelComparison_AllTiles_FC.size(), // 4200 = 14 * 30 * 10.
    modelComparison_AllTiles_FC.first()
  );
  
  print(
    "aggregated_AllTiles_FC:",
    aggregated_AllTiles_FC.size(), // 420 = 14 * 30.
    aggregated_AllTiles_FC.first()
  );

} else {
  
  // Export the result(s).
  var outputName_Str = "ModelComparison_Aggregated";
  
  Export.table.toAsset({
    collection: aggregated_AllTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + "Modeling_Results/"
      + outputName_Str
  });
}

