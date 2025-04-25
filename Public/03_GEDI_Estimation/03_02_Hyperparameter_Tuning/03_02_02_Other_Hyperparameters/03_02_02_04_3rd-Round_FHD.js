/*******************************************************************************
 * Introduction *
 * 
 *  For the "FHD" response variable, based on 
 *    the randomly collected samples across the study domain:
 * 
 *  1) Tune the "variables per split" hyperparameter.
 * 
 *  2) Manually pick the optimal "min. leaf population" hyperparameter.
 * 
 *  3) Tune the "bagging fraction" hyperparameter.
 * 
 * Last updated: 9/29/2024
 * 
 * Runtime: 7m & 11m
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

// Number of trees.
var treeNum_Num = 100;

// Current round of tuning.
var newRoundID_Num = 3;

// Previous round of tuning.
var oldRoundID_Num = newRoundID_Num - 1;

// Whether to export the result(s).
var export_Bool = true; // true OR false.

// Whether to print the testing results.
var print_Bool = false; // true OR false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Train and test a Random Forest model with
//   a candidate "variables per split" value.
function TrainTest_RFmodel_VariablesPerSplit(HP_Value_Num) {
  
  // Train a Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNum_Num,
      variablesPerSplit: HP_Value_Num,
      minLeafPopulation: previous_Optimal_MinLeafPopulation_Num,
      bagFraction: previous_Optimal_BagFraction_Num,
      maxNodes: null,
      seed: HP_Value_Num
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
    Round_ID: newRoundID_Num,
    Tuning_ID: tuningID_Num,
    HP_Name: HP_Name_Str, 
    HP_Value: HP_Value_Num,
    RMSE: RMSE_Num
  });
}

// Train and test a Random Forest model with
//   a candidate "min. leaf population" value.
function TrainTest_RFmodel_MinLeafPopulation(HP_Value_Num) {
  
  // Train a Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNum_Num,
      variablesPerSplit: optimal_VariablesPerSplit_Num,
      minLeafPopulation: HP_Value_Num,
      bagFraction: previous_Optimal_BagFraction_Num,
      maxNodes: null,
      seed: HP_Value_Num
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
    Round_ID: newRoundID_Num,
    Tuning_ID: tuningID_Num,
    HP_Name: HP_Name_Str, 
    HP_Value: HP_Value_Num,
    RMSE: RMSE_Num
  });
}

// Train and test a Random Forest model with
//   a candidate "bagging fraction" value.
function TrainTest_RFmodel_BagFraction(HP_Value_Num) {
  
  // Train a Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNum_Num,
      variablesPerSplit: optimal_VariablesPerSplit_Num,
      minLeafPopulation: optimal_MinLeafPopulation_Num,
      bagFraction: HP_Value_Num,
      maxNodes: null,
      seed: 
        ee.Number(HP_Value_Num)
          .multiply(100)
          .round()
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
    Round_ID: newRoundID_Num,
    Tuning_ID: tuningID_Num,
    HP_Name: HP_Name_Str, 
    HP_Value: HP_Value_Num,
    RMSE: RMSE_Num
  });
}

// Divide a candidate value by 100.
function Divide_HPvalue_By100(HP_Value_Num) {
  HP_Value_Num = ee.Number(HP_Value_Num)
    .divide(100);
  
  return HP_Value_Num;
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


/****** Hyperparameter tuning for the "FHD" response variable. ******/

// Select the "FHD" response variable.
var responseVarID_Num = 5;

var responseVarName_Str = allResponseVarNames_List[responseVarID_Num];

var estimatedVarName_Str = estimatedVarNamePrefix_Str + responseVarName_Str;

// Previous testing results of 
//   the corresponding response variable.
var final_TestingResults_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "Testing_Results/"
  + "Round_" + oldRoundID_Num + "/"
  + responseVarName_Str);

// Previously determined optimal values of hyperparameters.
var all_OptimalHPvalues_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "Optimal_HP_Values/"
  + "Round_" + oldRoundID_Num + "/"
  + responseVarName_Str);

// Extract the previous optimal values.
var previous_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .filter(
    ee.Filter.and(
      ee.Filter.eq("Round_ID", oldRoundID_Num),
      ee.Filter.eq("Tuning_ID", 2)
    )
  );

