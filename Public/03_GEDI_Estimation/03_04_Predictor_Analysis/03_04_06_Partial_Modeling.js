/*******************************************************************************
 * Introduction *
 * 
 *  1) For each selected non-overlapping tile, 
 *     train and test Random Forest models for each drawing
 *     based on a subset of predictor variables.
 * 
 * Last updated: 10/8/2024
 * 
 * Runtime: <1m ~ 3m
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

var wd_Main_2_Str = ENA_mod.wd_Birds_Str;

// Property names.
var tileID_Name_Str = "Tile_ID";

var estimatedVarNamePrefix_Str = "Est_";

// Number of drawings.
var drawingNumber_Num = 10;

// Number of trees.
var treeNum_Num = 100;

// Last round of tuning.
var lastRoundID_Num = 3;

// Names of all predictors.
var allPredictorNames_List = 
  ENA_mod.allPredictorNames_List;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Grouped predictor names.
var groupedPredictors_List = 
  ENA_mod.groupedPredictors_List;

// Predictor group names.
var predictorGroups_List = 
  ENA_mod.predictorGroups_List;

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Perform RF modeling by tile.
function RFmodeling_ByTile(tileID_Num) {
  
  // Derive a randomization seed.
  var randomSeed_Num = ee.Number(tileID_Num)
    .multiply(drawingID_Num)
    .multiply(responseVarID_Num + 1);
  
  // Extract a single tile.
  var tileID_Filter = ee.Filter.eq({
    name: tileID_Name_Str, 
    value: tileID_Num
  });
  
  var tile_Ftr = selectedTiles_FC
    .filter(tileID_Filter).first();
  
  // Identify samples collected from the corresponding tile.
  var collectedSamples_OneTile_FC = collectedSamples_OneDrawing_FC
    .filter(tileID_Filter);
  
  var trainingSamples_OneTile_FC = collectedSamples_OneTile_FC.filter(
    ee.Filter.eq("Category", 1));
  
  var testingSamples_OneTile_FC = collectedSamples_OneTile_FC.filter(
    ee.Filter.eq("Category", 0));
  
  // Train a RF Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNum_Num,
      variablesPerSplit: optimal_VariablesPerSplit_Num,
      minLeafPopulation: optimal_MinLeafPopulation_Num,
      bagFraction: optimal_BagFraction_Num,
      maxNodes: null,
      seed: randomSeed_Num
    }).setOutputMode("REGRESSION");
  
  randomForest_Classifier = randomForest_Classifier
    .train({
      features: trainingSamples_OneTile_FC, 
      classProperty: responseVarName_Str, 
      inputProperties: remainingPredictors_List
    }); 
  
  // Apply the trained Classifier to the testing samples.
  var testingResult_OneTile_FC = testingSamples_OneTile_FC
    .classify({
      classifier: randomForest_Classifier,
      outputName: estimatedVarName_Str
    });
  
  var responseVarMean_Num = testingResult_OneTile_FC
    .reduceColumns({
      reducer: ee.Reducer.mean(), 
      selectors: [responseVarName_Str]
    }).get("mean");
  
  // Calculate RMSE and R-squared.
  testingResult_OneTile_FC = testingResult_OneTile_FC.map(
    function(testingSample_Ftr) {
      
      var actualValue_Num = testingSample_Ftr
        .get(responseVarName_Str);
        
      var estimatedValue_Num = testingSample_Ftr
        .get(estimatedVarName_Str);
      
      var squared_FitDiff_Num = ee.Number(actualValue_Num)
        .subtract(estimatedValue_Num)
        .pow(2);
      
      var squared_MeanDiff_Num = ee.Number(actualValue_Num)
        .subtract(responseVarMean_Num)
        .pow(2);
      
      return testingSample_Ftr.set({
        Squared_FitDiff: squared_FitDiff_Num,
        Squared_MeanDiff: squared_MeanDiff_Num
      });
    }
  );
  
  // RMSE.
  var MSE_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.mean(), 
    selectors: ["Squared_FitDiff"]
  }).get("mean");
  
  var RMSE_Num = ee.Number(MSE_Num).sqrt();
  
  // R-squared.
  var SS_tot_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_MeanDiff"]
  }).get("sum");
  
  var SS_res_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_FitDiff"]
  }).get("sum");
  
  var R_squared_Num = ee.Number(1).subtract(
    ee.Number(SS_res_Num).divide(SS_tot_Num)
  );
  
  // Add all modeling results to the tile as properties.
  var tile_WithResults_Ftr = tile_Ftr
    .set({
      Response_Var: responseVarName_Str,
      Drawing_ID: drawingID_Num,
      RMSE: RMSE_Num,
      R_squared: R_squared_Num,
      Excluded_Group: excludedGroup_Str
    });
  
  return tile_WithResults_Ftr;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

/****** Tiles and samples. ******/

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Randomly collected samples of 10 drawings.
//   (splitted into "training" and "testing".)
var collectedSamples_AllDrawings_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "SplittedSamples_10drawings"
);


