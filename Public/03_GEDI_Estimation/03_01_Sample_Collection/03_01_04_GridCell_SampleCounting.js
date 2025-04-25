/*******************************************************************************
 * Introduction *
 * 
 *  1) Join grid cells with the counted tiles.
 * 
 *  2) Count the vectorized samples within each grid cell.
 * 
 * Last updated: 9/5/2024
 * 
 * Runtime: 3m
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
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_EO_Str;

// Property name(s).
var tileID_Name_Str = "Tile_ID";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Counted tiles.
var countedTiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Counted_Tiles");

// Original grid cells.
var gridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "GridCells_30km");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/*******************************************************************************
 * 1) Join grid cells with the counted tiles. *
 ******************************************************************************/

var matchedName_Str = "Sample_Count";

var saveFirst_Join = ee.Join.saveFirst({
  matchKey: matchedName_Str
});

var IDmatching_Filter = ee.Filter.equals({
  leftField: tileID_Name_Str, 
  rightField: tileID_Name_Str
});

var countedGridCells_FC = saveFirst_Join.apply({
  primary: gridCells_FC, 
  secondary: countedTiles_FC, 
  condition: IDmatching_Filter
});

countedGridCells_FC = countedGridCells_FC.map(
  function Add_Count(countedGridCell_Ftr) {
    
    var sampleCount_Num = ee.Feature(countedGridCell_Ftr
      .get(matchedName_Str))
      .get("Sample_Count");
    
    countedGridCell_Ftr = countedGridCell_Ftr
      .set(matchedName_Str, sampleCount_Num);
    
    return countedGridCell_Ftr;
  }
);


/*******************************************************************************
 * 2) Count the vectorized samples within each grid cell. *
 ******************************************************************************/

// Count samples by grid cell.
var countedTileIDs_List = countedTiles_FC
  .aggregate_array(tileID_Name_Str);

var countedGridCells_List = countedTileIDs_List
  .map(function Count_Samples(tileID_Num) {
    
    // Extract the corresponding grid cell.
    var gridCell_Ftr = countedGridCells_FC.filter(
      ee.Filter.eq({
        name: tileID_Name_Str, 
        value: tileID_Num
      })
    ).first();
    
    var gridCell_Geom = gridCell_Ftr.geometry();
    
    // Count the corresponding samples within the grid cell.
    var sampleSize_Num = vectorizedSamples_FC
      .filter(ee.Filter.eq({
        name: tileID_Name_Str, 
        value: tileID_Num
      }))
      .filterBounds(gridCell_Geom)
      .size();
    
    // Add the sample size to the grid cell.
    gridCell_Ftr = gridCell_Ftr.set({
      GridCell_SampleSize: sampleSize_Num
    });
    
    return gridCell_Ftr;
  });

// Convert the result to a FeatureCollection.
countedGridCells_FC = ee.FeatureCollection(
  countedGridCells_List
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("countedTiles_FC:",
    countedTiles_FC.first(),
    countedTiles_FC.size() // 2101.
  );
  
  print("countedGridCells_FC:",
    countedGridCells_FC.first(),
    countedGridCells_FC.size() // 2101.
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(countedTiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "countedTiles_FC",
    true);

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  var outputName_Str = "Counted_GridCells";
  
  Export.table.toAsset({
    collection: countedGridCells_FC, 
    description: outputName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + "Tiles_60km/"
      + outputName_Str
  });
}

