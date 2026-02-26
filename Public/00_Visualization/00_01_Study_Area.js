/*******************************************************************************
 * Introduction *
 * 
 *  1) Visualize datasets.
 * 
 *  2) Check the U.S. states and Canadian provinces intersected with 
 *     the study domain.
 * 
 * Last updated: 11/5/2024
 * 
 * Runtime: N/A
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_EO_Str;

var wd_Main_3_Str = ENA_mod.wd_FU_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Predictor analysis tiles.
var predictorAnalysisTiles_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Predictor_Comparison/"
  + "NonOverlapping_Tiles");

// Grid cells (30 km).
var gridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "GridCells_30km");

// Tiles (60 km).
var tiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/"
  + "Tiles_60km");

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/StudyArea_SelectedBCRs");

// Topographic features.
var ALOS_Topo_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "ALOS_TopographicFeatures"
);

// Leaf traits.
var SLA_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "SLA"
);

var LNC_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LNC"
);

var LPC_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LPC"
);

var LDMC_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LDMC"
);

// Soil properties.
var soilProperties_1_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "0-5cm"
);

var soilProperties_2_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "5-15cm"
);

var soilProperties_3_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "15-30cm"
);

var soilProperties_4_Img = ee.Image(wd_Main_2_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "OCS_0-30cm"
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

// U.S. states and Canadian provinces.
var states_Provinces_FC = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1");


/*******************************************************************************
 * Operations *
 ******************************************************************************/

// Combine all the leaf traits.
var leafTraits_Img = ee.Image.cat(
  SLA_Img,
  LNC_Img,
  LPC_Img,
  LDMC_Img
);

// Combine all the soil properties.
var soilProperties_Img = ee.Image.cat(
  soilProperties_1_Img,
  soilProperties_2_Img,
  soilProperties_3_Img,
  soilProperties_4_Img
);

// Generate non-water masks.
var nonWaterMask_ESRI_Img = LC_ESRI_Img
  .neq(1)
  .selfMask();

var nonWaterMask_GLC_Img = LC_GLC_Img
  .neq(210)
  .selfMask();

var tileIDs_List = tiles_FC.aggregate_array("Tile_ID");

var selectedTileIDs_List = selectedTiles_FC.aggregate_array("Tile_ID");

var unselectedTileIDs_List = tileIDs_List
  .removeAll(selectedTileIDs_List);

var unselectedTiles_FC = tiles_FC.filter(
  ee.Filter.inList({
    leftField: "Tile_ID", 
    rightValue: unselectedTileIDs_List
  })
);

// Extract the states intersected with the study area.
states_Provinces_FC = states_Provinces_FC.filterBounds(studyArea_FC);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to visualize the result(s).
var display_Bool = true; // true OR false.

