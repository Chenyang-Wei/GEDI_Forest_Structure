/*******************************************************************************
 * Introduction *
 * 
 *  1) For each response variable, 
 *     visualize the model comparison result
 * 
 * Last updated: 10/22/2024
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

var PAL_mod = require(
  "users/gena/packages:palettes");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_FU_Str;

// Names of all response variables.
var allResponseVarNames_List = [
  "cover",
  "rh98",
  "fhd_normal",
  "pai",
  "PAVD_10_20m"
];

// // Names of all response variables.
// var allResponseVarNames_List = 
//   ENA_mod.allResponseVarNames_List;

// Predictor group names.
var predictorGroups_List = 
  ENA_mod.predictorGroups_List;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) For each response variable, 
 *    visualize the predictor comparison result. *
 ******************************************************************************/

// Dictionary to codify x-axis property names as values.
var xPropValues_Dict = {};

// Holds dictionaries that label codified x-axis values.
var xPropLabels_List = [];

// Organize property information into objects for defining x properties and
//   their tick labels.

for (var groupID_Num = 0; groupID_Num < 7; 
  groupID_Num ++) {
  
  // Determine a group of predictors to exclude.
  var excludedGroup_Str = 
    predictorGroups_List[groupID_Num];
  
  var R2_Name_Str = "Mean_d_R2_" + excludedGroup_Str;
  
  xPropValues_Dict[R2_Name_Str] = groupID_Num + 1;
  
  xPropLabels_List.push({
    v: groupID_Num + 1,
    f: excludedGroup_Str
  });
}

print(
  xPropValues_Dict,
  xPropLabels_List
);


// Load the corresponding result of predictor comparison.
var aggregated_AllTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "Modeling_Results/"
  + "ModelComparison_Aggregated"
);

print(
  "aggregated_AllTiles_FC:",
  aggregated_AllTiles_FC.size(), // 420 = 14 * 30.
  aggregated_AllTiles_FC.first()
);

// Determine a List of tile IDs.
var tileIDs_List = aggregated_AllTiles_FC
  .aggregate_array("Tile_ID")
  .distinct()
  .sort();

print(tileIDs_List);

// var tileID_Num = 2019;

// var aggregated_OneTile_FC = aggregated_AllTiles_FC
//   .filter(ee.Filter.eq("Tile_ID", tileID_Num));

// print(aggregated_OneTile_FC);

// for (var index_Num = 0; index_Num < 5; index_Num ++) {
for (var index_Num = 0; index_Num < 30; index_Num ++) {
  
  var tileID_Num = tileIDs_List.get(index_Num);

  var aggregated_OneTile_FC = aggregated_AllTiles_FC
    .filter(ee.Filter.eq("Tile_ID", tileID_Num));
  
  // for (var responseVarID_Num = 0; responseVarID_Num < 5; 
  //   responseVarID_Num ++) {
  
  for (var responseVarID_Num = 0; responseVarID_Num < 1; 
    responseVarID_Num ++) {
  
    // Determine the response variable.
    var responseVarName_Str = 
      allResponseVarNames_List[responseVarID_Num];
    
    var aggregated_OneVar_FC = aggregated_OneTile_FC
      .filter(ee.Filter.eq("Response_Var", responseVarName_Str));
    
    var R2_Chart = ui.Chart.feature
      .byProperty({
        features: aggregated_OneVar_FC,
        xProperties: xPropValues_Dict
      })
      .setChartType("ColumnChart")
      .setOptions({
        title: responseVarName_Str
          + " (Tile #: " + tileID_Num.getInfo() + ")",
        titleTextStyle: {italic: true, bold: true},
        hAxis: {
          title: "Predictors",
          titleTextStyle: {italic: false, bold: true},
          ticks: xPropLabels_List
        },
        vAxis: {
          title: "R2 Contribution",
          titleTextStyle: {italic: false, bold: true}
        },
        fontSize: 24,
        pointSize: 12,
        colors: ["228B22"],
        legend: {position: "none"}
      });
    
    print(R2_Chart);
  }
}

