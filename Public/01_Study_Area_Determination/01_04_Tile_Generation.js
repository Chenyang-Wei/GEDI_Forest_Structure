/*******************************************************************************
 * Introduction *
 * 
 *  1) Create 60-km overlapping tiles by merging the 15-km grid cells.
 * 
 * Last updated: 8/14/2024
 * 
 * Runtime: 1m
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
var wd_Main_OSU_Str = ENA_mod.wd_Main_OSU_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// 30-km grid cells.
var gridCells_30km_FC = ee.FeatureCollection(
  wd_Main_OSU_Str
  + "Study_Domain/"
  + "GridCells_30km");

// 15-km grid cells.
var gridCells_15km_FC = ee.FeatureCollection(
  wd_Main_OSU_Str
  + "Study_Domain/"
  + "GridCells_15km");


/*******************************************************************************
 * 1) Create overlapping tiles by merging the small grid cells. *
 ******************************************************************************/

// Join each 30-km grid cell with its intersected 15-km grid cells.
var joined_PropertyName_Str = "Intersected";

var intersect_Filter = ee.Filter.intersects({
  leftField: ".geo", 
  rightField: ".geo"
});

var saveAll_Join = ee.Join.saveAll({
  matchesKey: joined_PropertyName_Str
});

var joined_GridCells_FC = saveAll_Join.apply({
  primary: gridCells_30km_FC, 
  secondary: gridCells_15km_FC, 
  condition: intersect_Filter
});

// Merge the joined 15-km grid cells of each 30-km grid cell.
var tileID_Name_Str = "Tile_ID";

var tiles_60km_FC = joined_GridCells_FC.map(
  function Merge_GridCells(joined_GridCells_Ftr) {
    var tileID_Num = joined_GridCells_Ftr.get(tileID_Name_Str);
    
    var intersected_GridCells_List = ee.List(
      joined_GridCells_Ftr.get(joined_PropertyName_Str)
    );
    
    var merged_GridCells_Ftr = ee.FeatureCollection(
      intersected_GridCells_List
    ).union().first();
    
    return merged_GridCells_Ftr.set(
      tileID_Name_Str, tileID_Num
    );
  }
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("tiles_60km_FC:",
    tiles_60km_FC.first(),
    tiles_60km_FC.size()); // 2108.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(gridCells_15km_FC, 
    {
      color: "FF0000"
    }, 
    "gridCells_15km_FC");

  Map.addLayer(gridCells_30km_FC, 
    {
      color: "00FFFF"
    }, 
    "gridCells_30km_FC");

} else {
  
  /****** Export the result(s). ******/
  
  var tiles_FileName_Str = "Tiles_60km";
  
  Export.table.toAsset({
    collection: tiles_60km_FC, 
    description: tiles_FileName_Str, 
    assetId: wd_Main_OSU_Str
      + "Study_Domain/"
      + tiles_FileName_Str
  });
}

