/*******************************************************************************
 * Introduction *
 * 
 *  1) For each non-FHD response variable, 
 *     train and test Random Forest models by tile.
 * 
 * Last updated: 9/26/2024
 * 
 * Runtime: <= 3h
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
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_LiDAR_Str;

var wd_S2_Str = wd_Main_2_Str
  + "Environmental_Data/"
  + "Sentinel-2_Variables/";

var wd_Main_3_Str = ENA_mod.wd_EO_Str;

var wd_Main_4_Str = ENA_mod.wd_Birds_Str;

var wd_Main_5_Str = ENA_mod.wd_GEE_Str;

var wd_Main_6_Str = ENA_mod.wd_FU_Str;

// Property names.
var tileID_Name_Str = "Tile_ID";

var columnName_Str = "Split_OneTile";

var estimatedVarNamePrefix_Str = "Est_";

// Proportion of training samples.
var trainingRatio_Num = 0.8;

// Number of trees.
var treeNum_Num = 100;

// Names of all response variables.
var allResponseVarNames_List = [
  "RHD_25to50",
  "RHD_50to75",
  "RHD_75to98",
  "rh98",
  "cover",
  "pai",
  "PAVD_0_10m",
  "PAVD_10_20m",
  "PAVD_20_30m",
  "PAVD_30_40m",
  "PAVD_40_50m",
  "PAVD_50_60m",
  "PAVD_over60m"
]; // (For non-FHD variables.)

// Last round of tuning.
var lastRoundID_Num = 3;

// Number of tiles in each loop.
var tileNumber_Num = 50; // (For non-FHD variables.)

// Number of the top-ranked predictors in each RF model.
var topVarNumber_Num = 20;

// Property names for the top-ranked predictors and their importance.
var topVarIDs_List = ee.List.sequence({
  start: 1, 
  end: topVarNumber_Num
});

var topVarNames_List = topVarIDs_List.map(
  function Create_VarName(topVarID_Num) {
    topVarID_Num = ee.Number(topVarID_Num).toInt();
    
    var topVarID_Str = ee.String(topVarID_Num);
    
    var topVarName_Str = ee.String("Var").cat(topVarID_Str)
      .cat("_Name");
    
    return topVarName_Str;
  });

var topVarImportance_List = topVarIDs_List.map(
  function Create_VarImportance(topVarID_Num) {
    topVarID_Num = ee.Number(topVarID_Num).toInt();
    
    var topVarID_Str = ee.String(topVarID_Num);
    
    var topVarImportance_Str = ee.String("Var").cat(topVarID_Str)
      .cat("_Importance");
    
    return topVarImportance_Str;
  });

// Whether to export the result(s).
var export_Bool = true; // true OR false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Estimate a GEDI variable by tile.
function Estimate_Variable_ByTile(tileID_Num) {
  
  // Derive a randomization seed.
  var randomSeed_Num = ee.Number(tileID_Num)
    .multiply(responseVarID_Num + 1); // (For non-FHD variables.)
  
  // Extract a single tile and grid cell.
  var tile_Geom = selectedTiles_FC.filter(ee.Filter.eq({
    name: tileID_Name_Str, 
    value: tileID_Num
  })).first().geometry();
  
  var gridCell_Ftr = selectedGridCells_FC.filter(ee.Filter.eq({
    name: tileID_Name_Str, 
    value: tileID_Num
  })).first();
  
  // Randomly split samples collected from the corresponding tile.
  var samples_OneTile_FC = vectorizedSamples_FC
    .filter(ee.Filter.eq({
      name: tileID_Name_Str, 
      value: tileID_Num
    }))
    .randomColumn({
      columnName: columnName_Str, 
      seed: randomSeed_Num
    });
  
  var trainingSamples_OneTile_FC = samples_OneTile_FC.filter(
    ee.Filter.lt(columnName_Str, trainingRatio_Num));
  
  var testingSamples_OneTile_FC = samples_OneTile_FC.filter(
    ee.Filter.gte(columnName_Str, trainingRatio_Num));
  
  // Train a RF Classifier based on the training samples.
  var randomForest_Classifier = 
    ee.Classifier.smileRandomForest({
      numberOfTrees: treeNum_Num,
      variablesPerSplit: optimal_VariablesPerSplit_Num,
      minLeafPopulation: optimal_MinLeafPopulation_Num,
      bagFraction: optimal_BagFraction_Num,
      maxNodes: null,
      seed: randomSeed_Num
    }).setOutputMode("REGRESSION");
  
  randomForest_Classifier = randomForest_Classifier
    .train({
      features: trainingSamples_OneTile_FC, 
      classProperty: responseVarName_Str, 
      inputProperties: predictorNames_List
    }); 
  
  // Apply the trained Classifier to the testing samples.
  var testingResult_OneTile_FC = testingSamples_OneTile_FC
    .classify({
      classifier: randomForest_Classifier,
      outputName: estimatedVarName_Str
    });
  
  var responseVarMean_Num = testingResult_OneTile_FC
    .reduceColumns({
      reducer: ee.Reducer.mean(), 
      selectors: [responseVarName_Str]
    }).get("mean");
  
  // Calculate RMSE and R-squared.
  testingResult_OneTile_FC = testingResult_OneTile_FC.map(
    function(testingSample_Ftr) {
      
      var actualValue_Num = testingSample_Ftr
        .get(responseVarName_Str);
        
      var estimatedValue_Num = testingSample_Ftr
        .get(estimatedVarName_Str);
      
      var squared_FitDiff_Num = ee.Number(actualValue_Num)
        .subtract(estimatedValue_Num)
        .pow(2);
      
      var squared_MeanDiff_Num = ee.Number(actualValue_Num)
        .subtract(responseVarMean_Num)
        .pow(2);
      
      return testingSample_Ftr.set({
        Squared_FitDiff: squared_FitDiff_Num,
        Squared_MeanDiff: squared_MeanDiff_Num
      });
    }
  );
  
  // RMSE.
  var MSE_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.mean(), 
    selectors: ["Squared_FitDiff"]
  }).get("mean");
  
  var RMSE_Num = ee.Number(MSE_Num).sqrt();
  
  // R-squared.
  var SS_tot_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_MeanDiff"]
  }).get("sum");
  
  var SS_res_Num = testingResult_OneTile_FC.reduceColumns({
    reducer: ee.Reducer.sum(), 
    selectors: ["Squared_FitDiff"]
  }).get("sum");
  
  var R_squared_Num = ee.Number(1).subtract(
    ee.Number(SS_res_Num).divide(SS_tot_Num)
  );
  
  // Apply the trained Classifier to the Image of predictors.
  var estimatedVar_Img = predictors_Img
    .classify({
      classifier: randomForest_Classifier,
      outputName: ee.String(estimatedVarName_Str)
        .cat("_")
        .cat(ee.Number(tileID_Num).toInt())
    });

  var estimates_OneTile_Img = estimatedVar_Img
    .clip(tile_Geom);
  
  // Acquire the importance of each predictor.
  var importance_AllVars_Dict = ee.Dictionary(
    randomForest_Classifier.explain()
      .get("importance")
  );

  // Convert the Dictionary to a FeatureCollection.
  var importance_AllVars_List = predictorNames_List.map(
    function Convert_Importance(predictorName_Str) {
      var importance_OneVar_Num = importance_AllVars_Dict
        .getNumber(predictorName_Str);
      
      return ee.Feature(null).set({
        Var_Name: predictorName_Str,
        Var_Importance: importance_OneVar_Num
      });
    });
  
  var importance_AllVars_FC = ee.FeatureCollection(
    importance_AllVars_List
  );
  
  // Identify the top-ranked predictors.
  importance_AllVars_FC = importance_AllVars_FC.sort({
    property: "Var_Importance", 
    ascending: false
  });
  
  var importance_TopVars_FC = importance_AllVars_FC
    .limit(topVarNumber_Num);
  
  // Convert the names and importance of the top-ranked predictors
  //   to Dictionaries.
  var topVarNames_Dict = ee.Dictionary.fromLists({
    keys: topVarNames_List, 
    values: importance_TopVars_FC.aggregate_array("Var_Name")
  });
  
  var topVarImportance_Dict = ee.Dictionary.fromLists({
    keys: topVarImportance_List, 
    values: importance_TopVars_FC.aggregate_array("Var_Importance")
  });

  // Add all results to the grid cell as properties.
  var gridCell_WithResults_Ftr = gridCell_Ftr
    .set({
      Response_Var: responseVarName_Str,
      RMSE: RMSE_Num,
      R_squared: R_squared_Num,
      Estimate: estimates_OneTile_Img
    })
    .set(topVarNames_Dict)
    .set(topVarImportance_Dict);
  
  return gridCell_WithResults_Ftr;
}

// Rename the band of each tile.
function Rename_TileBand(oldBandName_Str) {
  oldBandName_Str = ee.String(oldBandName_Str);
  
  var newBandName_Str = oldBandName_Str.slice({
    start: oldBandName_Str.index(estimatedVarName_Str)
  });
  
  return newBandName_Str;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

/****** Tiles and samples. ******/

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/****** Environmental predictors. ******/

