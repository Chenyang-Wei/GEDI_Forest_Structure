/*******************************************************************************
 * Introduction *
 * 
 *  1) Collect the discrete (categorical) and continuous
 *     environmental predictors, respectively.
 * 
 *  2) Calculate GEDI relative height differences.
 * 
 *  3) Sample the environmental predictors and GEDI variables.
 * 
 *  4) Add a "pixel label" band to the Image of 
 *     the sampled variables.
 * 
 * Last updated: 8/19/2024
 * 
 * Runtime: 2h
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

var VIS = require(
  "users/ChenyangWei/Public:Modules/General/Visualization.js");

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

var wd_Main_2_Str = ENA_mod.wd_LiDAR_Str;

var wd_S2_Str = wd_Main_2_Str
  + "Environmental_Data/"
  + "Sentinel-2_Variables/";

var wd_Main_3_Str = ENA_mod.wd_EO_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// GEDI Level-2A & 2B variables.
var GEDI_L2A_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "L2A_MedianVariables"
);

var GEDI_L2B_Img = ee.Image(wd_Main_1_Str
  + "Environmental_Data/"
  + "L2B_MedianVariables"
);

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


/*******************************************************************************
 * 1) Collect the discrete (categorical) and continuous
 *    environmental predictors, respectively. *
 ******************************************************************************/

// Stack the environmental predictors.
var predictors_Img = ee.Image.cat(
  HLSL30_SR_Img,
  HLSL30_Vars_Img,
  S2_SR_B2_Img,
  S2_SR_B3_Img,
  S2_SR_B4_Img,
  S2_SR_B8_Img,
  S2_SR_20m_Img,
  S2_Vars_Img,
  S1_Img,
  ALOS_Topo_Img,
  resampled_Topo_Img,
  LC_ESRI_Img,
  LC_GLC_Img,
  SLA_Img,
  LNC_Img,
  LPC_Img,
  LDMC_Img,
  soilProperties_1_Img,
  soilProperties_2_Img,
  soilProperties_3_Img,
  soilProperties_4_Img
);

// Differentiate the discrete and continuous predictors.
var discretePredictorNames_List = [
  "Aspect",
  "LandCover_ESRI",
  "LandCover_GLC",
  "Landform"
];

var continuousPredictorNames_List = predictors_Img
  .bandNames()
  .removeAll(discretePredictorNames_List);

var discretePredictors_Img = predictors_Img
  .select(discretePredictorNames_List);

var continuousPredictors_Img = predictors_Img
  .select(continuousPredictorNames_List);


/*******************************************************************************
 * 2) Calculate GEDI relative height differences. *
 ******************************************************************************/

// Select the GEDI bands of interest.
var GEDI_Img = GEDI_L2A_Img.addBands(GEDI_L2B_Img);

var GEDI_bandNames_List = GEDI_Img
  .bandNames()
  .removeAll(["rh95"]);

GEDI_Img = GEDI_Img.select(GEDI_bandNames_List);

// Calculate the relative height differences.
var RHD_25to50_Img = GEDI_Img.select("rh50")
  .subtract(GEDI_Img.select("rh25"))
  .rename("RHD_25to50");

var RHD_50to75_Img = GEDI_Img.select("rh75")
  .subtract(GEDI_Img.select("rh50"))
  .rename("RHD_50to75");

var RHD_75to98_Img = GEDI_Img.select("rh98")
  .subtract(GEDI_Img.select("rh75"))
  .rename("RHD_75to98");

GEDI_Img = GEDI_Img
  .addBands(RHD_25to50_Img)
  .addBands(RHD_50to75_Img)
  .addBands(RHD_75to98_Img)
  .reproject(prj_25m);


/*******************************************************************************
 * 3) Sample the environmental predictors and GEDI variables. *
 ******************************************************************************/

// Derive the data mask of GEDI variables.
var GEDImask_Img = GEDI_Img
  .mask()
  .reduce(ee.Reducer.min())
  .rename("GEDI_Mask");

// Identify the most common discrete predictor value at each 25-m pixel.
var reprojected_DiscretePredictors_Img = discretePredictors_Img
  .reduceResolution({
    reducer: ee.Reducer.mode()
  })
  .reproject(prj_25m);

// Average the continuous predictor values at each 25-m pixel.
var reprojected_ContinuousPredictors_Img = continuousPredictors_Img
  .reduceResolution({
    reducer: ee.Reducer.mean()
  })
  .reproject(prj_25m);

// Data mask of the reprojected predictors.
var reprojectedPredictors_Img = reprojected_ContinuousPredictors_Img
  .addBands(reprojected_DiscretePredictors_Img);

var predictorMask_Img = reprojectedPredictors_Img
  .mask()
  .reduce(ee.Reducer.min())
  .rename("Predictor_Mask");

// Generate non-water masks.
var nonWaterMask_ESRI_Img = reprojectedPredictors_Img
  .select("LandCover_ESRI")
  .neq(1);

var nonWaterMask_GLC_Img = reprojectedPredictors_Img
  .select("LandCover_GLC")
  .neq(210);

// Combine all the masks.
var combinedMasks_Img = predictorMask_Img
  .and(GEDImask_Img)
  .and(nonWaterMask_ESRI_Img)
  .and(nonWaterMask_GLC_Img)
  .rename("Combined_Masks");

