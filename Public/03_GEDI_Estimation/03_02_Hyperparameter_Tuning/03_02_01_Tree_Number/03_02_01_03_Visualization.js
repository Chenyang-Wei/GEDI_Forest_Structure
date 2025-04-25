/*******************************************************************************
 * Introduction *
 * 
 *  1) Display the modeling result of each tree number
 *     for each response variable. 
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
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Modeling results of all response variables.
var modelingResults_AllVars_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "TreeNumber_Determination/"
  + "All_ResponseVars");


/*******************************************************************************
 * 1) Display the modeling result of each tree number
 *    for each response variable. *
 ******************************************************************************/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  // Identify the modeling results of the response variable.
  var modelingResults_OneVar_FC = modelingResults_AllVars_FC
    .filter(ee.Filter.eq({
      name: "Response_Var", 
      value: responseVarName_Str
    }));
  
  
  /*******************************************************************************
   * Results *
   ******************************************************************************/
  
  // Whether to display the results.
  var visualize_Bool = true; // true OR false.
  
  if (visualize_Bool) {
    var modelingResults_OneVar_Chart =
      ui.Chart.feature
        .byFeature({
          features: modelingResults_OneVar_FC, 
          xProperty: "Tree_Number", 
          yProperties: ["RMSE"]
        })
        .setChartType("ScatterChart")
        .setOptions({
          title: responseVarName_Str,
          titleTextStyle: {
            italic: true, 
            bold: true
          },
          hAxis: {
            title: "Number of Trees", 
            titleTextStyle: {italic: false, bold: true}
          },
          vAxis: {
            title: "RMSE",
            titleTextStyle: {italic: false, bold: true}
          },
          fontSize: 32,
          pointSize: 12,
          colors: ["228B22"],
          legend: {position: "none"}
        });
    
    print(modelingResults_OneVar_Chart);
    // As there is little change in RMSE between 100 and 200 trees,
    //   the number of trees is set to 100.
    
  } else {
    
    /****** Check the dataset(s) and object(s). ******/
    
    print(responseVarName_Str,
      modelingResults_OneVar_FC.first(),
      modelingResults_OneVar_FC.size()); // 41.
  }
}

