/*******************************************************************************
 * Introduction *
 * 
 *  1) NDVI and topographic features
 * 
 *  2) NLCD forests
 * 
 *  3) GEDI products
 * 
 * Updated: 3/11/2024
 * 
 * Runtime: 1m ~ 4m.
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var IMG = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");

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

var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

var GEDI_prj = {
  crs: "EPSG:4326",
  scale: 25
};

// Study area.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "Sierra_Nevada_US_GMBAv2_Standard"
).first()).geometry();

var AOI = studyArea_Geom.bounds();

// Land area mask.
var landMask_Img = ee.Image(
  "UMD/hansen/global_forest_change_2022_v1_10")
  .select("datamask")
  .eq(1);

// Empty images.
var empty_30m_Img = ee.Image(1)
  .reproject(prj_30m)
  .updateMask(landMask_Img);

var empty_25m_Img = ee.Image(1)
  .reproject(GEDI_prj)
  .updateMask(landMask_Img);

// Combined reducers.
var meanSD_Reducers = ee.Reducer.mean().unweighted()
  .combine({
    reducer2: ee.Reducer.stdDev().unweighted(),
    sharedInputs: true
  });

var meanSDcount_Reducers = meanSD_Reducers
  .combine({
    reducer2: ee.Reducer.count(),
    sharedInputs: true
  });


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Aggregate an environmental variable.
var aggregate = IMG.Aggregate_Pixels;


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// NDVI.
var NDVI_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "maxNDVI_Median"
).updateMask(landMask_Img);

// Topographic features.
var topography_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "topography"
).updateMask(landMask_Img);

// NLCD forests.
var deciduous_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "deciduous_Forest"
).updateMask(landMask_Img);

var evergreen_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "evergreen_Forest"
).updateMask(landMask_Img);

var mixed_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "mixed_Forest"
).updateMask(landMask_Img);

// GEDI.
var GEDI_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "GEDI_median"
).updateMask(landMask_Img);


/*******************************************************************************
 * 1) NDVI and topographic features *
 ******************************************************************************/

var newNDVI_Img = aggregate(
  NDVI_Img, prj_30m.scale, 
  meanSD_Reducers, 
  newPrj.scale, newPrj.crs);

var newTopo_Img = aggregate(
  topography_Img, prj_30m.scale, 
  meanSD_Reducers, 
  newPrj.scale, newPrj.crs);


/*******************************************************************************
 * 2) NLCD forests *
 ******************************************************************************/

var newDeciduous_Img = aggregate(
  deciduous_Img, prj_30m.scale, 
  ee.Reducer.count(), 
  newPrj.scale, newPrj.crs);

var newEvergreen_Img = aggregate(
  evergreen_Img, prj_30m.scale, 
  ee.Reducer.count(), 
  newPrj.scale, newPrj.crs);

var newMixed_Img = aggregate(
  mixed_Img, prj_30m.scale, 
  ee.Reducer.count(), 
  newPrj.scale, newPrj.crs);

var count_30m_Img = aggregate(
  empty_30m_Img, prj_30m.scale, 
  ee.Reducer.count(), 
  newPrj.scale, newPrj.crs);


/*******************************************************************************
 * 3) GEDI products *
 ******************************************************************************/

// var newGEDI_Img = aggregate(
//   GEDI_Img, GEDI_prj.scale, 
//   meanSDcount_Reducers, 
//   newPrj.scale, newPrj.crs);

// Aggregate GEDI datasets by band.
var new_rh98_Img = aggregate(
  GEDI_Img.select("rh98"), 
  GEDI_prj.scale, 
  meanSDcount_Reducers, 
  newPrj.scale, newPrj.crs);

var new_cover_Img = aggregate(
  GEDI_Img.select("cover"), 
  GEDI_prj.scale, 
  meanSDcount_Reducers, 
  newPrj.scale, newPrj.crs);

var new_fhd_Img = aggregate(
  GEDI_Img.select("fhd_normal"), 
  GEDI_prj.scale, 
  meanSDcount_Reducers, 
  newPrj.scale, newPrj.crs);

var new_pai_Img = aggregate(
  GEDI_Img.select("pai"), 
  GEDI_prj.scale, 
  meanSDcount_Reducers, 
  newPrj.scale, newPrj.crs);