// Sample the predictors and response variables.
var sampledVariables_Img = reprojectedPredictors_Img
  .addBands(GEDI_Img)
  .updateMask(combinedMasks_Img)
  .toFloat();


/*******************************************************************************
 * 4) Add a "pixel label" band to the Image of 
 *    the sampled variables. *
 ******************************************************************************/

// Create a coordinate Image.
var coordinates_Img = ee.Image.pixelLonLat() // In degrees.
  .reproject(prj_25m);

// Mask the coordinate Image.
coordinates_Img = coordinates_Img
  .updateMask(combinedMasks_Img);

// Scale the coordinates.
var scalar_Num = 1e6;
var scaled_Long_Img = coordinates_Img.select("longitude")
  .multiply(scalar_Num);
var scaled_Lat_Img = coordinates_Img.select("latitude")
  .multiply(scalar_Num);

// Caculate the product of the scaled coordinates 
//   at each sample pixel.
var label_Img = scaled_Long_Img
  .multiply(scaled_Lat_Img)
  .rename("Pixel_Label")
  .toInt64();

// Add a pixel label to the sampled environmental predictors.
sampledVariables_Img = label_Img
  .addBands(sampledVariables_Img);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "LC_GLC_Img:",
    LC_GLC_Img // 30 m.
  );
  
  IMG_mod.Print_ImgInfo(
    "nonWaterMask_GLC_Img:",
    nonWaterMask_GLC_Img // 25 m.
  );
  
  IMG_mod.Print_ImgInfo(
    "GEDI_Img:",
    GEDI_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "combinedMasks_Img:",
    combinedMasks_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "predictors_Img:",
    predictors_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "reprojectedPredictors_Img:",
    reprojectedPredictors_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "sampledVariables_Img:",
    sampledVariables_Img
  );
  
  print(sampledVariables_Img.bandNames()); // Check the first band.

  // Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-80.2534, 39.4796, 16);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(predictors_Img.select("kNDVI")
    .updateMask(GEDImask_Img), 
    {
      min: 0,
      max: 0.8,
      palette: VIS.NDVI_palette
    }, 
    "kNDVI", false);

  Map.addLayer(predictors_Img.select("Slope")
    .updateMask(GEDImask_Img), 
    {
      min: 0,
      max: 30,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Slope", false);

  Map.addLayer(predictors_Img.select("SLA")
    .updateMask(GEDImask_Img), 
    {
      min: 7, 
      max: 22, 
      palette: PAL_mod.matplotlib.magma[7]
    }, 
    "SLA", false);

  Map.addLayer(predictors_Img.select("sand_5-15cm_mean")
    .updateMask(GEDImask_Img), 
    {
      min: 50, 
      max: 1000, 
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "sand_5-15cm_mean", false);

  Map.addLayer(sampledVariables_Img.select("kNDVI"), 
    {
      min: 0,
      max: 0.8,
      palette: VIS.NDVI_palette
    }, 
    "kNDVI", true);

  Map.addLayer(sampledVariables_Img.select("Slope"), 
    {
      min: 0,
      max: 30,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Slope", true);

  Map.addLayer(sampledVariables_Img.select("SLA"), 
    {
      min: 7, 
      max: 22, 
      palette: PAL_mod.matplotlib.magma[7]
    }, 
    "SLA", true);

  Map.addLayer(sampledVariables_Img.select("sand_5-15cm_mean"), 
    {
      min: 50, 
      max: 1000, 
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "sand_5-15cm_mean", true);

  Map.addLayer(combinedMasks_Img, 
    {
      min: 0,
      max: 1,
      palette: ["FFFFFF", "FF0000"]
    }, 
    "combinedMasks_Img");

  Map.addLayer(GEDImask_Img, 
    {
      min: 0,
      max: 1,
      palette: ["FFFFFF", "00FFFF"]
    }, 
    "GEDImask_Img");

  Map.addLayer(nonWaterMask_ESRI_Img, 
    {
      min: 0,
      max: 1,
      palette: ["FFFFFF", "0000FF"]
    }, 
    "nonWaterMask_ESRI_Img");

  Map.addLayer(nonWaterMask_GLC_Img, 
    {
      min: 0,
      max: 1,
      palette: ["FFFFFF", "00FF00"]
    }, 
    "nonWaterMask_GLC_Img");

  Map.addLayer(GEDI_Img.select("rh98"), 
    {
      min: 1,
      max: 30,
      palette: PAL_mod.matplotlib.plasma[7]
    }, 
    "rh98");

  Map.addLayer(GEDI_Img.select("RHD_25to50"), 
    {
      min: 1,
      max: 10,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "RHD_25to50");

  Map.addLayer(GEDI_Img.select("RHD_50to75"), 
    {
      min: 1,
      max: 10,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "RHD_50to75");

  Map.addLayer(GEDI_Img.select("RHD_75to98"), 
    {
      min: 1,
      max: 10,
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "RHD_75to98");

  Map.addLayer(GEDI_Img.select("pai"), 
    {
      min: 0,
      max: 3,
      palette: PAL_mod.matplotlib.inferno[7]
    }, 
    "pai");

} else {
  
  // Output to Asset.
  var fileName_Str = "SampledVariables_NonWater";
  
  Export.image.toAsset({
    image: sampledVariables_Img, 
    description: fileName_Str, 
    assetId: wd_Main_3_Str
      + "GEDI_Estimation/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_25m.scale,  
    crs: prj_25m.crs,
    maxPixels: 1e13
  });
}