var previous_Optimal_MinLeafPopulation_Num = 
  previous_OptimalHPvalues_FC
    .filter(
      ee.Filter.eq("HP_Name", "minLeafPopulation"))
    .first()
    .get("HP_Value");

var previous_Optimal_BagFraction_Num = 
  previous_OptimalHPvalues_FC
    .filter(
      ee.Filter.eq("HP_Name", "bagFraction"))
    .first()
    .get("HP_Value");

if (!export_Bool) {
  
  // Check the loaded dataset(s).
  print(responseVarName_Str,
    final_TestingResults_FC.size(),
    all_OptimalHPvalues_FC.first(),
    all_OptimalHPvalues_FC.size());
}


/*******************************************************************************
* 1) Tune the "variables per split" hyperparameter. *
******************************************************************************/

// Hyperparameter to tune.
var HP_Name_Str = "variablesPerSplit";

var HP_ID_Num = 1;

// Randomly split the selected samples into training and testing sets.
var randomizedSamples_FC = collectedSamples_FC
  .randomColumn({
    columnName: columnName_Str, 
    seed: 
      ee.Number(HP_ID_Num)
        .multiply(newRoundID_Num)
        .multiply(responseVarID_Num + 1)
  });

var trainingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.lt(columnName_Str, trainingRatio_Num));

var testingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.gte(columnName_Str, trainingRatio_Num));


/**** First tuning. ****/

var tuningID_Num = 1;

// Determine a List of candidate values for tuning.
var HP_LowestValue_Num = 1;

var HP_HighestValue_Num = 93;

var HP_Step_Num = 5;

var HP_Values_List = ee.List.sequence({
  start: 5, 
  end: 90, 
  step: HP_Step_Num
}).cat([
  HP_LowestValue_Num, 
  HP_HighestValue_Num
]).sort();

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_VariablesPerSplit);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print(HP_Name_Str,
    "Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Second tuning. ****/

var tuningID_Num = 2;

// Manually determine the upper and lower limits of candidate values 
//   to meet the computational requirement.
var HP_LowerLimit_Num = 10;

var HP_UpperLimit_Num = 50;

// Update the interval between neighboring candicate values.
var HP_Step_Num = 1; 

// Determine a List of candidate values based on 
//   the upper and lower limits.
var HP_Values_List = ee.List.sequence({
  start: HP_LowerLimit_Num, 
  end: HP_UpperLimit_Num, 
  step: HP_Step_Num
});

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_VariablesPerSplit);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print("Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Identify an optimal value. ****/

var optimal_HPvalue_FC = testingResults_FC
  .limit(1);

var optimal_VariablesPerSplit_Num = optimal_HPvalue_FC
  .first()
  .get("HP_Value");

var all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .merge(optimal_HPvalue_FC);


/*******************************************************************************
* 2) Tune the "min. leaf population" hyperparameter. *
******************************************************************************/

// Hyperparameter to tune.
var HP_Name_Str = "minLeafPopulation";

var HP_ID_Num = 2;

// Randomly split the selected samples into training and testing sets.
var randomizedSamples_FC = collectedSamples_FC
  .randomColumn({
    columnName: columnName_Str, 
    seed: 
      ee.Number(HP_ID_Num)
        .multiply(newRoundID_Num)
        .multiply(responseVarID_Num + 1)
  });

var trainingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.lt(columnName_Str, trainingRatio_Num));

var testingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.gte(columnName_Str, trainingRatio_Num));


/**** First tuning. ****/

var tuningID_Num = 1;

// Determine a List of candidate values for tuning.
var HP_LowestValue_Num = 1;

var HP_HighestValue_Num = 100;

var HP_Step_Num = 5;

