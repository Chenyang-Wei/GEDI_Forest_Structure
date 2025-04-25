/*******************************************************************************
 * Introduction *
 * 
 *  1) Merge the accuracy assessment results of all tiles of
 *     all response variables into a single file.
 * 
 * Last updated: 10/1/2024
 * 
 * Runtime: 4m
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

var wd_Main_2_Str = ENA_mod.wd_FU_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Number of tiles in each loop.
var tileNumber_Num = 50;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) Merge the accuracy assessment results of all tiles of
 *    all response variables into a single file. *
 ******************************************************************************/

// Create an empty List to store the merged results.
var accuracy_AllResponseVars_List = ee.List([]);


/****** Load and merge the results of each response variable. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  for (var startIndex_Num = 0; startIndex_Num < 1700; 
    startIndex_Num += tileNumber_Num) {
    
    // Determine the file location based on the index of the start tile.
    if (startIndex_Num < 1000) {
      
      var wd_Main_Str = wd_Main_1_Str;
      
    } else {
      
      var wd_Main_Str = wd_Main_2_Str;
      
    }
    
    // Derive the index of the end tile.
    var endIndex_Num = startIndex_Num + tileNumber_Num;
    
    // Determine the response variable name.
    var responseVarName_Str = 
      allResponseVarNames_List[responseVarID_Num];
    
    // Determine the file name of a single dataset.
    var accuracy_FileName_Str = "Accuracy_Tiles"
      + startIndex_Num
      + "to"
      + endIndex_Num;
    
    // Load and add the single result of accuracy assessment.
    var accuracy_SingleResult_FC = ee.FeatureCollection(
      wd_Main_Str
      + "GEDI_Estimation/"
      + "Estimation_Results/"
      + responseVarName_Str + "/"
      + accuracy_FileName_Str);
    
    accuracy_AllResponseVars_List = accuracy_AllResponseVars_List
      .add(accuracy_SingleResult_FC);
  }
}

// Convert the merging result to a FeatureCollection.
var accuracy_AllResponseVars_FC = ee.FeatureCollection(
  accuracy_AllResponseVars_List)
  .flatten();


/*******************************************************************************
* Results *
******************************************************************************/

// Whether to export the results.
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("allResponseVarNames_List:", 
    allResponseVarNames_List); // 14 elements.
  
  print("accuracy_AllResponseVars_FC:",
    accuracy_AllResponseVars_FC.first(),
    accuracy_AllResponseVars_FC.size()); // 23702.
  
} else {
  
  /**** Export the result(s). ****/
  
  var accuracy_FileName_Str = "Accuracy_AllResponseVars";
  
  Export.table.toAsset({
    collection: accuracy_AllResponseVars_FC, 
    description: accuracy_FileName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + accuracy_FileName_Str
  });
}