var count_25m_Img = aggregate(
  empty_25m_Img, GEDI_prj.scale, 
  ee.Reducer.count(), 
  newPrj.scale, newPrj.crs);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  print("GEDI_Img:", GEDI_Img.bandNames());
  
  //// Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-119.833, 38.52, 7);
  
  // NDVI.
  Map.addLayer(NDVI_Img, 
    {min: 0, max: 1, 
    palette: VIS.NDVI_palette}, 
    "NDVI", true); 

  // Topographic features.
  Map.addLayer(topography_Img, 
    {bands: ["elevation"], min: 500, max: 3000,  
    palette: VIS.Elevation_palette}, 
    "Elevation (m)", true);
  
  Map.addLayer(topography_Img, 
    {bands: ["aspect"], min: 90, max: 270, 
    palette: ["000000", "FFFFFF"]}, 
    "Aspect (Degrees)", true); 
  
  Map.addLayer(topography_Img, 
    {bands: ["slope"], min: 0, max: 45, 
    palette: ["000000", "FFFFFF"]}, 
    "Slope (Degrees)", true);
  
  // NLCD forests.
  Map.addLayer(deciduous_Img, 
    {bands: ["landcover_2019"], min: 0, max: 1, 
    palette: ["FFFFFF", "FF0000"]}, 
    "decidous", true); 

  Map.addLayer(evergreen_Img, 
    {bands: ["landcover_2019"], min: 0, max: 1, 
    palette: ["FFFFFF", "0000FF"]}, 
    "evergreen", true); 

  Map.addLayer(mixed_Img, 
    {bands: ["landcover_2019"], min: 0, max: 1, 
    palette: ["FFFFFF", "00FF00"]}, 
    "mixed", true); 

  // GEDI datasets.
  Map.addLayer(GEDI_Img, 
    {bands: ["rh98"], min: 0, max: 35,  
    palette: ["FFFFFF", "228B22"]}, 
    "Canopy height (m)", true);
  
  Map.addLayer(GEDI_Img, 
    {bands: ["cover"], min: 0, max: 0.7, 
    palette: ["FFFFFF", "00008B"]}, 
    "Total canopy cover", true); 
  
  Map.addLayer(GEDI_Img, 
    {bands: ["fhd_normal"], min: 1, max: 3.5, 
    palette: ["0000FF", "FFFFFF", "FF0000"]}, 
    "Foliage Height Diversity", true);
  
  Map.addLayer(GEDI_Img, 
    {bands: ["pai"], min: 0, max: 3, 
    palette: ["FFFFFF", "FF8B00"]}, 
    "Total Plant Area Index", true); 

  // NDVI.
  Map.addLayer(newNDVI_Img, 
    {bands: ["NDVI_mean"], min: 0, max: 1, 
    palette: VIS.NDVI_palette}, 
    "New NDVI", true); 
  
  // // Empty.
  // Map.addLayer(count_30m_Img, 
  //   {min: 0, max: 1e3, 
  //   palette: ["FFFFFF", "000000"]}, 
  //   "count_30m_Img", true); 
  
} else {
  
  var fileName;
  
  // NDVI.
  fileName = "maxNDVI_Median";
  
  Export.image.toAsset({
    image: newNDVI_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // Topographic features.
  fileName = "topography";
  
  Export.image.toAsset({
    image: newTopo_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // Deciduous forest.
  fileName = "deciduous_Forest";
  
  Export.image.toAsset({
    image: newDeciduous_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // Evergreen forest.
  fileName = "evergreen_Forest";
  
  Export.image.toAsset({
    image: newEvergreen_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // Mixed forest.
  fileName = "mixed_Forest";
  
  Export.image.toAsset({
    image: newMixed_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // GEDI datasets.
  fileName = "GEDI_rh98";
  
  Export.image.toAsset({
    image: new_rh98_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  fileName = "GEDI_cover";
  
  Export.image.toAsset({
    image: new_cover_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  fileName = "GEDI_fhd";
  
  Export.image.toAsset({
    image: new_fhd_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  fileName = "GEDI_pai";
  
  Export.image.toAsset({
    image: new_pai_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  // Pixel numbers.
  fileName = "count_30m";
  
  Export.image.toAsset({
    image: count_30m_Img, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
      + fileName, 
    region: AOI, 
    scale: newPrj.scale,  
    crs: newPrj.crs,
    maxPixels: 1e13
  });
  
  fileName = "count_25m";
  
  Export.image.toAsset({
    image: count_25m_Img, 
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