// HLSL30 predictors.
var HLSL30_SR_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "HLSL30_MedianSR"
);

var HLSL30_Vars_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "HLSL30_Variables"
);

// Sentinel-2 predictors.
var S2_SR_B2_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B2"
).select(["B2"], ["SR_B2"]);

var S2_SR_B3_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B3"
).select(["B3"], ["SR_B3"]);

var S2_SR_B4_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B4"
).select(["B4"], ["SR_B4"]);

var S2_SR_B8_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B8"
).select(["B8"], ["SR_B8"]);

var S2_SR_20m_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_20mBands"
).select(
  ["B5", "B6", "B7", "B8A", "B11", "B12"],
  ["S2_B5", "S2_B6", "S2_B7", "S2_B8A", "S2_B11", "S2_B12"]
);

var S2_Vars_Img = ee.Image(wd_S2_Str
  + "S2_Variables"
).select(
  ["NDVI", "kNDVI", "NIRv", "EVI", "NDWI",
   "mNDWI", "NBR", "BSI", "SI", "BU",
   "Brightness", "Greenness", "Wetness"],
  ["S2_NDVI", "S2_kNDVI", "S2_NIRv", "S2_EVI", "S2_NDWI",
   "S2_mNDWI", "S2_NBR", "S2_BSI", "S2_SI", "S2_BU",
   "S2_Brightness", "S2_Greenness", "S2_Wetness"]
);

