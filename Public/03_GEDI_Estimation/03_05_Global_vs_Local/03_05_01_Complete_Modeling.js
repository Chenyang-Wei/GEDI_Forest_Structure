/*******************************************************************************
 * Introduction *
 * 
 *  1) For all the selected non-overlapping tiles, 
 *     train and test Random Forest models for each drawing
 *     based on all the predictor variables.
 * 
 * Last updated: 10/21/2024
 * 
 * Runtime: 4m ~ 11m
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

// Number of the top-ranked predictors in each RF model.
var topVarNumber_Num = 20;

// Property names for the top-ranked predictors and their importance.
var topVarIDs_List = ee.List.sequence({
  start: 1, 
  end: topVarNumber_Num
});

var topVarNames_List = topVarIDs_List.map(
  function Create_VarName(topVarID_Num) {
    topVarID_Num = ee.Number(topVarID_Num).toInt();
    
    var topVarID_Str = ee.String(topVarID_Num);
    
    var topVarName_Str = ee.String("Var").cat(topVarID_Str)
      .cat("_Name");
    
    return topVarName_Str;
  });

var topVarImportance_List = topVarIDs_List.map(
  function Create_VarImportance(topVarID_Num) {
    topVarID_Num = ee.Number(topVarID_Num).toInt();
    
    var topVarID_Str = ee.String(topVarID_Num);
    
    var topVarImportance_Str = ee.String("Var").cat(topVarID_Str)
      .cat("_Importance");
    
    return topVarImportance_Str;
  });

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Perform RF modeling by drawing.
function RFmodeling_ByDrawing(drawingID_Num) {
  
  // Derive a randomization seed.
  var randomSeed_Num = ee.Number(drawingID_Num)
    .multiply(responseVarID_Num + 1);

  // Identify the training/testing GEDI samples collected in each drawing.
  var collectedSamples_OneDrawing_FC = collectedSamples_AllDrawings_FC
    .filter(ee.Filter.eq({
      name: "Drawing_ID", 
      value: drawingID_Num
    }));
  
  var trainingSamples_OneDrawing_FC = collectedSamples_OneDrawing_FC.filter(
    ee.Filter.eq("Category", 1));
  
  var testingSamples_OneDrawing_FC = collectedSamples_OneDrawing_FC.filter(
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
      features: trainingSamples_OneDrawing_FC, 
      classProperty: responseVarName_Str, 
      inputProperties: allPredictorNames_List
    }); 
  
  // Apply the trained Classifier to the testing samples.
  var testingResult_OneDrawing_FC = testingSamples_OneDrawing_FC
    .classify({
      classifier: randomForest_Classifier,
      outputName: estimatedVarName_Str
    });
  
  var responseVarMean_Num = testingResult_OneDrawing_FC
    .reduceColumns({
      reducer: ee.Reducer.mean(), 
      selectors: [responseVarName_Str]
    }).get("mean");
  
  // Calculate RMSE and R-squared.
  testingResult_OneDrawing_FC = testingResult_OneDrawing_FC.map(
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
  var MSE_Num = testingResult_OneDrawing_FC.reduceColumns({
    reducer: ee.Reducer.mean(), 
    selectors: ["Squared_FitDiff"]
  }).get("mean");
  
  var RMSE_Num = ee.Number(MSE_Num).sqrt();
  
  // R-squared.
  var SS_tot_Num = testingResult_OneDrawing_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_MeanDiff"]
  }).get("sum");
  
  var SS_res_Num = testingResult_OneDrawing_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_FitDiff"]
  }).get("sum");
  
  var R_squared_Num = ee.Number(1).subtract(
    ee.Number(SS_res_Num).divide(SS_tot_Num)
  );
  
  // Acquire the importance of each predictor.
  var importance_AllVars_Dict = ee.Dictionary(
    randomForest_Classifier.explain()
      .get("importance")
  );
  
  // Convert the Dictionary to a FeatureCollection.
  var importance_AllVars_List = allPredictorNames_List.map(
    function Convert_Importance(predictorName_Str) {
      var importance_OneVar_Num = importance_AllVars_Dict
        .getNumber(predictorName_Str);
      
      return ee.Feature(null).set({
        Var_Name: predictorName_Str,
        Var_Importance: importance_OneVar_Num
      });
    });
  
  var importance_AllVars_FC = ee.FeatureCollection(
    importance_AllVars_List
  );
  
  // Identify the top-ranked predictors.
  importance_AllVars_FC = importance_AllVars_FC.sort({
    property: "Var_Importance", 
    ascending: false
  });
  
  var importance_TopVars_FC = importance_AllVars_FC
    .limit(topVarNumber_Num);
  
  // Convert the names and importance of the top-ranked predictors
  //   to Dictionaries.
  var topVarNames_Dict = ee.Dictionary.fromLists({
    keys: topVarNames_List, 
    values: importance_TopVars_FC.aggregate_array("Var_Name")
  });
  
  var topVarImportance_Dict = ee.Dictionary.fromLists({
    keys: topVarImportance_List, 
    values: importance_TopVars_FC.aggregate_array("Var_Importance")
  });
  
  // Add all modeling results to the AOI as properties.
  var AOI_WithResults_Ftr = ee.Feature(AOI_Geom)
    .set({
      Response_Var: responseVarName_Str,
      Drawing_ID: drawingID_Num,
      RMSE: RMSE_Num,
      R_squared: R_squared_Num
    })
    .set(topVarNames_Dict)
    .set(topVarImportance_Dict);
  
  return AOI_WithResults_Ftr;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Randomly collected samples of 10 drawings.
//   (splitted into "training" and "testing".)
var collectedSamples_AllDrawings_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "SplittedSamples_10drawings"
);

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
 * 1) For all the selected non-overlapping tiles, 
 *    train and test Random Forest models for each drawing
 *    based on all the predictor variables. *
 ******************************************************************************/

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

  // Variable estimation by tile.
  var accuracy_AllDrawings_List = drawingIDs_List
    .map(RFmodeling_ByDrawing);
  
  // Convert the result to a FeatureCollection.
  var accuracy_AllDrawings_FC = ee.FeatureCollection(
    accuracy_AllDrawings_List
  );
  
  
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
        + "All_SelectedTiles/"
        + accuracy_FileName_Str
    });
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("collectedSamples_AllDrawings_FC:", 
    collectedSamples_AllDrawings_FC.size(), // 375000.
    collectedSamples_AllDrawings_FC.first()); // 116 properties.

  print("all_OptimalHPvalues_FC:", 
    all_OptimalHPvalues_FC.size(), // 42 = 14 * 3.
    all_OptimalHPvalues_FC.first());

  print("drawingIDs_List:", 
    drawingIDs_List);
}

