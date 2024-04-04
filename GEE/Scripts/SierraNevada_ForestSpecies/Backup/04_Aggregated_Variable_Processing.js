/*******************************************************************************
 * Introduction *
 * 
 *  1) Forest proportion cacluation
 * 
 *  2) GEDI coverage calculation
 * 
 *  3) Data combination
 * 
 * Updated: 3/11/2024
 * 
 * Runtime: <1m
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var VIS = require(
  "users/ChenyangWei/Public:Modules/General/Visualization.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
var newPrj = {
  crs: "EPSG:4326",
  scale: 3e3
};

// Study area.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "Sierra_Nevada_US_GMBAv2_Standard"
).first()).geometry();

var AOI = studyArea_Geom.bounds();


/*******************************************************************************
 * Functions *
 ******************************************************************************/


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// NDVI.
var NDVI_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "maxNDVI_Median"
);

// Topographic features.
var topography_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "topography"
);

// NLCD forests.
var deciduous_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "deciduous_Forest"
);

var evergreen_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "evergreen_Forest"
);

var mixed_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "mixed_Forest"
);

// GEDI datasets.
var rh98_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "GEDI_rh98"
);

var cover_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "GEDI_cover"
);

var fhd_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "GEDI_fhd"
);

var pai_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "GEDI_pai"
);

// Pixel number images.
var count_30m_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "count_30m"
);

var count_25m_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "count_25m"
);


/*******************************************************************************
 * 1) Forest proportion cacluation *
 ******************************************************************************/

// Deciduous forest.
var deciduous_2019 = deciduous_Img
  .select("landcover_2019")
  .divide(count_30m_Img)
  .rename("deciduous_Proportion");

var deciduous_2021 = deciduous_Img
  .select("landcover_2021")
  .divide(count_30m_Img)
  .rename("deciduous_Proportion");

var deciduousMedian_Img = ee.ImageCollection.fromImages([
  deciduous_2019, deciduous_2021
]).median();

// Evergreen forest.
var evergreen_2019 = evergreen_Img
  .select("landcover_2019")
  .divide(count_30m_Img)
  .rename("evergreen_Proportion");

var evergreen_2021 = evergreen_Img
  .select("landcover_2021")
  .divide(count_30m_Img)
  .rename("evergreen_Proportion");

var evergreenMedian_Img = ee.ImageCollection.fromImages([
  evergreen_2019, evergreen_2021
]).median();

// Mixed forest.
var mixed_2019 = mixed_Img
  .select("landcover_2019")
  .divide(count_30m_Img)
  .rename("mixed_Proportion");

var mixed_2021 = mixed_Img
  .select("landcover_2021")
  .divide(count_30m_Img)
  .rename("mixed_Proportion");

var mixedMedian_Img = ee.ImageCollection.fromImages([
  mixed_2019, mixed_2021
]).median();


/*******************************************************************************
 * 2) GEDI coverage calculation *
 ******************************************************************************/

// Mixed forest.
var rh98_Ratio_Img = rh98_Img
  .select("rh98_count")
  .divide(count_25m_Img)
  .rename("GEDI_Proportion");

var cover_Ratio_Img = cover_Img
  .select("cover_count")
  .divide(count_25m_Img)
  .rename("GEDI_Proportion");

var fhd_Ratio_Img = fhd_Img
  .select("fhd_normal_count")
  .divide(count_25m_Img)
  .rename("GEDI_Proportion");

var pai_Ratio_Img = pai_Img
  .select("pai_count")
  .divide(count_25m_Img)
  .rename("GEDI_Proportion");

// Calculate the min. count.
var GEDI_Ratio_Img = ee.ImageCollection.fromImages([
  rh98_Ratio_Img,
  cover_Ratio_Img,
  fhd_Ratio_Img,
  pai_Ratio_Img
]).min();


/*******************************************************************************
 * 3) Data combination *
 ******************************************************************************/

