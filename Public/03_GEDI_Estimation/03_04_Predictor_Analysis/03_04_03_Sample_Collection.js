/*******************************************************************************
 * Introduction *
 * 
 *  1) Randomly draw 10 sets of 1250 GEDI samples with no replacement
 *     from each selected non-overlapping tile.
 * 
 * Last updated: 10/8/2024
 * 
 * Runtime: 19m
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

var wd_Main_2_Str = ENA_mod.wd_FU_Str;

// Property name(s).
var tileID_Name_Str = "Tile_ID";

var matchedName_Str = "Drawing_ID";

// Join(s).
var saveFirst_Join = ee.Join.saveFirst({
  matchKey: matchedName_Str
});

// Filter(s).
var sampleID_Matching_Filter = ee.Filter.equals({
  leftField: "Sample_ID", 
  rightField: "Sample_ID"
});

// Number of samples in each drawing.
//   (Same as the tile observation count threshold.)
var eachDrawingCount_Num = 1250;

// Number of drawings.
var drawingNumber_Num = 10;

// Number of samples to collect from each tile.
var totalCount_Num = eachDrawingCount_Num * drawingNumber_Num;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Repeat each drawing ID 10 times.
function Repeat_IDs(drawingID_Num) {
  
  var repeatedIDs_List = ee.List.repeat({
    value: drawingID_Num, 
    count: eachDrawingCount_Num
  });
  
  return repeatedIDs_List;
}

// Randomly collect 10 sets of 1250 GEDI samples with no replacement
//   by tile.
function Collect_Samples(tileID_Num) {
  
  // Identify samples belonging to each selected tile.
  var identifiedSamples_OneTile_FC = vectorizedSamples_FC
    .filter(ee.Filter.eq({
      name: tileID_Name_Str, 
      value: tileID_Num
    }));
  
  // Randomly collect 12500 identified samples.
  var collectedSamples_OneTile_FC = identifiedSamples_OneTile_FC
    .sort("Sample_ID")
    .limit(totalCount_Num);
  
  // Derive a sorted ID List of the collected samples.
  var sampleIDs_List = collectedSamples_OneTile_FC
    .aggregate_array("Sample_ID")
    .sort();
  
  // Generate a FeatureCollection with both the sample IDs
  //   and the drawing IDs.
  var sampleIDs_DrawingIDs_List = sampleIDs_List
    .zip(drawingIDs_List);
  
  var sampleIDs_DrawingIDs_FC = ee.FeatureCollection(
    sampleIDs_DrawingIDs_List.map(
      function Convert_To_Feature(sampleID_DrawingID_List) {
        sampleID_DrawingID_List = ee.List(sampleID_DrawingID_List);
        
        return ee.Feature(null).set({
          Sample_ID: sampleID_DrawingID_List.get(0),
          Drawing_ID: sampleID_DrawingID_List.get(1)
        });
      }
    )
  );
  
  // Assign a drawing ID to each sample by matching the sample IDs.
  collectedSamples_OneTile_FC = saveFirst_Join.apply({
    primary: collectedSamples_OneTile_FC, 
    secondary: sampleIDs_DrawingIDs_FC, 
    condition: sampleID_Matching_Filter
  });
  
  collectedSamples_OneTile_FC = collectedSamples_OneTile_FC.map(
    function Assign_DrawingID(collectedSample_Ftr) {
      var drawingID_Num = ee.Feature(
        collectedSample_Ftr.get(matchedName_Str)
      ).get("Drawing_ID");
      
      return collectedSample_Ftr.set({
        Drawing_ID: drawingID_Num
      });
    }
  );

  return collectedSamples_OneTile_FC;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);

// Selected non-overlapping tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");


/*******************************************************************************
 * 1) Randomly draw 10 sets of 1250 GEDI samples with no replacement
 *    from each selected non-overlapping tile. *
 ******************************************************************************/

// Derive a List of repeated drawing IDs.
var drawingIDs_List = ee.List.sequence({
  start: 1, 
  end: drawingNumber_Num, 
  step: 1
});

drawingIDs_List = drawingIDs_List
  .map(Repeat_IDs)
  .flatten();

// Identify samples belonging to the selected tiles.
var selectedTileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str);

vectorizedSamples_FC = vectorizedSamples_FC.filter(
  ee.Filter.inList({
    leftField: tileID_Name_Str, 
    rightValue: selectedTileIDs_List
  })
);

// Randomly collect 10 sets of 1250 GEDI samples with no replacement
//   from each selected tile.
var collectedSamples_AllTiles_List = selectedTileIDs_List
  .map(Collect_Samples);

// Convert the result to a FeatureCollection.
var collectedSamples_AllTiles_FC = ee.FeatureCollection(
  collectedSamples_AllTiles_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size(), // 30.
    selectedTiles_FC.aggregate_min("Sample_Count") // 14389.
  );
  
  print("vectorizedSamples_FC:",
    vectorizedSamples_FC.first()
  );
  
  print("totalCount_Num:",
    totalCount_Num,
    "drawingIDs_List:",
    drawingIDs_List.size());
  
  print("collectedSamples_AllTiles_FC:",
    collectedSamples_AllTiles_FC.first(),
    collectedSamples_AllTiles_FC.size() // 375000.
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 6);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "0000FF"
    }, 
    "selectedTiles_FC",
    true);

  Map.addLayer(vectorizedSamples_FC, 
    {
      color: "FFFFFF"
    }, 
    "vectorizedSamples_FC",
    false);

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  var outputName_Str = "AllCollectedSamples_"
    + drawingNumber_Num
    + "drawings";
  
  Export.table.toAsset({
    collection: collectedSamples_AllTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Predictor_Comparison/"
      + outputName_Str
  });
}