// Sentinel-1 variables.
var S1_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "S1_Variables"
);

// Topographic features.
var ALOS_Topo_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "ALOS_TopographicFeatures"
);

var resampled_Topo_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "ALOS_ResampledVariables"
);

// Land cover types.
var LC_ESRI_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "LandCover_ESRI"
);

var LC_GLC_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "LandCover_GLC"
);

// Leaf traits.
var SLA_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "SLA"
);

var LNC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LNC"
);

var LPC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LPC"
);

var LDMC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LDMC"
);

// Soil properties.
var soilProperties_1_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "0-5cm"
);

var soilProperties_2_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "5-15cm"
);

var soilProperties_3_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "15-30cm"
);

var soilProperties_4_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "OCS_0-30cm"
);


/****** Model hyperparameters. ******/

// All the determined optimal values.
var all_OptimalHPvalues_FC = ee.FeatureCollection(
  wd_Main_4_Str
  + "GEDI_Estimation/"
  + "Hyperparameter_Tuning/"
  + "All_OptimalHPvalues");

// Extract the optimal values from the last-round tuning.
all_OptimalHPvalues_FC = all_OptimalHPvalues_FC
  .filter(
    ee.Filter.and(
      ee.Filter.eq("Round_ID", lastRoundID_Num),
      ee.Filter.eq("Tuning_ID", 2)
    )
  );


