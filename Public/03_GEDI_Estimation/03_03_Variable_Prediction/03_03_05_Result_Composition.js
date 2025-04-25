/*******************************************************************************
 * Introduction *
 * 
 *  1) Composite and visualize each estimated GEDI variable 
 *     of all tiles.
 * 
 * Last updated: 1/15/2025
 * 
 * Runtime: 2h ~ 3h
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

// Projection information.
var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

var wd_Main_2_Str = ENA_mod.wd_FU_Str;

var wd_Main_3_Str = ENA_mod.wd_EO_Str;

var wd_Main_4_Str = ENA_mod.wd_GEE_Str;

// Names of all response variables.
var allResponseVarNames_List = 
  ENA_mod.allResponseVarNames_List;

// Number of tiles in each loop.
var tileNumber_Num = 50;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Standardize the names of all bands to the variable name.
function Standardize_BandName(oldBandName_Str) {
  var renamedBand_Img = estimates_SingleVar_Img
    .select([oldBandName_Str], [responseVarName_Str]);
  
  return renamedBand_Img;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

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

// Whether to display the result(s).
var display_Bool = true; // true OR false.

if (display_Bool) {

  // Map visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-76.3402, 41.3386, 8);
  
  Map.addLayer(AOI_Geom, {color: "FFFFFF"},
    "AOI");
}


/****** Load and merge the results of each response variable. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 1; 
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

  // Load the estimated variable of the first tile set.
  var estimates_SingleVar_Img = ee.Image(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Estimation_Results/"
    + responseVarName_Str + "/"
    + "Estimates_Tiles0to50"
  );
  
  for (var startIndex_Num = 50; 
    startIndex_Num < 1700; 
    startIndex_Num += tileNumber_Num) {
    
    // Determine the file location based on the index of the start tile.
    if (startIndex_Num < 1000) {
      
      var wd_Main_Str = wd_Main_1_Str;
      
    } else {
      
      var wd_Main_Str = wd_Main_2_Str;
      
    }
    
    // Derive the index of the end tile.
    var endIndex_Num = startIndex_Num + tileNumber_Num;
    
    // Determine the file name of a single estimation result.
    var estimates_FileName_Str = "Estimates_Tiles"
      + startIndex_Num
      + "to"
      + endIndex_Num;
    
    // Load and add the single estimation result.
    var estimates_SingleResult_Img = ee.Image(
      wd_Main_Str
      + "GEDI_Estimation/"
      + "Estimation_Results/"
      + responseVarName_Str + "/"
      + estimates_FileName_Str
    );
    
    estimates_SingleVar_Img = estimates_SingleVar_Img
      .addBands(estimates_SingleResult_Img);
  }
  
  // Re-projection.
  estimates_SingleVar_Img = estimates_SingleVar_Img
    // .reproject(prj_30m);
  
  // Standardize the names of all bands to the variable name.
  var estimates_SingleVar_List = estimates_SingleVar_Img
    .bandNames()
    .map(Standardize_BandName);
  
  var estimates_SingleVar_IC = ee.ImageCollection.fromImages(
    estimates_SingleVar_List
  );
  
  // Composite all the estimation results of the response variable.
  var composited_SingleVar_Img = estimates_SingleVar_IC
    .mean()
    // .reproject(prj_30m);
  
  if (display_Bool) {
    
    // Load the composition result for comparison.
    var compositionResult_Img = ee.Image(
      wd_Main_4_Str
      + "GEDI_Estimation/"
      + "Composited_Results/"
      + "Raw/"
      + responseVarName_Str
    );
    
    IMG_mod.Print_ImgInfo(
      responseVarName_Str,
      composited_SingleVar_Img
    );
    
    IMG_mod.Print_ImgInfo(
      responseVarName_Str,
      compositionResult_Img
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
    
    Map.addLayer(compositionResult_Img, 
      {
        min: extremeValues_Dict.get("p5")
          .getInfo(),
        max: extremeValues_Dict.get("p95")
          .getInfo(),
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "Result_" + responseVarName_Str,
      true);
    
  } else {
    
    /**** Export the composited Image. ****/
    
    Export.image.toAsset({
      image: composited_SingleVar_Img, 
      description: responseVarName_Str, 
      assetId: wd_Main_4_Str
        + "GEDI_Estimation/"
        + "Composited_Results/"
        + "Raw/"
        + responseVarName_Str, 
      region: AOI_Geom, 
      scale: prj_30m.scale, 
      crs: prj_30m.crs, 
      maxPixels: 1e13
    });
  }
}

