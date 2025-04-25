/*******************************************************************************
 * Introduction *
 * 
 *  1) Filter the counted grid cells to select those 
 *     with adequate samples in the corresponding tiles
 *     and some of them are covered by the grid cell.
 * 
 *  2) Join tiles with the selected grid cells.
 * 
 * Last updated: 9/5/2024
 * 
 * Runtime: 1m.
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


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Counted grid cells.
var countedGridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Counted_GridCells");

// Counted tiles.
var countedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Counted_Tiles");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/*******************************************************************************
 * 1) Filter the counted grid cells to select those 
*     with adequate samples in the corresponding tiles
*     and some of them are covered by the grid cell. *
 ******************************************************************************/

// Calculate the ratio between the grid-cell-covered samples and 
//   the tile-contained samples.
countedGridCells_FC = countedGridCells_FC.map(
  function Compute_Ratio(countedGridCell_Ftr) {
    
    var tileCount_Num = countedGridCell_Ftr
      .get("Sample_Count");
    
    var gridCellCount_Num = countedGridCell_Ftr
      .get("GridCell_SampleSize");
    
    var sampleCountRatio_Num = ee.Number(gridCellCount_Num)
      .divide(tileCount_Num);
    
    countedGridCell_Ftr = countedGridCell_Ftr.set({
      SampleCount_Ratio: sampleCountRatio_Num
    });
    
    return countedGridCell_Ftr;
  }
);

var selectedGridCells_FC = countedGridCells_FC.filter(
  ee.Filter.and(
    ee.Filter.gte({
      name: "Sample_Count", 
      value: 1250
    }),
    ee.Filter.gte({
      name: "SampleCount_Ratio", 
      value: 0.1
    })
  )
);


/*******************************************************************************
 * 2) Join tiles with the selected grid cells. *
 ******************************************************************************/

var tileID_Name_Str = "Tile_ID";

var matchedName_Str = "GridCell_SampleSize";

var saveFirst_Join = ee.Join.saveFirst({
  matchKey: matchedName_Str
});

var IDmatching_Filter = ee.Filter.equals({
  leftField: tileID_Name_Str, 
  rightField: tileID_Name_Str
});

var selectedTiles_FC = saveFirst_Join.apply({
  primary: countedTiles_FC, 
  secondary: selectedGridCells_FC, 
  condition: IDmatching_Filter
});

selectedTiles_FC = selectedTiles_FC.map(
  function Add_SampleSize(selectedTile_Ftr) {
    
    var matchedGridCell_Ftr = ee.Feature(selectedTile_Ftr
      .get(matchedName_Str));
    
    var sampleSize_Num = matchedGridCell_Ftr
      .get(matchedName_Str);
    
    var countRatio_Num = matchedGridCell_Ftr
      .get("SampleCount_Ratio");
    
    selectedTile_Ftr = selectedTile_Ftr
      .set(
        matchedName_Str, sampleSize_Num,
        "SampleCount_Ratio", countRatio_Num
      );
    
    return selectedTile_Ftr;
  }
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size() // 1693.
  );
  
  print("selectedGridCells_FC:",
    selectedGridCells_FC.first(),
    selectedGridCells_FC.size() // 1693.
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 6);
  
  Map.addLayer(countedGridCells_FC, 
    {
      color: "0000FF"
    }, 
    "countedGridCells_FC",
    true);

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
  var outputName_Str = "Selected_Tiles";
  
  Export.table.toAsset({
    collection: selectedTiles_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Tiles_60km/"
      + outputName_Str
  });
  
  var outputName_Str = "Selected_GridCells";
  
  Export.table.toAsset({
    collection: selectedGridCells_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Tiles_60km/"
      + outputName_Str
  });
}

