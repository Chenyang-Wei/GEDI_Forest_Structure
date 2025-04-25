/*******************************************************************************
 * Introduction *
 * 
 *  1) For each response variable, 
 *     aggregate the complete modeling results 
 *     of all 10 drawings.
 * 
 * Last updated: 10/22/2024
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

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

// Complete modeling results of all response variables.
var completeModel_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Model_Comparison/"
  + "All_SelectedTiles/"
  + "CompleteModel_AllResponseVars"
);


/*******************************************************************************
 * 1) For each response variable, 
 *    aggregate the complete modeling results 
 *    of all 10 drawings. *
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

// Aggregate the properties of interest for all 10 drawings.
var aggregated_AllVars_List = completeModel_FC
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
aggregated_AllVars_List = ee.List(aggregated_AllVars_List)
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
      
      var aggregated_OneVar_Ftr = ee.Feature(AOI_Geom)
        .set({
          Response_Var: responseVar_Str
        })
        .set(mean_Properties_Dict)
        .set(sd_Properties_Dict);
      
      return aggregated_OneVar_Ftr;
    }
  );

var aggregated_AllVars_FC = ee.FeatureCollection(
  aggregated_AllVars_List
);


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
    "completeModel_FC:", 
    completeModel_FC.size(), // 140 = 14 * 10.
    completeModel_FC.first()
  );
  
  print(
    "aggregated_AllVars_FC:",
    aggregated_AllVars_FC.size(), // 14.
    aggregated_AllVars_FC.first()
  );

} else {
  
  // Export the result(s).
  var outputName_Str = "CompleteModel_Aggregated";
  
  Export.table.toAsset({
    collection: aggregated_AllVars_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Model_Comparison/"
      + "All_SelectedTiles/"
      + outputName_Str
  });
}