/*******************************************************************************
 * 1) For each response variable, 
 *    train and test Random Forest models by tile. *
 ******************************************************************************/

// Stack the environmental predictors.
var predictors_Img = ee.Image.cat(
  HLSL30_SR_Img,
  HLSL30_Vars_Img,
  S2_SR_B2_Img,
  S2_SR_B3_Img,
  S2_SR_B4_Img,
  S2_SR_B8_Img,
  S2_SR_20m_Img,
  S2_Vars_Img,
  S1_Img,
  ALOS_Topo_Img,
  resampled_Topo_Img,
  LC_ESRI_Img,
  LC_GLC_Img,
  SLA_Img,
  LNC_Img,
  LPC_Img,
  LDMC_Img,
  soilProperties_1_Img,
  soilProperties_2_Img,
  soilProperties_3_Img,
  soilProperties_4_Img
);

// Re-projection.
predictors_Img = predictors_Img
  .reproject(prj_30m);

// Determine the names of predictors.
var predictorNames_List = predictors_Img
  .bandNames();


/****** Remove pixels with missing predictors 
  or in the water. ******/

// Data mask of the stacked predictors.
var predictorMask_Img = predictors_Img
  .mask()
  .reduce(ee.Reducer.min())
  .rename("Predictor_Mask");

// Generate non-water masks.
var nonWaterMask_ESRI_Img = predictors_Img
  .select("LandCover_ESRI")
  .neq(1);

var nonWaterMask_GLC_Img = predictors_Img
  .select("LandCover_GLC")
  .neq(210);

// Combine all the masks.
var combinedMasks_Img = predictorMask_Img
  .and(nonWaterMask_ESRI_Img)
  .and(nonWaterMask_GLC_Img)
  .rename("Combined_Masks");

predictors_Img = predictors_Img
  .updateMask(combinedMasks_Img);

// Identify the qualified tiles with adequate samples.
var tileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str)
  .sort();


/****** Perform the RF modeling process 
  for each response variable and each tile. ******/

