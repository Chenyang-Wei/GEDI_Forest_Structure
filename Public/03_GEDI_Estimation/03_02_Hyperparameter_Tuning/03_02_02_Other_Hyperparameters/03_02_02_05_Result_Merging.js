/*******************************************************************************
 * Introduction *
 * 
 *  1) Merge the testing results and optimal hyperparameter values
 *     of all response variables.
 * 
 * Last updated: 9/29/2024
 * 
 * Runtime: 2m & 39m
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
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

var wd_Main_2_Str = ENA_mod.wd_Birds_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Last round of tuning.
var lastRoundID_Num = 3;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Create and display a Chart for a specified hyperparameter 
//   in a specified round of tuning.
function Visualize_HPvalues(roundID_Num, 
  HPname_Str, HPtitle_Str, colors_List) {
    
    // Derive the optimal value of the specified hyperparameter 
    //   in the specified round of tuning.
    var optimal_HPvalue_Num = optimalHPvalues_AllRounds_FC
      .filter(
        ee.Filter.and(
          ee.Filter.eq("Round_ID", roundID_Num),
          ee.Filter.eq("HP_Name", HPname_Str)
        )
      )
      .first()
      .get("HP_Value");
  
    // Extract the testing results of the specified round.
    var testingResults_OneRound_FC = testingResults_AllRounds_FC
      .filter(ee.Filter.eq("Round_ID", roundID_Num));

    // Create and display a Chart.
    var HPvalues_Chart =
      ui.Chart.feature
        .groups({
          features: testingResults_OneRound_FC
            .filter(ee.Filter.eq("HP_Name", HPname_Str)), 
          xProperty: "HP_Value", 
          yProperty: "RMSE", 
          seriesProperty: "Tuning_ID"
        })
        .setSeriesNames(["1st Tuning", "2nd Tuning"])
        .setChartType("ScatterChart")
        .setOptions({
          title: HPtitle_Str + " (Round-" + roundID_Num + ")",
          hAxis: {
            title: "Hyperparameter Value (Optimal: " 
              + optimal_HPvalue_Num.getInfo()
              + ")", 
            titleTextStyle: {italic: false, bold: true}
          },
          vAxis: {
            title: "RMSE",
            titleTextStyle: {italic: false, bold: true}
          },
          pointSize: 8,
          colors: colors_List,
        });
    
    print(HPvalues_Chart);
  }


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) Merge the testing results and optimal hyperparameter values
 *    of all response variables. *
 ******************************************************************************/

// Create an empty List to store all the testing results.
var final_TestingResults_List = ee.List([]);

// Create an empty List to store
//   all the determined optimal hyperparameter values.
var all_OptimalHPvalues_List = ee.List([]);

// Whether to export the result(s).
var export_Bool = true; // true OR false.


/****** Load and merge the datasets of each response variable. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Select a response variable.
  var responseVarName_Str = allResponseVarNames_List[responseVarID_Num];
  
  // Load the testing results from the last-round tuning.
  var testingResults_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Hyperparameter_Tuning/"
    + "Testing_Results/"
    + "Round_" + lastRoundID_Num + "/"
    + responseVarName_Str);
  
  // Load the optimal hyperparameter values 
  //   from the last-round tuning.
  var optimal_HPvalue_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Hyperparameter_Tuning/"
    + "Optimal_HP_Values/"
    + "Round_" + lastRoundID_Num + "/"
    + responseVarName_Str);

  // Merge the datasets.
  final_TestingResults_List = final_TestingResults_List
    .add(testingResults_FC);
  
  all_OptimalHPvalues_List = all_OptimalHPvalues_List
    .add(optimal_HPvalue_FC);
}

// Convert each result to a FeatureCollection.
var final_TestingResults_FC = ee.FeatureCollection(
  final_TestingResults_List
).flatten();

var all_OptimalHPvalues_FC = ee.FeatureCollection(
  all_OptimalHPvalues_List
).flatten();


if (!export_Bool) {
  
  // Check the object(s) and dataset(s).
  print("allResponseVarNames_List:",
    allResponseVarNames_List); // 14 elements.
  
  print("final_TestingResults_FC:",
    final_TestingResults_FC.first(),
    final_TestingResults_FC.size()); // 5512.
  
  print("all_OptimalHPvalues_FC:",
    all_OptimalHPvalues_FC.first(),
    all_OptimalHPvalues_FC.size()); // 126 = 3 * 3 * 14.
  
  // Select a response variable.
  var responseVarName_Str = "fhd_normal";
  
  var responseVar_Filter = ee.Filter.eq("Response_Var", 
    responseVarName_Str);
  
  // Identify the corresponding testing results and optimal values.
  var testingResults_AllRounds_FC = final_TestingResults_FC
    .filter(responseVar_Filter);
  
  var optimalHPvalues_AllRounds_FC = all_OptimalHPvalues_FC
    .filter(
      ee.Filter.and(
        responseVar_Filter,
        ee.Filter.eq("Tuning_ID", 2)
      )
    );
  
  // Visualization.
  Visualize_HPvalues(3, 
    "variablesPerSplit", "Variables Per Split", 
    ["FF0000", "00D1D1"]);
  
  Visualize_HPvalues(3, 
    "minLeafPopulation", "Min. Leaf Population", 
    ["0000FF", "D1D100"]);
  
  Visualize_HPvalues(3, 
    "bagFraction", "Bagging Fraction", 
    ["228B22", "D100D1"]);

} else {
  
  var testingResults_FileName_Str = "Final_TestingResults";
  
  Export.table.toAsset({
    collection: final_TestingResults_FC, 
    description: testingResults_FileName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Hyperparameter_Tuning/"
      + testingResults_FileName_Str
  });
  
  var optimalHPvalues_FileName_Str = "All_OptimalHPvalues";
  
  Export.table.toAsset({
    collection: all_OptimalHPvalues_FC, 
    description: optimalHPvalues_FileName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Hyperparameter_Tuning/"
      + optimalHPvalues_FileName_Str
  });
}

