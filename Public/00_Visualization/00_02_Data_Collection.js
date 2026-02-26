/*******************************************************************************
 * Introduction *
 * 
 *  1) For the response variable of "FHD", 
 *     train and test Random Forest models by tile.
 * 
 * Last updated: 9/29/2024
 * 
 * Runtime: <= 3h
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

var VIS_mod = require(
  "users/ChenyangWei/Public:Modules/General/Visualization.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_LiDAR_Str;

var wd_S2_Str = wd_Main_2_Str
  + "Environmental_Data/"
  + "Sentinel-2_Variables/";

var wd_Main_3_Str = ENA_mod.wd_EO_Str;

var wd_Main_4_Str = ENA_mod.wd_Birds_Str;

var wd_Main_5_Str = ENA_mod.wd_GEE_Str;

var wd_Main_6_Str = ENA_mod.wd_FU_Str;


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/StudyArea_SelectedBCRs");

/****** Tiles and samples. ******/

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_3_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/****** Environmental predictors. ******/

// HLSL30 predictors.
var HLSL30_SR_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "HLSL30_MedianSR"
);

var HLSL30_Vars_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "HLSL30_Variables"
);

// Sentinel-2 predictors.
var S2_SR_B2_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B2"
).select(["B2"], ["SR_B2"]);

var S2_SR_B3_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B3"
).select(["B3"], ["SR_B3"]);

var S2_SR_B4_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B4"
).select(["B4"], ["SR_B4"]);

var S2_SR_B8_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B8"
).select(["B8"], ["SR_B8"]);

var S2_SR_20m_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_20mBands"
).select(
  ["B5", "B6", "B7", "B8A", "B11", "B12"],
  ["S2_B5", "S2_B6", "S2_B7", "S2_B8A", "S2_B11", "S2_B12"]
);

var S2_Vars_Img = ee.Image(wd_S2_Str
  + "S2_Variables"
).select(
  ["NDVI", "kNDVI", "NIRv", "EVI", "NDWI",
   "mNDWI", "NBR", "BSI", "SI", "BU",
   "Brightness", "Greenness", "Wetness"],
  ["S2_NDVI", "S2_kNDVI", "S2_NIRv", "S2_EVI", "S2_NDWI",
   "S2_mNDWI", "S2_NBR", "S2_BSI", "S2_SI", "S2_BU",
   "S2_Brightness", "S2_Greenness", "S2_Wetness"]
);

// Sentinel-1 variables.
var S1_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "S1_Variables"
);

// Topographic features.
var ALOS_Topo_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "ALOS_TopographicFeatures"
);

var resampled_Topo_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "ALOS_ResampledVariables"
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

// Leaf traits.
var SLA_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "SLA"
);

var LNC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LNC"
);

var LPC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LPC"
);

var LDMC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "LDMC"
);

// Soil properties.
var soilProperties_1_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "0-5cm"
);

var soilProperties_2_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "5-15cm"
);

var soilProperties_3_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "Properties_"
  + "15-30cm"
);

var soilProperties_4_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "OCS_0-30cm"
);

print(ALOS_Topo_Img)

/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to visualize the result(s).
var display_Bool = true; // true OR false.

if (display_Bool) {
  
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
    0.3);
  
  Map.addLayer(selectedTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "selectedTiles_FC",
    true);
  
  Map.addLayer(selectedGridCells_FC, 
    {
      color: "0000FF"
    }, 
    "selectedGridCells_FC",
    true);
  
  Map.addLayer(studyArea_FC, 
    {
      color: "FFFFFF"
    }, 
    "studyArea_FC",
    true,
    0.7);

  Map.addLayer(vectorizedSamples_FC, 
    {
      color: "FFFFFF"
    }, 
    "vectorizedSamples_FC",
    false);

  Map.addLayer(S2_Vars_Img.select("S2_kNDVI"), // mm2/mg.
    VIS_mod.NDVIvis_Dict, 
    "S2_kNDVI", true);

  Map.addLayer(S1_Img.select("NDRI"), // mm2/mg.
    {
      min: 0.1,
      max: 0.4,
      palette: PAL_mod.matplotlib.magma[7]
    }, 
    "NDRI");

  Map.addLayer(ALOS_Topo_Img.select("Slope"), // mm2/mg.
    {
      min: 0,
      max: 30,
      palette: PAL_mod.matplotlib.plasma[7]
    }, 
    "Slope");

  Map.addLayer(SLA_Img, // mm2/mg.
    {
      min: 7, 
      max: 20, 
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "SLA", true);

  Map.addLayer(LNC_Img, // mg/g.
    {
      min: 10, 
      max: 21, 
      palette: PAL_mod.matplotlib.magma[7]
    }, 
    "LNC", true);

  Map.addLayer(LPC_Img, // mg/g.
    {
      min: 1.2, 
      max: 1.8, 
      palette: PAL_mod.matplotlib.plasma[7]
    }, 
    "LPC", true);

  Map.addLayer(LDMC_Img, // g/g.
    {
      min: 0.28, 
      max: 0.38, 
      palette: PAL_mod.matplotlib.inferno[7]
    }, 
    "LDMC", true);
  
}