var HP_Values_List = ee.List.sequence({
  start: 5, 
  end: 95, 
  step: HP_Step_Num
}).cat([
  HP_LowestValue_Num, 
  HP_HighestValue_Num
]).sort();

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_MinLeafPopulation);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print(HP_Name_Str,
    "Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Second tuning. ****/

var tuningID_Num = 2;

// Manually determine the upper and lower limits of candidate values 
//   to meet the computational requirement.
var HP_LowerLimit_Num = 5;

var HP_UpperLimit_Num = 30;

// Update the interval between neighboring candicate values.
var HP_Step_Num = 1; 

// Determine a List of candidate values based on 
//   the upper and lower limits.
var HP_Values_List = ee.List.sequence({
  start: HP_LowerLimit_Num, 
  end: HP_UpperLimit_Num, 
  step: HP_Step_Num
});

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_MinLeafPopulation);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print("Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Manually select an optimal value 
  to meet the computational requirement. ****/

var optimal_MinLeafPopulation_Num = 7;

var optimal_HPvalue_FC = testingResults_FC.filter(
  ee.Filter.eq({
    name: "HP_Value", 
    value: optimal_MinLeafPopulation_Num
  })
);

var all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .merge(optimal_HPvalue_FC);


/*******************************************************************************
* 3) Tune the "bagging fraction" hyperparameter. *
******************************************************************************/

// Hyperparameter to tune.
var HP_Name_Str = "bagFraction";

var HP_ID_Num = 3;

// Randomly split the selected samples into training and testing sets.
var randomizedSamples_FC = collectedSamples_FC
  .randomColumn({
    columnName: columnName_Str, 
    seed: 
      ee.Number(HP_ID_Num)
        .multiply(newRoundID_Num)
        .multiply(responseVarID_Num + 1)
  });

var trainingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.lt(columnName_Str, trainingRatio_Num));

var testingSamples_FC = randomizedSamples_FC.filter(
  ee.Filter.gte(columnName_Str, trainingRatio_Num));


/**** First tuning. ****/

var tuningID_Num = 1;

// Determine a List of candidate values for tuning.
var HP_LowestValue_Num = 1;

var HP_HighestValue_Num = 99;

var HP_Step_Num = 5;

var HP_Values_List = ee.List.sequence({
  start: 5, 
  end: 95, 
  step: HP_Step_Num
}).cat([
  HP_LowestValue_Num, 
  HP_HighestValue_Num
]).sort();

var HP_Values_List = HP_Values_List
  .map(Divide_HPvalue_By100);

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_BagFraction);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print(HP_Name_Str,
    "Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Second tuning. ****/

var tuningID_Num = 2;

// Manually determine the upper and lower limits of candidate values 
//   to meet the computational requirement.
var HP_LowerLimit_Num = 50;

var HP_UpperLimit_Num = 80;

// Update the interval between neighboring candicate values.
var HP_Step_Num = 1; 

// Determine a List of candidate values based on 
//   the upper and lower limits.
var HP_Values_List = ee.List.sequence({
  start: HP_LowerLimit_Num, 
  end: HP_UpperLimit_Num, 
  step: HP_Step_Num
});

var HP_Values_List = HP_Values_List
  .map(Divide_HPvalue_By100);

// Train and test Random Forest models.
var testingResults_List = 
  HP_Values_List
    .map(TrainTest_RFmodel_BagFraction);

// Sort the testing results by the RMSE value.
var testingResults_FC = ee.FeatureCollection(
  testingResults_List
).sort("RMSE");

var final_TestingResults_FC = final_TestingResults_FC
  .merge(testingResults_FC);

if (print_Bool) {
  
  // Check the tuning result.
  print("Tuning - " + tuningID_Num,
    HP_Values_List,
    testingResults_FC.limit(3)
      .aggregate_array("HP_Value"));
}


/**** Identify an optimal value. ****/

var optimal_HPvalue_FC = testingResults_FC
  .limit(1);

var all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .merge(optimal_HPvalue_FC);


if (export_Bool) {
  
  /**** Output to Asset. ****/

  Export.table.toAsset({
    collection: final_TestingResults_FC, 
    description: responseVarName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Hyperparameter_Tuning/"
      + "Testing_Results/"
      + "Round_" + newRoundID_Num + "/"
      + responseVarName_Str
  });
  
  Export.table.toAsset({
    collection: all_OptimalHPvalues_FC, 
    description: responseVarName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Hyperparameter_Tuning/"
      + "Optimal_HP_Values/"
      + "Round_" + newRoundID_Num + "/"
      + responseVarName_Str
  });
}


/*******************************************************************************
* Results *
******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("allResponseVarNames_List:",
    allResponseVarNames_List); // 14 elements.

  print("predictorNames_List:",
    predictorNames_List); // 93 elements
}