/****** Model hyperparameters. ******/

// All the determined optimal values.
var all_OptimalHPvalues_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "All_OptimalHPvalues");

// Extract the optimal values from the last-round tuning.
all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .filter(
    ee.Filter.and(
      ee.Filter.eq("Round_ID", lastRoundID_Num),
      ee.Filter.eq("Tuning_ID", 2)
    )
  );


/*******************************************************************************
 * 1) For each selected non-overlapping tile, 
 *    train and test Random Forest models for each drawing
 *    based on a subset of predictor variables. *
 ******************************************************************************/

// Determine a List of the selected tile IDs.
selectedTiles_FC = selectedTiles_FC
  .select([tileID_Name_Str]);

var tileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str)
  .sort();


/****** Perform the RF modeling process 
  for each response variable, each drawing, and each tile. ******/

for (var responseVarID_Num = 12; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Select a response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  var estimatedVarName_Str = estimatedVarNamePrefix_Str 
    + responseVarName_Str;
  
  // Extract the optimal values of the corresponding
  //   response variable.
  var optimal_HPvalue_FC = all_OptimalHPvalues_FC
    .filter(
      ee.Filter.eq("Response_Var", responseVarName_Str));

  var optimal_VariablesPerSplit_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "variablesPerSplit"))
      .first()
      .get("HP_Value");
  
  var optimal_MinLeafPopulation_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "minLeafPopulation"))
      .first()
      .get("HP_Value");
  
  var optimal_BagFraction_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "bagFraction"))
      .first()
      .get("HP_Value");
  
  // for (var drawingID_Num = 1; drawingID_Num <= 1; 
  //   drawingID_Num ++) {
    
  // for (var drawingID_Num = 2; drawingID_Num <= drawingNumber_Num; 
  //   drawingID_Num ++) {
    
  for (var drawingID_Num = 1; drawingID_Num <= drawingNumber_Num; 
    drawingID_Num ++) {
    
    // Identify the GEDI samples collected in each drawing.
    var collectedSamples_OneDrawing_FC = collectedSamples_AllDrawings_FC
      .filter(ee.Filter.eq({
        name: "Drawing_ID", 
        value: drawingID_Num
      }));
    
    
    /****** Train and test RF models based on 
      a subset of predictor variables. ******/
    
    // Exclude a group of predictors in each round of modeling.
    for (var groupID_Num = 0; groupID_Num < 7; 
      groupID_Num ++) {
      
      // Determine a group of predictors to exclude.
      var excludedPredictors_List = 
        groupedPredictors_List[groupID_Num];
      
      var excludedGroup_Str = 
        predictorGroups_List[groupID_Num];
      
      // Derive the remaining predictors for modeling.
      var remainingPredictors_List = ee.List(allPredictorNames_List)
        .removeAll(excludedPredictors_List);
      
      // Variable estimation by tile.
      var accuracy_AllTiles_List = tileIDs_List
        .map(RFmodeling_ByTile);
      
      // Convert the result to a FeatureCollection.
      var accuracy_AllTiles_FC = ee.FeatureCollection(
        accuracy_AllTiles_List
      );
      
      
      /**** Export the results. ****/
    
      if (export_Bool) {
        
        var accuracy_FileName_Str = "Drawing"
          + drawingID_Num
          + "_"
          + excludedGroup_Str;
        
        Export.table.toAsset({
          collection: accuracy_AllTiles_FC, 
          description: accuracy_FileName_Str, 
          assetId: wd_Main_1_Str
            + "GEDI_Estimation/"
            + "Predictor_Comparison/"
            + "Modeling_Results/"
            + responseVarName_Str + "/"
            + accuracy_FileName_Str
        });
      }
    }
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("selectedTiles_FC:", 
    selectedTiles_FC.size(), // 30.
    tileIDs_List.distinct().size(), // 30.
    selectedTiles_FC.first());

  print("collectedSamples_AllDrawings_FC:", 
    collectedSamples_AllDrawings_FC.first(), // 116 properties.
    collectedSamples_AllDrawings_FC.size(), // 375000.
    "collectedSamples_OneDrawing_FC:", 
    collectedSamples_OneDrawing_FC.size()); // 37500.

  print("allResponseVarNames_List:", 
    allResponseVarNames_List);

  print("allPredictorNames_List:", 
    allPredictorNames_List);
  
  print("remainingPredictors_List:", 
    remainingPredictors_List);
  
  print("excludedPredictors_List:", 
    excludedPredictors_List);
  
  print("excludedGroup_Str:", 
    excludedGroup_Str);
}