for (var responseVarID_Num = 0; responseVarID_Num < 13; 
  responseVarID_Num ++) { // (For non-FHD variables.)

  // Select a response variable.
  var responseVarName_Str = 
    allResponseVarNames_List[responseVarID_Num];
  
  var estimatedVarName_Str = estimatedVarNamePrefix_Str 
    + responseVarName_Str;
  
  // Extract the optimal values of the corresponding
  //   response variable.
  var optimal_HPvalue_FC = all_OptimalHPvalues_FC
    .filter(
      ee.Filter.eq("Response_Var", responseVarName_Str));

  var optimal_VariablesPerSplit_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "variablesPerSplit"))
      .first()
      .get("HP_Value");
  
  var optimal_MinLeafPopulation_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "minLeafPopulation"))
      .first()
      .get("HP_Value");
  
  var optimal_BagFraction_Num = 
    optimal_HPvalue_FC
      .filter(
        ee.Filter.eq("HP_Name", "bagFraction"))
      .first()
      .get("HP_Value");
  
  for (var startIndex_Num = 1500; startIndex_Num < 1700; 
    startIndex_Num += tileNumber_Num) { // (For non-FHD variables.)
    
    var endIndex_Num = startIndex_Num + tileNumber_Num;
    
    var tileIDs_Subset_List = tileIDs_List
      .slice(startIndex_Num, endIndex_Num);
    
    // Variable estimation by tile.
    var estimates_AllTiles_List = tileIDs_Subset_List
      .map(Estimate_Variable_ByTile);
    
    // Extract the estimation accuracy.
    var estimates_AllTiles_FC = ee.FeatureCollection(
      estimates_AllTiles_List
    );
    
    var accuracyNames_List = estimates_AllTiles_FC
      .first()
      .propertyNames()
      .remove("Estimate");
    
    var accuracy_AllTiles_FC = estimates_AllTiles_FC
      .select(accuracyNames_List);
    
    // Convert the estimated variable to an Image.
    var estimates_AllTiles_IC = ee.ImageCollection.fromImages(
      estimates_AllTiles_FC.aggregate_array("Estimate")
    );
    
    var estimates_AllTiles_Img = estimates_AllTiles_IC
      .toBands()
      .reproject(prj_30m)
      .toFloat();
    
    // Rename the derived bands of all tiles.
    var oldBandNames_List = estimates_AllTiles_Img
      .bandNames();
    
    var newBandNames_List = oldBandNames_List
      .map(Rename_TileBand);
    
    estimates_AllTiles_Img = estimates_AllTiles_Img
      .select(
        oldBandNames_List, 
        newBandNames_List
      );
    
    
    /**** Export the results. ****/

    if (export_Bool) {
      
      var estimates_FileName_Str = "Estimates_Tiles"
        + startIndex_Num
        + "to"
        + endIndex_Num;
      
      Export.image.toAsset({
        image: estimates_AllTiles_Img, 
        description: estimates_FileName_Str, 
        assetId: wd_Main_6_Str // (For non-FHD variables.)
        // assetId: wd_Main_4_Str // (For non-FHD variables.)
          + "GEDI_Estimation/"
          + "Estimation_Results/"
          + responseVarName_Str + "/"
          + estimates_FileName_Str, 
        region: AOI_Geom, 
        scale: prj_30m.scale, 
        crs: prj_30m.crs, 
        maxPixels: 1e13
      });
      
      var accuracy_FileName_Str = "Accuracy_Tiles"
        + startIndex_Num
        + "to"
        + endIndex_Num;
      
      Export.table.toAsset({
        collection: accuracy_AllTiles_FC, 
        description: accuracy_FileName_Str, 
        assetId: wd_Main_6_Str // (For non-FHD variables.)
        // assetId: wd_Main_4_Str // (For non-FHD variables.)
          + "GEDI_Estimation/"
          + "Estimation_Results/"
          + responseVarName_Str + "/"
          + accuracy_FileName_Str
      });
    }
  }
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  // Check the dataset(s).
  print("selectedTiles_FC:", 
    selectedTiles_FC.size(), // 1693.
    tileIDs_List.distinct().size(), // 1693.
    selectedTiles_FC.first());

  print("selectedGridCells_FC:", 
    selectedGridCells_FC.size(), // 1693.
    selectedGridCells_FC.first());
  
  print("vectorizedSamples_FC:", 
    vectorizedSamples_FC.size(), // 26464326.
    vectorizedSamples_FC.first()); // 113 properties.

  print("all_OptimalHPvalues_FC:", 
    all_OptimalHPvalues_FC.size(), // 42 = 14 * 3.
    all_OptimalHPvalues_FC.first());

  print("allResponseVarNames_List:", 
    allResponseVarNames_List);

  IMG_mod.Print_ImgInfo(
    "predictors_Img:",
    predictors_Img
  ); // 93 bands.
  
  IMG_mod.Print_ImgInfo(
    "combinedMasks_Img:",
    combinedMasks_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "FF0000"
    }, 
    "selectedTiles_FC");

  Map.addLayer(selectedGridCells_FC, 
    {
      color: "00FFFF"
    }, 
    "selectedGridCells_FC");

  Map.addLayer(nonWaterMask_GLC_Img.selfMask(), 
    {
      palette: "0000FF"
    }, 
    "nonWaterMask_GLC_Img",
    false);

  Map.addLayer(nonWaterMask_ESRI_Img.selfMask(), 
    {
      palette: "FFFF00"
    }, 
    "nonWaterMask_ESRI_Img",
    false);
}

