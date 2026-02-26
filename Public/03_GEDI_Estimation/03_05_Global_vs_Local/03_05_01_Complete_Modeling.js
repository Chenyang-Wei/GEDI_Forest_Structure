/*******************************************************************************
 * Introduction *
 * 
 *  1) For all the selected non-overlapping 30 tiles, 
 *     train global Random Forest models for each drawing
 *     based on all the predictor variables.
 * 
 *  2) Locally test each global RF model against the testing dataset
 *     at each tile for the corresponding drawing.
 * 
 * Last updated: 6/10/2025
 * 
 * Runtime: 3m ~ 7m
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

var wd_Main_2_Str = ENA_mod.wd_Birds_Str;

// Property names.
var tileID_Name_Str = "Tile_ID";

var estimatedVarNamePrefix_Str = "Est_";

// Number of drawings.
var drawingNumber_Num = 10;

// Number of trees.
var treeNum_Num = 100;

// Names of all predictors.
var allPredictorNames_List = 
  ENA_mod.allPredictorNames_List;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Last round of tuning.
var lastRoundID_Num = 3;

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Perform RF model training and tile-level testing by drawing.
function RFmodeling_LocalTesting_ByDrawing(drawingID_Num) {
  
  // Derive a randomization seed.
  var randomSeed_Num = ee.Number(drawingID_Num)
    .multiply(responseVarID_Num + 1);

  // Identify the training/testing GEDI samples collected in each drawing.
  var allTileSamples_OneDrawing_FC = allTileSamples_AllDrawings_FC
    .filter(ee.Filter.eq({
      name: "Drawing_ID", 
      value: drawingID_Num
    }));
  
  var allTileTraining_OneDrawing_FC = allTileSamples_OneDrawing_FC.filter(
    ee.Filter.eq("Category", 1));
  
  var allTileTesting_OneDrawing_FC = allTileSamples_OneDrawing_FC.filter(
    ee.Filter.eq("Category", 0));
  
  // Train a RF Classifier based on the training samples from all 30 tiles.
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
      features: allTileTraining_OneDrawing_FC, 
      classProperty: responseVarName_Str, 
      inputProperties: allPredictorNames_List
    }); 
  
  // Locally test the trained Classifier against 
  //   the testing samples of each tile.
  var allTileResults_OneDrawing_List = tileIDs_List.map(
    function LocallyTest_GlobalModel_ByTile(tileID_Num) {
      
      var tileID_Filter = ee.Filter.eq({
        name: "Tile_ID", 
        value: tileID_Num
      });
      
      // Select a single tile.
      var oneTile_Ftr = selectedTiles_FC
        .filter(tileID_Filter)
        .first();
      
      // Extract the corresponding testing samples.
      var oneTileTesting_OneDrawing_FC = allTileTesting_OneDrawing_FC
        .filter(tileID_Filter);
      
      // Locally test the global model.
      var oneTileResult_OneDrawing_FC = oneTileTesting_OneDrawing_FC
        .classify({
          classifier: randomForest_Classifier,
          outputName: estimatedVarName_Str
        });
      
      // Average the actual values of the response variable.
      var responseVarMean_Num = oneTileResult_OneDrawing_FC
        .reduceColumns({
          reducer: ee.Reducer.mean(), 
          selectors: [responseVarName_Str]
        }).get("mean");
      
      // Calculate "squared error (SE)" and "squared total (ST)".
      oneTileResult_OneDrawing_FC = oneTileResult_OneDrawing_FC.map(
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
      
      // Calculate RMSE.
      var MSE_Num = oneTileResult_OneDrawing_FC.reduceColumns({
        reducer: ee.Reducer.mean(), 
        selectors: ["Squared_FitDiff"]
      }).get("mean");
      
      var RMSE_Num = ee.Number(MSE_Num).sqrt();
      
      // Calculate R-squared.
      var SS_tot_Num = oneTileResult_OneDrawing_FC.reduceColumns({
        reducer: ee.Reducer.sum(), 
        selectors: ["Squared_MeanDiff"]
      }).get("sum");
      
      var SS_res_Num = oneTileResult_OneDrawing_FC.reduceColumns({
        reducer: ee.Reducer.sum(), 
        selectors: ["Squared_FitDiff"]
      }).get("sum");
      
      var R_squared_Num = ee.Number(1).subtract(
        ee.Number(SS_res_Num).divide(SS_tot_Num)
      );
      
      // Add the testing result to the single tile as properties.
      var oneTile_WithResult_Ftr = oneTile_Ftr
        .set({
          Response_V: responseVarName_Str,
          Drawing_ID: drawingID_Num,
          RMSE: RMSE_Num,
          R_squared: R_squared_Num
        });
      
      return oneTile_WithResult_Ftr;
    }
  );
  
  // Convert the result to a FeatureCollection.
  var allTileResults_OneDrawing_FC = ee.FeatureCollection(
    allTileResults_OneDrawing_List
  );
    
  return allTileResults_OneDrawing_FC;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Randomly collected samples of 10 drawings from all 30 tiles.
//   (splitted into "training" and "testing".)
var allTileSamples_AllDrawings_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "SplittedSamples_10drawings"
);

// All the determined optimal hyperparameter values.
var all_OptimalHPvalues_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "All_OptimalHPvalues");


/*******************************************************************************
 * 1) For all the selected non-overlapping tiles, 
 *    train and test Random Forest models for each drawing
 *    based on all the predictor variables. *
 ******************************************************************************/

// Extract the optimal values from the last-round tuning.
all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .filter(
    ee.Filter.and(
      ee.Filter.eq("Round_ID", lastRoundID_Num),
      ee.Filter.eq("Tuning_ID", 2)
    )
  );

// Determine a List of the selected tile IDs.
selectedTiles_FC = selectedTiles_FC
  .select([tileID_Name_Str]); // For the purpose of result export.

var tileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str)
  .sort();

// Derive a List of the drawing IDs.
var drawingIDs_List = ee.List.sequence({
  start: 1, 
  end: drawingNumber_Num
});


/****** Perform the RF modeling process 
  for each response variable and each drawing. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
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

  // Perform global training and local testing.
  var accuracy_AllDrawings_List = drawingIDs_List
    .map(RFmodeling_LocalTesting_ByDrawing);
  
  // Convert the result to a FeatureCollection.
  var accuracy_AllDrawings_FC = ee.FeatureCollection(
    accuracy_AllDrawings_List
  ).flatten();
  
  
  /**** Export the results. ****/

  if (export_Bool) {
    
    var accuracy_FileName_Str = responseVarName_Str
      + "_Complete";
    
    Export.table.toAsset({
      collection: accuracy_AllDrawings_FC, 
      description: accuracy_FileName_Str, 
      assetId: wd_Main_1_Str
        + "GEDI_Estimation/"
        + "Model_Comparison/"
        + "GlobalModels_LocallyTested/"
        + accuracy_FileName_Str
    });
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("allTileSamples_AllDrawings_FC:", 
    allTileSamples_AllDrawings_FC.size(), // 375000.
    allTileSamples_AllDrawings_FC.first()); // 116 properties.

  print("all_OptimalHPvalues_FC:", 
    all_OptimalHPvalues_FC.size(), // 42 = 14 * 3.
    all_OptimalHPvalues_FC.first());

  print("selectedTiles_FC:", 
    selectedTiles_FC.size(), // 30.
    selectedTiles_FC.first());

  print("tileIDs_List:", 
    tileIDs_List);

  print("drawingIDs_List:", 
    drawingIDs_List);
}