if (display_Bool) {
  
  print("gridCells_FC:",
    gridCells_FC.first(),
    gridCells_FC.size()); // 2108.
  
  print("tiles_FC:",
    tiles_FC.first(),
    tiles_FC.size()); // 2108.
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size()); // 1693.
  
  print("states_Provinces_FC:",
    states_Provinces_FC.first(),
    states_Provinces_FC.aggregate_array("shapeName").sort(),
    states_Provinces_FC.size());
  
  IMG_mod.Print_ImgInfo(
    "leafTraits_Img:",
    leafTraits_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "soilProperties_Img:",
    soilProperties_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  
  // Map.centerObject(AOI_Geom, 8);
  // Map.setCenter(-85.1405, 33.4444, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "000000"
    }, 
    "AOI_Geom",
    true,
    1);
  
  Map.addLayer(tiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "tiles_FC",
    true);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "selectedTiles_FC",
    true,
    0.5);
  
  Map.addLayer(unselectedTiles_FC, 
    {
      color: "FF0000"
    }, 
    "unselectedTiles_FC",
    true);
  
  Map.addLayer(selectedGridCells_FC, 
    {
      color: "FFFFFF"
    }, 
    "selectedGridCells_FC",
    true);
  
  Map.addLayer(studyArea_FC, 
    {
      color: "228B22"
    }, 
    "studyArea_FC",
    true,
    0.5);

  Map.addLayer(states_Provinces_FC, 
    {
      color: "0000FF"
    }, 
    "states_Provinces_FC",
    true,
    0.5);


  Map.addLayer(predictorAnalysisTiles_FC, 
    {
      color: "FFFFFF"
    }, 
    "predictorAnalysisTiles_FC",
    true,
    1);
  

  Map.addLayer(vectorizedSamples_FC, 
    {
      color: "FFFFFF"
    }, 
    "vectorizedSamples_FC",
    false);

  Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 2019)), 
    {
      color: "228B22"
    }, 
    "Tile: " + 2019);
  
  Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 2025)), 
    {
      color: "228B22"
    }, 
    "Tile: " + 2025);
  
  Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 2029)), 
    {
      color: "228B22"
    }, 
    "Tile: " + 2029);
  
  Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 2031)), 
    {
      color: "228B22"
    }, 
    "Tile: " + 2031);
  
  Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 2037)), 
    {
      color: "228B22"
    }, 
    "Tile: " + 2037);
  
  // Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 1064)), 
  //   {
  //     color: "00FF00"
  //   }, 
  //   "Tile: " + 1064);
  
  // Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 746)), 
  //   {
  //     color: "0000FF"
  //   }, 
  //   "Tile: " + 746);
  
  // Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 991)), 
  //   {
  //     color: "FF0000"
  //   }, 
  //   "Tile: " + 991);
  
  // Map.addLayer(tiles_FC.filter(ee.Filter.eq("Tile_ID", 1143)), 
  //   {
  //     color: "00FFFF"
  //   }, 
  //   "Tile: " + 1143);
  
  // Map.addLayer(leafTraits_Img.select("SLA"), // mm2/mg.
  //   {
  //     min: 7, 
  //     max: 20, 
  //     palette: PAL_mod.matplotlib.viridis[7]
  //   }, 
  //   "SLA", true);

  // Map.addLayer(leafTraits_Img.select("LNC"), // mg/g.
  //   {
  //     min: 10, 
  //     max: 21, 
  //     palette: PAL_mod.matplotlib.magma[7]
  //   }, 
  //   "LNC", true);

  // Map.addLayer(leafTraits_Img.select("LPC"), // mg/g.
  //   {
  //     min: 1.2, 
  //     max: 1.8, 
  //     palette: PAL_mod.matplotlib.plasma[7]
  //   }, 
  //   "LPC", true);

  // Map.addLayer(leafTraits_Img.select("LDMC"), // g/g.
  //   {
  //     min: 0.28, 
  //     max: 0.38, 
  //     palette: PAL_mod.matplotlib.inferno[7]
  //   }, 
  //   "LDMC", true);
  
  // var ocdVis_Dict = {
  //   min: 150, 
  //   max: 800, 
  //   palette: PAL_mod.matplotlib.viridis[7]
  // };
  
  // Map.addLayer(soilProperties_Img.select("ocd_0-5cm_mean"), // dg/dm3.
  //   ocdVis_Dict, 
  //   "ocd_0-5cm_mean", true);

  // Map.addLayer(soilProperties_Img.select("ocd_5-15cm_mean"), 
  //   ocdVis_Dict, 
  //   "ocd_5-15cm_mean", true);

  // Map.addLayer(soilProperties_Img.select("ocd_15-30cm_mean"), 
  //   ocdVis_Dict, 
  //   "ocd_15-30cm_mean", true);

  // Map.addLayer(soilProperties_Img.select("ocs_0-30cm_mean"), // t/ha.
  //   {
  //     min: 30, 
  //     max: 120, 
  //     palette: PAL_mod.matplotlib.magma[7]
  //   }, 
  //   "ocs_0-30cm_mean", true);

  // Map.addLayer(nonWaterMask_GLC_Img,
  //   {
  //     palette: "FF0000"
  //   }, 
  //   "nonWaterMask_GLC_Img", true);

  // Map.addLayer(nonWaterMask_ESRI_Img,
  //   {
  //     palette: "0000FF"
  //   }, 
  //   "nonWaterMask_ESRI_Img", true);

  // Map.addLayer(nonWaterMask_ESRI_Img
  //   .and(nonWaterMask_GLC_Img),
  //   {
  //     palette: "FFFFFF"
  //   }, 
  //   "nonWaterMask", false);

}

