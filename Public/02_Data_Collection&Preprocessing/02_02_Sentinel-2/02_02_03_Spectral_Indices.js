/*******************************************************************************
 * Introduction *
 * 
 *  1) Calculate spectral indices and perform tasseled cap transformation
 *     for each Sentinel-2 Image.
 * 
 * Last updated: 6/20/2024
 * 
 * Runtime: 30m
 * 
 * https://code.earthengine.google.com/c9c55d5b93ed17460afbff361e0b1ac2?noload=1
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
var wd_Cloud_Str = "projects/ee-lidar-birds/assets/"
  + "Eastern_North_America/";

var wd_S2_Str = wd_Cloud_Str
  + "Environmental_Data/"
  + "Sentinel-2_Variables/";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Calculate other spectral indices and perform tasseled cap transformation.
var CalculateIndices_PerformTCT = function(S2_Img) {
  
  // Relevant spectral bands.
  var blue_Img = S2_Img.select("B2");
  var green_Img = S2_Img.select("B3");
  var red_Img = S2_Img.select("B4");
  var NIR_Img = S2_Img.select("B8");
  var SWIR1_Img = S2_Img.select("B11");
  var SWIR2_Img = S2_Img.select("B12");
  
  // Vegetation indices.
  var NDVI_Img = S2_Img.normalizedDifference(
    ["B8", "B4"]
  ).rename("NDVI");
  
  var kNDVI_Img = NDVI_Img
    .pow(2)
    .tanh()
    .rename("kNDVI");
  
  var NIRv_Img = NDVI_Img
    .multiply(NIR_Img)
    .rename("NIRv");
  
  var EVI_Img = S2_Img.expression(
    "2.5 * ((NIR - red) / (NIR + 6 * red - 7.5 * blue + 1))",
    {
      NIR: NIR_Img,
      red: red_Img,
      blue: blue_Img
    }
  ).rename("EVI");
  
  var NDWI_Img = S2_Img.normalizedDifference(
    ["B8", "B11"]
  ).rename("NDWI");
  
  // Non-vegetation indices.
  var mNDWI_Img = S2_Img.normalizedDifference(
    ["B3", "B11"]
  ).rename("mNDWI");
  
  var NBR_Img = S2_Img.normalizedDifference(
    ["B8", "B12"]
  ).rename("NBR");
  
  var BSI_Img = S2_Img.expression(
    "((SWIR1 + red) - (NIR + blue)) / ((SWIR1 + red) + (NIR + blue))", 
    {
      SWIR1: SWIR1_Img,
      red: red_Img,
      NIR: NIR_Img,
      blue: blue_Img
    }
  ).rename("BSI");
  
  var SIbase_Img = S2_Img.expression(
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
  var brightness_Img = S2_Img.expression(
    "0.3510 * blue + 0.3813 * green + 0.3437 * red" +
      " + 0.7196 * NIR + 0.2396 * SWIR1 + 0.1949 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Brightness");
  
  var greenness_Img = S2_Img.expression(
    "- 0.3599 * blue - 0.3533 * green - 0.4734 * red" +
      " + 0.6633 * NIR + 0.0087 * SWIR1 - 0.2856 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Greenness");
  
  var wetness_Img = S2_Img.expression(
    "0.2578 * blue + 0.2305 * green + 0.0883 * red" +
      " + 0.1071 * NIR - 0.7611 * SWIR1 - 0.5308 * SWIR2", 
    {
      blue: blue_Img,
      green: green_Img,
      red: red_Img,
      NIR: NIR_Img,
      SWIR1: SWIR1_Img,
      SWIR2: SWIR2_Img
    }
  ).rename("Wetness");
  
  // Combine all the calculated variables.
  var S2variables_Img = NDVI_Img // Vegetation indices.
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
  
  return S2variables_Img;
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Temporal median of each surface reflectance band.
var medianSR_B2_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B2");

var medianSR_B3_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B3");

var medianSR_B4_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B4");

var medianSR_B8_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_B8");

var medianSR_20mBands_Img = ee.Image(wd_S2_Str
  + "S2_MedianSR_20mBands");


/*******************************************************************************
 * 1) Calculate spectral indices and perform tasseled cap transformation
 *    for the temporal median Image of Sentinel-2 surface reflectance. *
 ******************************************************************************/

// Combine all the temporal median bands of surface reflectance.
var S2_MedianSR_Img = ee.Image.cat(
  medianSR_B2_Img,
  medianSR_B3_Img,
  medianSR_B4_Img,
  medianSR_B8_Img,
  medianSR_20mBands_Img
);

// Derive the variables of interest.
var S2_Variables_Img = CalculateIndices_PerformTCT(
  S2_MedianSR_Img
).toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "S2_MedianSR_Img:",
    S2_MedianSR_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "S2_Variables_Img:",
    S2_Variables_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(S2_MedianSR_Img.select("B11"), 
    {
      min: 0.0,
      max: 0.3,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "SWIR - 1 (raw res.: 20 m)");

  Map.addLayer(S2_MedianSR_Img.select("B8A"), 
    {
      min: 0.0,
      max: 0.5,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Red Edge 4 (raw res.: 20 m)");

  Map.addLayer(S2_MedianSR_Img.select("B4"), 
    {
      min: 0.0,
      max: 0.3,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Red (raw res.: 10 m)");

  Map.addLayer(S2_Variables_Img.select("Greenness"), 
    {
      min: -0.4,
      max: 0.4,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "Greenness");

} else {
  
  // Output to Asset.
  var fileName_Str = "S2_Variables";

  Export.image.toAsset({
    image: S2_Variables_Img, 
    description: fileName_Str, 
    assetId: wd_S2_Str
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