var aggregatedVars_Img = NDVI_Img
  .addBands(topography_Img)
  .addBands(deciduousMedian_Img)
  .addBands(evergreenMedian_Img)
  .addBands(mixedMedian_Img)
  .addBands(rh98_Img.select(0, 1))
  .addBands(cover_Img.select(0, 1))
  .addBands(fhd_Img.select(0, 1))
  .addBands(pai_Img.select(0, 1))
  .addBands(GEDI_Ratio_Img);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  //// Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-119.833, 38.52, 7);
  
  // NDVI.
  print("NDVI_Img:", NDVI_Img.bandNames());
  
  Map.addLayer(NDVI_Img, 
    {bands: ["NDVI_mean"], min: 0, max: 1, 
    palette: VIS.NDVI_palette}, 
    "NDVI", true); 

  // Topographic features.
  print("topography_Img:", topography_Img.bandNames());
  
  Map.addLayer(topography_Img, 
    {bands: ["elevation_mean"], min: 500, max: 3000,  
    palette: VIS.Elevation_palette}, 
    "Elevation (m)", true);
  
  Map.addLayer(topography_Img, 
    {bands: ["aspect_mean"], min: 90, max: 270, 
    palette: ["000000", "FFFFFF"]}, 
    "Aspect (Degrees)", true); 
  
  Map.addLayer(topography_Img, 
    {bands: ["slope_mean"], min: 0, max: 45, 
    palette: ["000000", "FFFFFF"]}, 
    "Slope (Degrees)", true);
  
  // NLCD forests.
  Map.addLayer(deciduousMedian_Img, 
    {min: 0, max: 0.25, 
    palette: ["FFFFFF", "FF0000"]}, 
    "deciduousMedian_Img", true); 

  Map.addLayer(evergreenMedian_Img, 
    {min: 0, max: 1, 
    palette: ["FFFFFF", "0000FF"]}, 
    "evergreenMedian_Img", true); 

  Map.addLayer(mixedMedian_Img, 
    {min: 0, max: 0.45, 
    palette: ["FFFFFF", "00FF00"]}, 
    "mixedMedian_Img", true); 

  // GEDI datasets.
  print("rh98_Img:", rh98_Img.bandNames());
  
  Map.addLayer(rh98_Img, 
    {bands: ["rh98_mean"], min: 0, max: 35,  
    palette: ["FFFFFF", "228B22"]}, 
    "Canopy Height (m)", true);
  
  print("cover_Img:", cover_Img.bandNames());
  
  Map.addLayer(cover_Img, 
    {bands: ["cover_mean"], min: 0, max: 0.7, 
    palette: ["FFFFFF", "00008B"]}, 
    "Total Canopy Cover", true); 
  
  print("fhd_Img:", fhd_Img.bandNames());
  
  Map.addLayer(fhd_Img, 
    {bands: ["fhd_normal_mean"], min: 1, max: 3.5, 
    palette: ["0000FF", "FFFFFF", "FF0000"]}, 
    "Foliage Height Diversity", true);
  
  print("pai_Img:", pai_Img.bandNames());
  
  Map.addLayer(pai_Img, 
    {bands: ["pai_mean"], min: 0, max: 3, 
    palette: ["FFFFFF", "FF8B00"]}, 
    "Total Plant Area Index", true); 

  Map.addLayer(GEDI_Ratio_Img, 
    {min: 0, max: 0.05, 
    palette: ["FFFFFF", "FF0000"]}, 
    "GEDI_Ratio_Img", true); 

  // // Pixel number images.
  // print("count_30m_Img:", count_30m_Img.bandNames());
  
  // Map.addLayer(count_30m_Img, 
  //   {min: 0, max: 1e4, 
  //   palette: ["0000FF", "FFFFFF", "FF0000"]}, 
  //   "count_30m_Img", true); 

  // print("count_25m_Img:", count_25m_Img.bandNames());
  
  // Map.addLayer(count_25m_Img, 
  //   {min: 0, max: 14400, 
  //   palette: ["0000FF", "FFFFFF", "FF0000"]}, 
  //   "count_25m_Img", true); 

  print("Combination result:", 
    aggregatedVars_Img.bandNames());
  
} else {
  
  var fileName = "aggregatedVars_3km";
  
  Export.image.toAsset({
    image: aggregatedVars_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
}

