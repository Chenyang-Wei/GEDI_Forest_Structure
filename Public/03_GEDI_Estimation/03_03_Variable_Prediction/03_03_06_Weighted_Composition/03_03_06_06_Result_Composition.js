/*******************************************************************************
 * Introduction *
 * 
 *  1) Calculate the weighed average of all estimated values of 
 *     each selected GEDI variable at each pixel.
 * 
 * Last updated: 1/10/2025
 * 
 * Runtime: 5h ~ 9h
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

// Names of selected response variables.
var selectedVarNames_List = [
  "RHD_25to50",
  "RHD_50to75",
  "RHD_75to98",
  "rh98",
  "cover",
  "fhd_normal",
  "pai",
  "PAVD_0_10m",
  "PAVD_10_20m",
  "PAVD_20_30m",
  "PAVD_30_40m"
];

// Number of tiles in each loop.
var tileNumber_Num = 50;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Calculate the weighted estimates.
function Calculate_WeightedEstimates(tileID_Num) {
  
  // Convert the tile ID to an integer.
  tileID_Num = ee.Number(tileID_Num)
    .toInt();
  
  // Identify the combined weights of each tile.
  var weights_OneTile_Str = ee.String("Tile_")
    .cat(tileID_Num);
  
  var weights_OneTile_Img = weights_AllTiles_Img
    .select([weights_OneTile_Str], [varName_Str]);
  
  // Identify the estimation result of each tile.
  var estimates_OneTile_Str = ee.String("Est_")
    .cat(varName_Str)
    .cat("_")
    .cat(tileID_Num);
  
  var estimates_OneTile_Img = estimates_AllTiles_Img
    .select([estimates_OneTile_Str], [varName_Str]);
  
  // Calculate the weighted estimates of each tile.
  var weighted_OneTile_Img = estimates_OneTile_Img
    .multiply(weights_OneTile_Img);
  
  return weighted_OneTile_Img;
}

// Standardize the band names of the combined weights.
function Standardize_WeightNames(oldBandName_Str) {
  var renamedBand_Img = weights_AllTiles_Img
    .select([oldBandName_Str], [varName_Str]);
  
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
var display_Bool = false; // true/false.

if (display_Bool) {

  // Map visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-76.3402, 41.3386, 8);
  
  Map.addLayer(AOI_Geom, {color: "FFFFFF"},
    "AOI");
}

// Determine the List of tile IDs.
var tileIDs_List = collectedSamples_FC
  .aggregate_array("Tile_ID")
  .distinct();


/****** Result composition by response variable. ******/

for (var varID_Num = 9; varID_Num < 11; varID_Num ++) {

  // Determine the response variable name.
  var varName_Str = 
    selectedVarNames_List[varID_Num];
  
  // Estimate the extreme values of the response variable
  //   based on the randomly collected samples.
  var extremeValues_Dict = collectedSamples_FC
    .reduceColumns({
      selectors: [varName_Str],
      reducer: ee.Reducer.percentile([5, 95])
    });
  
  
  /****** Load the estimated values of each response variable. ******/

  // Load the estimation result of the first tile set.
  var estimates_AllTiles_Img = ee.Image(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Estimation_Results/"
    + varName_Str + "/"
    + "Estimates_Tiles0to50"
  );
  
  // Load and merge the estimation results of the remaining tile sets.
  for (var startIndex_Num = 50; startIndex_Num < 1700; 
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
      + varName_Str + "/"
      + estimates_FileName_Str
    );
    
    estimates_AllTiles_Img = estimates_AllTiles_Img
      .addBands(estimates_SingleResult_Img);
  }
  
  
  /****** Load the combined weights of each response variable. ******/

  // Determine the file location based on the response variable ID.
  if (varID_Num < 8) {
    
    var wd_Main_5_Str = ENA_mod.wd_CW_Str;
    
  } else {
    
    var wd_Main_5_Str = ENA_mod.wd_WEI_Str;
    
  }
  
  // Load the combined weights.
  var weights_AllTiles_Img = ee.Image(
    wd_Main_5_Str
    + "GEDI_Estimation/"
    + "Weighted_Composition/"
    + "Combined_Weights/"
    + varName_Str
  );
  
  
  /****** Calculate the weighted average at each pixel. ******/

  // Re-projection.
  estimates_AllTiles_Img = estimates_AllTiles_Img
    .reproject(prj_30m);
  
  weights_AllTiles_Img = weights_AllTiles_Img
    .reproject(prj_30m);
  
  // Standardize the band names of the combined weights.
  var weights_AllTiles_List = weights_AllTiles_Img
    .bandNames()
    .map(Standardize_WeightNames);
  
  // Calculate the weighted estimates.
  var weighted_AllTiles_List = tileIDs_List.map(
    Calculate_WeightedEstimates
  );
  
  // Sum up all weights at each pixel.
  var weights_AllTiles_IC = ee.ImageCollection.fromImages(
    weights_AllTiles_List
  );
  
  var weights_SingleVar_Img = weights_AllTiles_IC
    .sum()
    .reproject(prj_30m);
  
  // Sum up all weighted estimates at each pixel.
  var weighted_AllTiles_IC = ee.ImageCollection.fromImages(
    weighted_AllTiles_List
  );
  
  var weighted_SingleVar_Img = weighted_AllTiles_IC
    .sum()
    .reproject(prj_30m);
  
  // Calculate the weighted average at each pixel.
  var wtdAvg_SingleVar_Img = weighted_SingleVar_Img
    .divide(weights_SingleVar_Img)
    .reproject(prj_30m)
    .toFloat();
  
  
  /* Check the objects. */
  
  if (display_Bool) {
    
    // IMG_mod.Print_ImgInfo(
    //   varName_Str,
    //   estimates_AllTiles_Img // 1693 bands.
    // );
    
    // IMG_mod.Print_ImgInfo(
    //   varName_Str,
    //   weights_AllTiles_Img // 1693 bands.
    // );
    
    IMG_mod.Print_ImgInfo(
      varName_Str,
      wtdAvg_SingleVar_Img // 1 band.
    );
    
    // if (varID_Num == 3) {
      
    //   // Visualize the "RH98".
      
    //   Map.addLayer(wtdAvg_SingleVar_Img, 
    //     {
    //       min: 0,
    //       max: 1,
    //       palette: PAL_mod.matplotlib.viridis[7]
    //     }, 
    //     varName_Str,
    //     true);
    // }
    
  } else {
    
    /**** Export the composited Image. ****/
    
    Export.image.toAsset({
      image: wtdAvg_SingleVar_Img, 
      description: varName_Str, 
      assetId: wd_Main_4_Str
        + "GEDI_Estimation/"
        + "Composited_Results/"
        + "Weighted/"
        + varName_Str, 
      region: AOI_Geom, 
      scale: prj_30m.scale, 
      crs: prj_30m.crs, 
      maxPixels: 1e13
    });
  }
}

