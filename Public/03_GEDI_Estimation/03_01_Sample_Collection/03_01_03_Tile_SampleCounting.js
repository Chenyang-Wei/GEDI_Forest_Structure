/*******************************************************************************
 * Introduction *
 * 
 *  1) Count the vectorized samples within each 60-km tile.
 * 
 * Last updated: 8/21/2024
 * 
 * Runtime: 5m
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var PAL_mod = require(
  "users/gena/packages:palettes");

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");

var IMG_mod = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

var wd_Main_2_Str = ENA_mod.wd_OSU_Str;

// Property names.
var tileID_Name_Str = "Tile_ID";

var sampleID_Name_Str = "Sample_ID";

var counted_Name_Str = "Sample_Count";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);

// Overlapping tiles.
var tiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "Study_Domain/"
  + "Tiles_60km");


/*******************************************************************************
 * 1) Count the vectorized samples within each 60-km tile. *
 ******************************************************************************/

// Count the vectorized samples.
var sampleCounts_List = vectorizedSamples_FC.reduceColumns({
  reducer: ee.Reducer.count()
    .group({
      groupField: 0,
      groupName: tileID_Name_Str
    }),
  selectors: [tileID_Name_Str, sampleID_Name_Str]
}).get("groups");

var sampleCounts_FC = ee.FeatureCollection(
  ee.List(sampleCounts_List).map(
    function(sampleCount_Dict) {
      return ee.Feature(null).set(sampleCount_Dict);
    }
  )
);

// Add each sample count to the corresponding tile.
var saveFirst_Join = ee.Join.saveFirst({
  matchKey: counted_Name_Str
});

var tileIDmatching_Filter = ee.Filter.equals({
  leftField: tileID_Name_Str, 
  rightField: tileID_Name_Str
});

var countedTiles_FC = saveFirst_Join.apply({
  primary: tiles_FC, 
  secondary: sampleCounts_FC, 
  condition: tileIDmatching_Filter
});

countedTiles_FC = countedTiles_FC.map(
  function Add_SampleCount(countedTile_Ftr) {
    
    var sampleCount_Num = ee.Feature(countedTile_Ftr
      .get(counted_Name_Str))
      .get("count");
    
    countedTile_Ftr = countedTile_Ftr.set(
      counted_Name_Str, sampleCount_Num);
    
    return countedTile_Ftr;
  }
);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("vectorizedSamples_FC:",
    vectorizedSamples_FC.first(),
    vectorizedSamples_FC.size()); // 26464326.
  
  print("sampleCounts_FC:",
    sampleCounts_FC.first(),
    sampleCounts_FC.size()); // 2101.
  
} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  var fileName_Str = "Counted_Tiles";
  
  Export.table.toAsset({
    collection: countedTiles_FC, 
    description: fileName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Tiles_60km/"
      + fileName_Str
  });
}

