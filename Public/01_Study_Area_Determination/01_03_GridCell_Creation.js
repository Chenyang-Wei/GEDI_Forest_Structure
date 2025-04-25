/*******************************************************************************
 * Introduction *
 * 
 *  1) Segment the study domain into non-overlapping grid cells.
 * 
 *  2) Randomly add an integer property of "Tile ID" to each grid cell.
 * 
 *  3) Generate a set of small grid cells (1/4 of the original ones)
 *     covering the AOI.
 * 
 * Last updated: 8/14/2024
 * 
 * Runtime: 1m ~ 6m
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

// Grid cell size.
var cellSize_Num = 30e3; // 30 km.

// WGS84 CRS.
var WGS84_crs = "EPSG:4326";

// Major working directories.
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();


/*******************************************************************************
 * 1) Segment the study domain into non-overlapping grid cells. *
 ******************************************************************************/

// Create a set of grid cells covering the study area.
var gridCells_FC = studyArea_Geom.coveringGrid(
  ee.Projection(WGS84_crs).atScale(cellSize_Num)
);


/*******************************************************************************
 * 2) Randomly add an integer property of "Tile ID" to each grid cell. *
 ******************************************************************************/

// Add a random number to each grid cell.
var randomNumber_Name_Str = "Random_Number";

gridCells_FC = gridCells_FC.randomColumn({
  columnName: randomNumber_Name_Str, 
  seed: 17
});

// Derive a sorted List of the random numbers.
var sorted_RandomNumbers_List = gridCells_FC
  .aggregate_array(randomNumber_Name_Str)
  .distinct().sort();

// Create a List of integer IDs.
var tileID_Name_Str = "Tile_ID";

var tileIDs_List = ee.List.sequence({
  start: 1, 
  end: gridCells_FC.size()
});

// Generate a FeatureCollection with both the random numbers
//   and the integer IDs.
var random_TileIDs_List = sorted_RandomNumbers_List
  .zip(tileIDs_List);

var random_TileIDs_FC = ee.FeatureCollection(
  random_TileIDs_List.map(
    function Convert_To_Feature(random_TileID_List) {
      random_TileID_List = ee.List(random_TileID_List);
      
      return ee.Feature(null).set(
        randomNumber_Name_Str, random_TileID_List.get(0),
        tileID_Name_Str, random_TileID_List.get(1)
      );
    }
  )
);

// Assign an integer ID to each grid cell by matching the random numbers.
var randomNumber_Matching_Filter = ee.Filter.equals({
  leftField: randomNumber_Name_Str, 
  rightField: randomNumber_Name_Str
});

gridCells_FC = ee.Join.saveFirst({
  matchKey: "matched"
}).apply({
  primary: gridCells_FC, 
  secondary: random_TileIDs_FC, 
  condition: randomNumber_Matching_Filter
});

gridCells_FC = gridCells_FC.map(
  function Assign_ID(gridCell_Ftr) {
    var tileID_Num = ee.Feature(
      gridCell_Ftr.get("matched")
    ).get(tileID_Name_Str);
    
    return gridCell_Ftr.set(
      tileID_Name_Str, tileID_Num);
  }
).select({
  propertySelectors: [tileID_Name_Str]
});


/*******************************************************************************
 * 3) Generate a set of small grid cells (1/4 of the original ones)
 *    covering the AOI. *
 ******************************************************************************/

// Determine the size of small grid cells.
var small_CellSize_Num = cellSize_Num / 2;

// Create a set of small grid cells.
var small_GridCells_FC = AOI_Geom.coveringGrid(
  ee.Projection(WGS84_crs).atScale(small_CellSize_Num)
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  print("small_CellSize_Num:", small_CellSize_Num);
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(studyArea_Geom, 6);
  
  Map.addLayer(studyArea_Geom, 
    {
      color: "00FF00"
    }, 
    "studyArea_Geom");

} else {
  
  // Output to Asset.
  var gridCells_FileName_Str = "GridCells_30km";
  
  var small_GridCells_FileName_Str = "GridCells_15km";
  
  Export.table.toAsset({
    collection: gridCells_FC, 
    description: gridCells_FileName_Str, 
    assetId: wd_Main_Str
      + "Study_Domain/"
      + gridCells_FileName_Str
  });
  
  Export.table.toAsset({
    collection: small_GridCells_FC, 
    description: small_GridCells_FileName_Str, 
    assetId: wd_Main_Str
      + "Study_Domain/"
      + small_GridCells_FileName_Str
  });
}

