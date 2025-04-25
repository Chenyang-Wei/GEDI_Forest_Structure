/*******************************************************************************
 * Introduction *
 * 
 *  1) Composite and visualize each estimated GEDI variable 
 *     of all tiles.
 * 
 * Last updated: 10/23/2024
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

var IMG_mod = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");

var PAL_mod = require(
  "users/gena/packages:palettes");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_3_Str = ENA_mod.wd_EO_Str;

var wd_Main_4_Str = ENA_mod.wd_GEE_Str;

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

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/StudyArea_SelectedBCRs"
);

// Randomly collected samples.
var collectedSamples_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "CollectedSamples_10perCell"
);


/*******************************************************************************
 * 1) Composite and visualize each estimated GEDI variable 
 *    of all tiles. *
 ******************************************************************************/

// Whether to display or map the result(s).
var display_Bool = true; // true/false.
var map_Bool = false; // true/false.

if (display_Bool) {

  // Map visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-76.3402, 41.3386, 8);
  
  Map.addLayer(AOI_Geom, {color: "000000"},
    "AOI",
    true,
    0.3);
  
  Map.addLayer(studyArea_FC, {color: "FFFFFF"},
    "studyArea_FC",
    true,
    0.7);
}


/****** Display the composited result of each response variable. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  responseVarID_Num ++) {

  // Determine the response variable name.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  // Estimate the extremem values of the response variable
  //   based on the randomly collected samples.
  var extremeValues_Dict = collectedSamples_FC
    .reduceColumns({
      selectors: [responseVarName_Str],
      reducer: ee.Reducer.percentile([5, 95])
    });
  
  // Load the composited result.
  var composited_SingleVar_Img = ee.Image(
    wd_Main_4_Str
    + "GEDI_Estimation/"
    + "Composited_Results/"
    + responseVarName_Str
  );
  
  if (map_Bool) {
      
    IMG_mod.Print_ImgInfo(
      responseVarName_Str,
      composited_SingleVar_Img
    );
    
    /**** Visualize the composited Image. ****/
    
    Map.addLayer(composited_SingleVar_Img, 
      {
        min: extremeValues_Dict.get("p5")
          .getInfo(),
        max: extremeValues_Dict.get("p95")
          .getInfo(),
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      responseVarName_Str,
      true);
  }
}

