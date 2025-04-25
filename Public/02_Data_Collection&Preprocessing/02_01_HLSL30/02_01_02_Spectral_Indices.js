/*******************************************************************************
 * Introduction *
 * 
 *  1) Calculate spectral indices and perform tasseled cap transformation
 *     for the HLSL30 median composite Image.
 * 
 * Last updated: 6/14/2024
 * 
 * Runtime: 24m
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
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Calculate other spectral indices and perform tasseled cap transformation.
var CalculateIndices_PerformTCT = function(L8_Img) {
  
  // Relevant spectral bands.
  var blue_Img = L8_Img.select("B2");
  var green_Img = L8_Img.select("B3");
  var red_Img = L8_Img.select("B4");
  var NIR_Img = L8_Img.select("B5");
  var SWIR1_Img = L8_Img.select("B6");
  var SWIR2_Img = L8_Img.select("B7");
  
  // Vegetation indices.
  var NDVI_Img = L8_Img.normalizedDifference(
    ["B5", "B4"]
  ).rename("NDVI");
  
  // Calculate kNDVI.
  var kNDVI_Img = NDVI_Img
    .pow(2)
    .tanh()
    .rename("kNDVI");
  
  var NIRv_Img = NDVI_Img
    .multiply(NIR_Img)
    .rename("NIRv");
  
  var EVI_Img = L8_Img.expression(
    "2.5 * ((NIR - red) / (NIR + 6 * red - 7.5 * blue + 1))",
    {
      NIR: NIR_Img,
      red: red_Img,
      blue: blue_Img
    }
  ).rename("EVI");
  
  var NDWI_Img = L8_Img.normalizedDifference(
    ["B5", "B6"]
  ).rename("NDWI");
  
  // Non-vegetation indices.
  var mNDWI_Img = L8_Img.normalizedDifference(
    ["B3", "B6"]
  ).rename("mNDWI");
  
  var NBR_Img = L8_Img.normalizedDifference(
    ["B5", "B7"]
  ).rename("NBR");
  
  var BSI_Img = L8_Img.expression(
    "((SWIR1 + red) - (NIR + blue)) / ((SWIR1 + red) + (NIR + blue))", 
    {
      SWIR1: SWIR1_Img,
      red: red_Img,
      NIR: NIR_Img,
      blue: blue_Img
    }
  ).rename("BSI");
  
  var SIbase_Img = L8_Img.expression(
    "(1 - blue) * (1 - green) * (1 - red)", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img
    }
  );
  var SI_Img = SIbase_Img.pow(1 / 3)
    .rename("SI");
  
  var NDBI_Img = NDWI_Img.multiply(-1);
  var BU_Img = NDBI_Img.subtract(NDVI_Img)
    .rename("BU");
  
  // Tasseled cap transformation.
  var brightness_Img = L8_Img.expression(
    "0.3690 * blue + 0.4271 * green + 0.4689 * red" +
      " + 0.5073 * NIR + 0.3824 * SWIR1 + 0.2406 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Brightness");
  
  var greenness_Img = L8_Img.expression(
    "- 0.2870 * blue - 0.2685 * green - 0.4087 * red" +
      " + 0.8145 * NIR + 0.0637 * SWIR1 - 0.1052 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Greenness");
  
  var wetness_Img = L8_Img.expression(
    "0.0382 * blue + 0.2137 * green + 0.3536 * red" +
      " + 0.2270 * NIR - 0.6108 * SWIR1 - 0.6351 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Wetness");
  
  // Combine all the LANDSAT-8 variables.
  var L8variables_Img = NDVI_Img // Vegetation indices.
    .addBands(kNDVI_Img)
    .addBands(NIRv_Img)
    .addBands(EVI_Img)
    .addBands(NDWI_Img)
    // Non-vegetation indices.
    .addBands(mNDWI_Img)
    .addBands(NBR_Img)
    .addBands(BSI_Img)
    .addBands(SI_Img)
    .addBands(BU_Img)
    // Tasseled cap transformation.
    .addBands(brightness_Img)
    .addBands(greenness_Img)
    .addBands(wetness_Img);
  
  return L8variables_Img;
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// Median composite of the HLSL30 imagery.
var HLSL30_Median_Img = ee.Image(wd_Main_Str
  + "Environmental_Data/"
  + "HLSL30_MedianSR");


/*******************************************************************************
 * 1) Calculate spectral indices and perform tasseled cap transformation
 *    for the HLSL30 median composite Image. *
 ******************************************************************************/

var HLSL30_Variables_Img = CalculateIndices_PerformTCT(
  HLSL30_Median_Img
).toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "HLSL30_Median_Img:",
    HLSL30_Median_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "HLSL30_Variables_Img:",
    HLSL30_Variables_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(HLSL30_Median_Img, 
    {
      bands: ["B4", "B3", "B2"],
      min: 0.0,
      max: 0.3
    }, 
    "HLSL30_Median_Img");

  Map.addLayer(HLSL30_Variables_Img, 
    {
      bands: ["Greenness"],
      min: -0.4,
      max: 0.4,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Greenness");

} else {
  
  // Output to Asset.
  var fileName_Str = "HLSL30_Variables";
  
  Export.image.toAsset({
    image: HLSL30_Variables_Img, 
    description: fileName_Str, 
    assetId: wd_Main_Str
      + "Environmental_Data/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

