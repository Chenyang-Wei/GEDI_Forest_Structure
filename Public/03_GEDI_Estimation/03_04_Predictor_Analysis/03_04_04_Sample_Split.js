/*******************************************************************************
 * Introduction *
 * 
 *  1) For each selected non-overlapping tile, 
 *     split the randomly collected 1250 samples in each drawing
 *     into the subsets of training and testing.
 * 
 * Last updated: 10/8/2024
 * 
 * Runtime: 26m
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
var wd_Main_1_Str = ENA_mod.wd_FU_Str;

// Property name(s).
var tileID_Name_Str = "Tile_ID";

var columnName_Str = "Split_OneTile";

// Number of drawings.
var drawingNumber_Num = 10;

// Proportion of training samples.
var trainingRatio_Num = 0.8;

// Whether to export the result(s).
var export_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Split samples by tile.
function SplitSamples_ByTile(tileID_Num) {
  
  // Derive a randomization seed.
  var randomSeed_Num = ee.Number(tileID_Num)
    .multiply(drawingID_Num);
  
  // Randomly split samples collected from the corresponding tile.
  var collectedSamples_OneTile_FC = collectedSamples_OneDrawing_FC
    .filter(ee.Filter.eq({
      name: tileID_Name_Str, 
      value: tileID_Num
    }))
    .randomColumn({
      columnName: columnName_Str, 
      seed: randomSeed_Num
    });
  
  var trainingSamples_OneTile_FC = collectedSamples_OneTile_FC.filter(
    ee.Filter.lt(columnName_Str, trainingRatio_Num));
  
  var testingSamples_OneTile_FC = collectedSamples_OneTile_FC.filter(
    ee.Filter.gte(columnName_Str, trainingRatio_Num));
  
  // Assign a category property to each Feature.
  trainingSamples_OneTile_FC = trainingSamples_OneTile_FC
    .map(function Assign_Training(trainingSample_Ftr) {
      
      trainingSample_Ftr = trainingSample_Ftr
        .set({
          Category: 1
        });
      
      return trainingSample_Ftr;
    });
  
  testingSamples_OneTile_FC = testingSamples_OneTile_FC
    .map(function Assign_Testing(testingSample_Ftr) {
      
      testingSample_Ftr = testingSample_Ftr
        .set({
          Category: 0
        });
      
      return testingSample_Ftr;
    });
  
  // Combine the two subsets of samples.
  var combinedSamples_OneTile_FC = trainingSamples_OneTile_FC
    .merge(testingSamples_OneTile_FC);
  
  return combinedSamples_OneTile_FC;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Randomly collected samples of 10 drawings.
var collectedSamples_AllDrawings_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "AllCollectedSamples_10drawings"
);


/*******************************************************************************
 * 1) For each selected non-overlapping tile, 
 *    split the randomly collected 1250 samples in each drawing
 *    into the subsets of training and testing. *
 ******************************************************************************/

// Determine a List of the selected tile IDs.
var tileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str)
  .sort();

// Create an empty List to store the splitted samples of all drawings.
var splittedSamples_AllDrawings_List = ee.List([]);

// Perform the "splitting" operation by drawing.
for (var drawingID_Num = 1; drawingID_Num <= drawingNumber_Num; 
  drawingID_Num ++) {
  
  // Identify the GEDI samples collected in each drawing.
  var collectedSamples_OneDrawing_FC = collectedSamples_AllDrawings_FC
    .filter(ee.Filter.eq({
      name: "Drawing_ID", 
      value: drawingID_Num
    }));
  
  // Sample splitting by tile.
  var splittedSamples_OneDrawing_List = tileIDs_List
    .map(SplitSamples_ByTile);
  
  // Convert the result to a FeatureCollection.
  var splittedSamples_OneDrawing_FC = ee.FeatureCollection(
    splittedSamples_OneDrawing_List
  ).flatten();
  
  // Add the result to the List.
  splittedSamples_AllDrawings_List = splittedSamples_AllDrawings_List
    .add(splittedSamples_OneDrawing_FC);

  if (!export_Bool) {
    
    /****** Check the dataset(s) and object(s). ******/
    
    print(drawingID_Num,
      collectedSamples_OneDrawing_FC.first(),
      collectedSamples_OneDrawing_FC.size() // 37500.
    );
    
    print("splittedSamples_OneDrawing_FC:",
      splittedSamples_OneDrawing_FC.first(),
      splittedSamples_OneDrawing_FC.size() // 37500.
    );
    
    print("Training:",
      splittedSamples_OneDrawing_FC
        .filter(ee.Filter.eq("Category", 1)).size()
    );
    
    print("Testing:",
      splittedSamples_OneDrawing_FC
        .filter(ee.Filter.eq("Category", 0)).size()
    );
  }
}

// Convert the result to a FeatureCollection.
var splittedSamples_AllDrawings_FC = ee.FeatureCollection(
  splittedSamples_AllDrawings_List
).flatten();


/*******************************************************************************
* Results *
******************************************************************************/

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("splittedSamples_AllDrawings_FC:",
    splittedSamples_AllDrawings_FC.first(), // 116 properties.
    splittedSamples_AllDrawings_FC.size() // 375000.
  );
  
} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  var outputName_Str = "SplittedSamples_10drawings";
  
  Export.table.toAsset({
    collection: splittedSamples_AllDrawings_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + outputName_Str
  });
}

