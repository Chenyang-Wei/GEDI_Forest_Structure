/*******************************************************************************
 * Introduction *
 * 
 *  1) Visualize the results of hyperparameter tuning.
 * 
 * Last updated: 10/9/2024
 * 
 * Runtime: N/A
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

print("allResponseVarNames_List:",
  allResponseVarNames_List);


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
      .filter(ee.Filter.eq("Round_ID", roundID_Num))
      .sort("Tuning_ID");

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
          title: 
            HPtitle_Str + " (Round-" + roundID_Num + ")",
          titleTextStyle: {
            italic: true, 
            bold: true
          },
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
          fontSize: 32,
          pointSize: 12,
          colors: colors_List,
          legend: {position: "none"}
        });
    
    print(HPvalues_Chart);
  }


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Final testing results of all response variables.
var final_TestingResults_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "Final_TestingResults"
);

// Optimal hyperparameter values of all response variables.
var optimalHPvalues_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "All_OptimalHPvalues");


/*******************************************************************************
 * 1) Visualize the results of hyperparameter tuning. *
 ******************************************************************************/

// Select a response variable.
// var responseVarName_Str = "fhd_normal";
var responseVarName_Str = "cover";

var responseVar_Filter = ee.Filter.eq("Response_Var", 
  responseVarName_Str);

// Identify the corresponding testing results and optimal values.
var testingResults_AllRounds_FC = final_TestingResults_FC
  .filter(responseVar_Filter);

var optimalHPvalues_AllRounds_FC = optimalHPvalues_AllVars_FC
  .filter(
    ee.Filter.and(
      responseVar_Filter,
      ee.Filter.eq("Tuning_ID", 2)
    )
  );


/****** Making a Chart for each tuning outcome. ******/

/**** Round 1. ****/

var colors1_List = ["ca0020", "0571b0"];
var colors2_List = ["e66101", "5e3c99"];
var colors3_List = ["7b3294", "008837"];

// Variables Per Split.
Visualize_HPvalues(1, 
  "variablesPerSplit", "Variables Per Split", 
  colors1_List);

Visualize_HPvalues(2, 
  "variablesPerSplit", "Variables Per Split", 
  colors1_List);

Visualize_HPvalues(3, 
  "variablesPerSplit", "Variables Per Split", 
  colors1_List);

// Min. Leaf Population.
Visualize_HPvalues(1, 
  "minLeafPopulation", "Min. Leaf Population", 
  colors2_List);

Visualize_HPvalues(2, 
  "minLeafPopulation", "Min. Leaf Population", 
  colors2_List);

Visualize_HPvalues(3, 
  "minLeafPopulation", "Min. Leaf Population", 
  colors2_List);

// Bagging Fraction.
Visualize_HPvalues(1, 
  "bagFraction", "Bagging Fraction", 
  colors3_List);

Visualize_HPvalues(2, 
  "bagFraction", "Bagging Fraction", 
  colors3_List);

Visualize_HPvalues(3, 
  "bagFraction", "Bagging Fraction", 
  colors3_List);


/*******************************************************************************
* Results *
******************************************************************************/

// Whether to display the optimal hyperparameter values.
var display_Bool = true; // true OR false.

if (display_Bool) {
  
  // Check the object(s) and dataset(s).
  
  var testingResults_FC = testingResults_AllRounds_FC
    .filter(ee.Filter.and(
      ee.Filter.eq("Round_ID", 3),
      ee.Filter.eq("Tuning_ID", 2),
      ee.Filter.eq("HP_Name", "bagFraction")
    ));
  
  print("variablesPerSplit",
    optimalHPvalues_AllVars_FC
      .filter(ee.Filter.and(
        ee.Filter.eq("Round_ID", 3),
        ee.Filter.eq("Tuning_ID", 2),
        ee.Filter.eq("HP_Name", "variablesPerSplit")
      ))
      .aggregate_array("HP_Value"));

  print("minLeafPopulation",
    optimalHPvalues_AllVars_FC
      .filter(ee.Filter.and(
        ee.Filter.eq("Round_ID", 3),
        ee.Filter.eq("Tuning_ID", 2),
        ee.Filter.eq("HP_Name", "minLeafPopulation")
      ))
      .aggregate_array("HP_Value"));
  
  print("bagFraction",
    optimalHPvalues_AllVars_FC
      .filter(ee.Filter.and(
        ee.Filter.eq("Round_ID", 3),
        ee.Filter.eq("Tuning_ID", 2),
        ee.Filter.eq("HP_Name", "bagFraction")
      ))
      .aggregate_array("HP_Value"));
}

