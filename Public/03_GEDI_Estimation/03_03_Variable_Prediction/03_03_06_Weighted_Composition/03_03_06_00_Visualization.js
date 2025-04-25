/*******************************************************************************
 * Introduction *
 * 
 *  1) Visualize the calculated weights of each selected tile.
 * 
 *  2) Visualize the two types of composited results.
 * 
 * Last updated: 1/15/2025
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

// Projection information.
var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

var wd_Main_2_Str = ENA_mod.wd_CW_Str;

var wd_Main_3_Str = ENA_mod.wd_EO_Str;

var wd_Main_4_Str = ENA_mod.wd_GEE_Str;

// Response variable name.
var varName_Str = "rh98";

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


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * 1) Visualize the calculated weights. *
 ******************************************************************************/

if (true) {
  
  // Selected tiles.
  var selectedTiles_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Weighted_Composition/"
    + "Tiles_NormalMSEinv"
  ).filter(
    ee.Filter.eq({
      name: "Response_Var", 
      value: varName_Str
    })
  );
  
  // Selected grid cells.
  var gridCells_FC = ee.FeatureCollection(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "CellAccuracy_AllResponseVars"
  ).filter(
    ee.Filter.eq({
      name: "Response_Var", 
      value: varName_Str
    })
  );
  
  // Tile centroids.
  var tileCtrs_Img = ee.Image(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Weighted_Composition/"
    + "Selected_TileCentroids"
  );
  
  // Normalized reversed distance to each tile centroid.
  var normal_RevDist_Img = ee.Image(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Weighted_Composition/"
    + "Normal_RevDist"
  );
  
  // Combined weight of each tile.
  var combinedWeight_Img = ee.Image(
    wd_Main_2_Str
    + "GEDI_Estimation/"
    + "Weighted_Composition/"
    + "Combined_Weights/"
    + varName_Str
  );

  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size());
  
  print("gridCells_FC:",
    gridCells_FC.first(),
    gridCells_FC.size());
  
  // IMG_mod.Print_ImgInfo(
  //   "tileCtrs_Img:",
  //   tileCtrs_Img
  // );
  
  // IMG_mod.Print_ImgInfo(
  //   "normal_RevDist_Img:",
  //   normal_RevDist_Img
  // );
  
  IMG_mod.Print_ImgInfo(
    "combinedWeight_Img:",
    combinedWeight_Img // 1693 bands.
  );
  
  var tileID_Num = 1500;
  
  var oneTile_FC = selectedTiles_FC.filter(
    ee.Filter.eq({
      name: "Tile_ID", 
      value: tileID_Num
    })
  );
  
  // Visualization.
  var empty_Img = ee.Image().toFloat();
  
  var selectedTiles_Img = empty_Img.paint({
    featureCollection: selectedTiles_FC, 
    color: "Normal_MSEinv"
  });
  
  var gridCells_RMSE_Img = empty_Img.paint({
    featureCollection: gridCells_FC, 
    color: "RMSE"
  });
  
  var oneTile_Img = empty_Img.paint({
    featureCollection: oneTile_FC, 
    color: "Normal_MSEinv"
  });
  
  Map.setOptions("Satellite");
  Map.centerObject(oneTile_FC, 8);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "All tiles",
    false);
  
  Map.addLayer(gridCells_RMSE_Img, 
    {
      min: 3,
      max: 10,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "RMSE (All cells)",
    false);
  
  Map.addLayer(selectedTiles_Img, 
    {
      min: 0,
      max: 1,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "Normal MSE inv (All tiles)",
    false);
  
  Map.addLayer(normal_RevDist_Img
    .select("Tile_" + tileID_Num), 
    {
      min: 0,
      max: 1,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "Normal Rev Dist (One tile)",
    true);
  
  Map.addLayer(oneTile_Img, 
    {
      min: 0,
      max: 1,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "Normal MSE inv (One tile)",
    true);
  
  Map.addLayer(combinedWeight_Img
    .select("Tile_" + tileID_Num), 
    {
      min: 0,
      max: 1,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "Combined weight (One tile)");
  
  Map.addLayer(tileCtrs_Img, 
    {
      palette: "FFFFFF"
    }, 
    "Tile centroid",
    false);
}


/*******************************************************************************
 * 2) Visualize the two types of composited results. *
 ******************************************************************************/

if (true) {

  // Randomly collected samples.
  var collectedSamples_FC = ee.FeatureCollection(
    wd_Main_3_Str
    + "GEDI_Estimation/"
    + "CollectedSamples_10perCell"
  );

  print("collectedSamples_FC:",
    collectedSamples_FC.first(),
    collectedSamples_FC.size());
  
  // Compare the composited results.
  for (var responseVarID_Num = 0; responseVarID_Num < 11; 
    responseVarID_Num ++) {

  // for (var responseVarID_Num = 3; responseVarID_Num < 4; 
  //   responseVarID_Num ++) {

    // Determine the response variable name.
    var responseVarName_Str = 
      selectedVarNames_List[responseVarID_Num];
    
    // Load the average estimate.
    var average_Img = ee.Image(
      wd_Main_4_Str
      + "GEDI_Estimation/"
      + "Composited_Results/"
      + "Raw/"
      + responseVarName_Str
    );
    
    // Load the weighted average estimate.
    var wtdAvg_Img = ee.Image(
      wd_Main_4_Str
      + "GEDI_Estimation/"
      + "Composited_Results/"
      + "Weighted/"
      + responseVarName_Str
    );
    
    // Estimate the extremem values of the response variable
    //   based on the randomly collected samples.
    var extremeValues_Dict = collectedSamples_FC
      .reduceColumns({
        selectors: [responseVarName_Str],
        reducer: ee.Reducer.percentile([1, 99])
      });
  
    Map.addLayer(average_Img, 
      {
        min: extremeValues_Dict.get("p1")
          .getInfo(),
        max: extremeValues_Dict.get("p99")
          .getInfo(),
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "Average-" + responseVarName_Str,
      false);
    
    Map.addLayer(wtdAvg_Img, 
      {
        min: extremeValues_Dict.get("p1")
          .getInfo(),
        max: extremeValues_Dict.get("p99")
          .getInfo(),
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "Weighted average-" + responseVarName_Str,
      false);
  }
  
  // Check the random samples with NAs.
  var samplesWithNAs_FC = ee.FeatureCollection(
    wd_Main_4_Str
    + "GEDI_Estimation/"
    + "Composited_Results/"
    + "SampledEstimates_Weighted"
  );
  
  var test_FC = samplesWithNAs_FC.filter(
    ee.Filter.notNull(["W_rh98"])
  );
  
  print("test_FC:",
    test_FC.first(),
    test_FC.size());
  
  Map.addLayer(collectedSamples_FC, 
    {
      color: "0000FF"
    }, 
    "Raw samples",
    false);
  
  Map.addLayer(samplesWithNAs_FC, 
    {
      color: "FF0000"
    }, 
    "Samples with NAs",
    false);
  
  Map.addLayer(test_FC, 
    {
      color: "00FFFF"
    }, 
    "Test samples",
    false);
  
}
