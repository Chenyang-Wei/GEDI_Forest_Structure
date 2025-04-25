/*******************************************************************************
 * Introduction *
 * 
 *  1) Vectorize the sampled variables by tile.
 * 
 * Last updated: 8/19/2024
 * 
 * Runtime: 20h (Obs. #: 26,464,326)
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
var prj_25m = {
  crs: "EPSG:4326",
  scale: 25
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_EO_Str;

// Band name of the pixel "label".
var labelName_Str = "Pixel_Label";

// Property name of the tile ID.
var tileID_Name_Str = "Tile_ID";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Vectorize samples by tile.
function Vectorize_Samples_ByTile(tileID_Num) {
  
  // Extract a single tile.
  var tile_Geom = allTiles_FC.filter(ee.Filter.eq({
    name: tileID_Name_Str, 
    value: tileID_Num
  })).first().geometry();
  
  // Vectorize samples in the tile.
  var vectorizedSamples_OneTile_FC = sampledVariables_Img
    .reduceToVectors({
      reducer: ee.Reducer.first(), 
      geometry: tile_Geom, 
      scale: prj_25m.scale, 
      geometryType: "centroid", 
      eightConnected: false, 
      labelProperty: labelName_Str, 
      crs: prj_25m.crs, 
      maxPixels: 1e13
    });
  
  // Add the tile ID to each vectorized sample.
  vectorizedSamples_OneTile_FC = vectorizedSamples_OneTile_FC
    .map(function Add_TileID(vectorizedSample_Ftr) {
      vectorizedSample_Ftr = vectorizedSample_Ftr
        .set(
          tileID_Name_Str, tileID_Num
        );
        
      return vectorizedSample_Ftr;
    });
  
  return vectorizedSamples_OneTile_FC;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Sampled variables.
var sampledVariables_Img = ee.Image(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "SampledVariables_NonWater");

// Overlapping tiles.
var allTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "Tiles_60km");


/*******************************************************************************
 * 1) Vectorize the sampled variables by tile. *
 ******************************************************************************/

// Perform the vectorization by tile.
var tileIDs_List = allTiles_FC.aggregate_array(tileID_Name_Str)
  .distinct();

var vectorizedSamples_AllTiles_List = tileIDs_List
  .map(Vectorize_Samples_ByTile);

// Convert the result to a FeatureCollection.
var vectorizedSamples_AllTiles_FC = ee.FeatureCollection(
  vectorizedSamples_AllTiles_List
).flatten();

// Add a random column of "sample ID".
vectorizedSamples_AllTiles_FC = vectorizedSamples_AllTiles_FC
  .randomColumn({
    columnName: "Sample_ID", 
    seed: 17
  });


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "sampledVariables_Img:",
    sampledVariables_Img // 111 bands.
  );
  
  print("sampledVariables_Img:",
    sampledVariables_Img.bandNames());
    // First band: "Pixel_Label".
  
  print("Number of the tiles:",
    allTiles_FC.size(),
    tileIDs_List.size());
    // 2108.

  print("vectorizedSamples_AllTiles_FC:",
    vectorizedSamples_AllTiles_FC.first());
    // 113 properties.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-80.2534, 39.4796, 16);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(sampledVariables_Img.select("rh98"), 
    {
      min: 1,
      max: 30,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "rh98");

  Map.addLayer(sampledVariables_Img.select("pai"), 
    {
      min: 0,
      max: 3,
      palette: PAL_mod.matplotlib.plasma[7]
    }, 
    "pai");

  Map.addLayer(allTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "allTiles_FC");

} else {
  
  // Output to Asset.
  var fileName_Str = "VectorizedSamples_NonWater";
  
  Export.table.toAsset({
    collection: vectorizedSamples_AllTiles_FC, 
    description: fileName_Str, 
    assetId: wd_Main_2_Str
      + "GEDI_Estimation/"
      + fileName_Str
  });
}

