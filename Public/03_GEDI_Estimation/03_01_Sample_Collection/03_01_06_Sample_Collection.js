/*******************************************************************************
 * Introduction *
 * 
 *  1) Randomly collect a given number of the vectorized samples
 *     for each selected tile and the corresponding grid cell.
 * 
 * Last updated: 9/5/2024
 * 
 * Runtime: 1h.
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

// Threshold for the number of samples to collect from each grid cell.
var sampleCount_Thres_Num = 10; // Average tile sample size: 14581.6.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/*******************************************************************************
 * 1) Randomly collect a given number of the vectorized samples
 *    for each selected tile and the corresponding grid cell. *
 ******************************************************************************/

var tileID_Name_Str = "Tile_ID";

// Identify samples belonging to the selected tiles.
var selectedTileIDs_List = selectedTiles_FC
  .aggregate_array(tileID_Name_Str);

vectorizedSamples_FC = vectorizedSamples_FC.filter(
  ee.Filter.inList({
    leftField: tileID_Name_Str, 
    rightValue: selectedTileIDs_List
  })
);

// Derive a few statistics of the sample counts.
var sampleCountStats_Dict = selectedTiles_FC.reduceColumns({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.median(), 
    sharedInputs: true
  }).combine({
    reducer2: ee.Reducer.minMax(), 
    sharedInputs: true
  }), 
  selectors: ["Sample_Count"]
});

// Collect the vectorized samples by tile and grid cell.
var collectedSamples_AllCells_List = selectedTileIDs_List
  .map(function Collect_Samples(tileID_Num) {
    
    // Extract the corresponding grid cell.
    var gridCell_Geom = selectedGridCells_FC.filter(
      ee.Filter.eq({
        name: tileID_Name_Str, 
        value: tileID_Num
      })
    ).first().geometry();
    
    // Identify samples belonging to the tile and 
    //   covered by the grid cell.
    var identifiedSamples_OneCell_FC = vectorizedSamples_FC
      .filter(ee.Filter.eq({
        name: tileID_Name_Str, 
        value: tileID_Num
      }))
      .filterBounds(gridCell_Geom);
    
    // Randomly collect a given number of the identified samples.
    var collectedSamples_OneCell_FC = identifiedSamples_OneCell_FC
      .sort("Sample_ID")
      .limit(sampleCount_Thres_Num);
    
    return collectedSamples_OneCell_FC;
  });

// Convert the result to a FeatureCollection.
var collectedSamples_AllCells_FC = ee.FeatureCollection(
  collectedSamples_AllCells_List
).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedTiles_FC:",
    selectedTiles_FC.sort("SampleCount_Ratio").first(),
    selectedTiles_FC.size() // 1693.
  );
  
  print("selectedGridCells_FC:",
    selectedGridCells_FC.sort("GridCell_SampleSize").first(),
    selectedGridCells_FC.size() // 1693.
  );
  
  print("vectorizedSamples_FC:",
    vectorizedSamples_FC.first()
  );
  
  print("sampleCountStats_Dict:",
    sampleCountStats_Dict
    // mean: 14581.6, median: 12660.7, 
    //   min: 1259, max: 61889.
  );
  
  print("collectedSamples_AllCells_FC:",
    collectedSamples_AllCells_FC.first()
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 6);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "selectedTiles_FC",
    true);

  Map.addLayer(selectedGridCells_FC, 
    {
      color: "FF0000"
    }, 
    "selectedGridCells_FC",
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
  var outputName_Str = "CollectedSamples_"
    + sampleCount_Thres_Num
    + "perCell";
  
  Export.table.toAsset({
    collection: collectedSamples_AllCells_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}

