/*******************************************************************************
 * Introduction *
 * 
 *  1) Based on the randomly collected samples across the study domain,
 *     train and test Random Forest models with different tree numbers 
 *     for each response variable.
 * 
 * Last updated: 9/5/2024
 * 
 * Runtime: 3m ~ 9m
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
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Names of unincluded GEDI variables.
var otherGEDIvarNames_List =
  ENA_mod.otherGEDIvarNames_List;

// Property name(s).
var estimatedVarNamePrefix_Str = "Est_";

var columnName_Str = "Split_ID";

// Proportion of training samples.
var trainingRatio_Num = 0.8;

// Default hyperparameter values.
var default_VariablesPerSplit_Num = 31; 
// (One-third of the number of predictors.)

var default_MinLeafPopulation_Num = 1;

var default_BagFraction_Num = 0.5;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Train and test a Random Forest model with
//   a given number of trees.
function TrainTest_RFmodel_ByTreeNumber(treeNumber_Num) {
  
  // Train a Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNumber_Num,
      variablesPerSplit: default_VariablesPerSplit_Num,
      minLeafPopulation: default_MinLeafPopulation_Num,
      bagFraction: default_BagFraction_Num,
      maxNodes: null,
      seed: treeNumber_Num
    }).setOutputMode("REGRESSION");
  
  randomForest_Classifier = randomForest_Classifier
    .train({
      features: trainingSamples_FC, 
      classProperty: responseVarName_Str, 
      inputProperties: predictorNames_List
    }); 
  
  // Apply the trained Classifier to the testing samples.
  var testingResult_FC = testingSamples_FC
    .classify({
      classifier: randomForest_Classifier,
      outputName: estimatedVarName_Str
    });
  
  // Calculate RMSE.
  testingResult_FC = testingResult_FC.map(
    function(testingSample_Ftr) {
      
      var estimatedValue_Num = testingSample_Ftr
        .get(estimatedVarName_Str);
      
      var actualValue_Num = testingSample_Ftr
        .get(responseVarName_Str);
        
      var squaredError_Num = ee.Number(estimatedValue_Num)
        .subtract(actualValue_Num)
        .pow(2);
      
      return testingSample_Ftr.set({
        Squared_Error: squaredError_Num
      });
    }
  );
  
  var MSE_Num = testingResult_FC.reduceColumns({
    reducer: ee.Reducer.mean(), 
    selectors: ["Squared_Error"]
  }).get("mean");
  
  var RMSE_Num = ee.Number(MSE_Num).sqrt();
  
  return ee.Feature(AOI_Geom).set({
    Response_Var: responseVarName_Str,
    Tree_Number: treeNumber_Num,
    RMSE: RMSE_Num
  });
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Randomly collected samples.
var collectedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "CollectedSamples_10perCell"
);


/*******************************************************************************
 * 1) Based on the randomly collected samples across the study domain,
 *    train and test Random Forest models with different tree numbers 
 *    for each response variable. *
 ******************************************************************************/

// Determine the names of all GEDI variables.
var allGEDIvarNames_List = allResponseVarNames_List
  .concat(otherGEDIvarNames_List);

// Determine the names of predictors.
var predictorNames_List = collectedSamples_FC
  .first()
  .propertyNames()
  .removeAll(allGEDIvarNames_List)
  .removeAll([
    "Pixel_Label", 
    "Sample_ID", 
    "Tile_ID", 
    "system:index"
  ]);


/****** Perform the RF modeling process 
  for each response variable. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Select a response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  var estimatedVarName_Str = estimatedVarNamePrefix_Str 
    + responseVarName_Str;
  
  // Randomly split the selected samples into training and testing sets.
  var randomizedSamples_FC = collectedSamples_FC
    .randomColumn({
      columnName: columnName_Str, 
      seed: responseVarID_Num + 1
    });
  
  var trainingSamples_FC = randomizedSamples_FC.filter(
    ee.Filter.lt(columnName_Str, trainingRatio_Num));
  
  var testingSamples_FC = randomizedSamples_FC.filter(
    ee.Filter.gte(columnName_Str, trainingRatio_Num));
  
  // Determine a List of candidate of tree numbers.
  var lowest_TreeNumber_Num = 1;
  
  var highest_TreeNumber_Num = 200;
  
  var treeNumber_Step_Num = 5;
  
  var treeNumbers_List = ee.List.sequence({
    start: 5, 
    end: 195, 
    step: treeNumber_Step_Num
  }).cat([
    lowest_TreeNumber_Num, 
    highest_TreeNumber_Num
  ]).sort();
  
  // Train and test Random Forest models.
  var testingResults_List = 
    treeNumbers_List
      .map(TrainTest_RFmodel_ByTreeNumber);
  
  var testingResults_FC = ee.FeatureCollection(
    testingResults_List
  ).sort("Tree_Number");
  
  
  /*******************************************************************************
  * Results *
  ******************************************************************************/
  
  // Whether to export the result(s).
  var export_Bool = true; // true OR false.
  
  if (export_Bool) {
    
    /****** Export the result(s). ******/
    
    Export.table.toAsset({
      collection: testingResults_FC, 
      description: responseVarName_Str, 
      assetId: wd_Main_1_Str
        + "GEDI_Estimation/"
        + "Hyperparameter_Tuning/"
        + "TreeNumber_Determination/"
        + responseVarName_Str
    });
    
  } else {
    
    /****** Check the objects. ******/
    
    print("estimatedVarName_Str:", 
      estimatedVarName_Str);
    
    // print("allResponseVarNames_List:",
    //   allResponseVarNames_List); // 14 elements.
    
    // print("predictorNames_List:",
    //   predictorNames_List); // 93 elements.
    
    // print("collectedSamples_FC:",
    //   collectedSamples_FC.first(),
    //   collectedSamples_FC.size()); // 16930.
  }
}

