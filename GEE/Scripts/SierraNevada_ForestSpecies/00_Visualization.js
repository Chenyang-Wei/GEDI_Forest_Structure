/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Set a seed.
var seed_Num = 17;

// Proportion of the training dataset.
var split_Num = 0.75;

// Grid scale.
var gridScale_Num = 3e4;


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var VIS = require(
  "users/ChenyangWei/Public:Modules/General/Visualization.js");


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Create a grid over space.
var Create_Grid = function(geometry, scale) {
  
  var lonLat = ee.Image.pixelLonLat();
  
  // Select the longitude and latitude bands, 
  //  multiply by a large number then
  //  truncate them to integers.
  var lonGrid = lonLat
    .select("longitude")
    .multiply(1e5)
    .toInt();
  
  var latGrid = lonLat
    .select("latitude")
    .multiply(1e5)
    .toInt();

  return lonGrid
    .multiply(latGrid)
    .reduceToVectors({
      geometry: geometry.buffer(scale), 
      // Buffer to expand grid and include borders.
      scale: scale,
      geometryType: "polygon",
    });
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "Sierra_Nevada_US_GMBAv2_Standard"
).first()).geometry();

var AOI = studyArea_Geom.bounds();

// eBird observations.
var allSpecies_FC = ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "allSpecies_SubSampled"
);

// Aggregated variables.
var aggregatedVars_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "aggregatedVars_3km"
);

// Land area mask.
var landMask_Img = ee.Image(
  "UMD/hansen/global_forest_change_2022_v1_10")
  .select("datamask")
  .eq(1);

// Create a grid within the study area.
var Grid_FC = Create_Grid(AOI, gridScale_Num);

Grid_FC = Grid_FC.filterBounds(studyArea_Geom)
  .randomColumn({seed: seed_Num})
  .sort("random");

// Split blocks for training and validation.
var trainingGrid_FC = Grid_FC.filter(
  ee.Filter.lte("random", split_Num));

var testGrid_FC = Grid_FC.filter(
  ee.Filter.gt("random", split_Num));


/**
 * Raw datasets.
*/

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
 * Visualization *
 ******************************************************************************/

// Add two maps to the screen.
var left = ui.Map();

var right = ui.Map();

ui.root.clear();
ui.root.add(left);
ui.root.add(right);

// Link the two maps.
ui.Map.Linker([left, right], "change-bounds");


/**
 * Left panel.
*/

left.setOptions("HYBRID");
left.centerObject(AOI, 7);

// NDVI.
left.addLayer(NDVI_Img, 
  {min: 0, max: 1, 
  palette: VIS.NDVI_palette}, 
  "NDVI", true); 

// Topographic features.
left.addLayer(topography_Img, 
  {bands: ["elevation"], min: 500, max: 3000,  
  palette: VIS.Elevation_palette}, 
  "Elevation (m)", true);

left.addLayer(topography_Img, 
  {bands: ["aspect"], min: 90, max: 270, 
  palette: ["000000", "FFFFFF"]}, 
  "Aspect (Degrees)", true); 

left.addLayer(topography_Img, 
  {bands: ["slope"], min: 0, max: 45, 
  palette: ["000000", "FFFFFF"]}, 
  "Slope (Degrees)", true);

// NLCD forests.
left.addLayer(deciduous_Img, 
  {bands: ["landcover_2019"], min: 0, max: 1, 
  palette: ["FFFFFF", "FF0000"]}, 
  "Decidous forest", true); 

left.addLayer(evergreen_Img, 
  {bands: ["landcover_2019"], min: 0, max: 1, 
  palette: ["FFFFFF", "0000FF"]}, 
  "Evergreen forest", true); 

left.addLayer(mixed_Img, 
  {bands: ["landcover_2019"], min: 0, max: 1, 
  palette: ["FFFFFF", "00FF00"]}, 
  "Mixed forest", true); 

// GEDI datasets.
left.addLayer(GEDI_Img, 
  {bands: ["rh98"], min: 0, max: 35,  
  palette: ["FFFFFF", "228B22"]}, 
  "Canopy height (m)", true);

left.addLayer(GEDI_Img, 
  {bands: ["cover"], min: 0, max: 0.7, 
  palette: ["FFFFFF", "00008B"]}, 
  "Total canopy cover", true); 

left.addLayer(GEDI_Img, 
  {bands: ["fhd_normal"], min: 1, max: 3.5, 
  palette: ["0000FF", "FFFFFF", "FF0000"]}, 
  "Foliage Height Diversity (FHD)", true);

left.addLayer(GEDI_Img, 
  {bands: ["pai"], min: 0, max: 3, 
  palette: ["FFFFFF", "FF8B00"]}, 
  "Total Plant Area Index (PAI)", true); 

left.addLayer(allSpecies_FC.filter(
  ee.Filter.eq("spcs_bs", 0)
), 
  {
    color: "808080"
  }, 
  "Non-detection");

left.addLayer(allSpecies_FC.filter(
  ee.Filter.eq("spcs_bs", 1)
), 
  {
    color: "FF0000"
  }, 
  "Detection");


/**
 * Right panel. 
*/

right.setOptions("HYBRID");
right.centerObject(AOI, 7);

// NDVI.
right.addLayer(aggregatedVars_Img, 
  {bands: ["NDVI_mean"], min: 0, max: 1, 
  palette: VIS.NDVI_palette}, 
  "NDVI (mean)", true); 

// Topographic features.
right.addLayer(aggregatedVars_Img, 
  {bands: ["elevation_mean"], min: 500, max: 3000,  
  palette: VIS.Elevation_palette}, 
  "Elevation (mean)", true);

right.addLayer(aggregatedVars_Img, 
  {bands: ["aspect_mean"], min: 90, max: 270, 
  palette: ["000000", "FFFFFF"]}, 
  "Aspect (mean)", true); 

right.addLayer(aggregatedVars_Img, 
  {bands: ["slope_mean"], min: 0, max: 45, 
  palette: ["000000", "FFFFFF"]}, 
  "Slope (mean)", true);

// NLCD forests.
right.addLayer(aggregatedVars_Img, 
  {bands: ["deciduous_Proportion"], min: 0, max: 0.25, 
  palette: ["FFFFFF", "FF0000"]}, 
  "Deciduous forest coverage", true); 

right.addLayer(aggregatedVars_Img, 
  {bands: ["evergreen_Proportion"], min: 0, max: 1, 
  palette: ["FFFFFF", "0000FF"]}, 
  "Evergreen forest coverage", true); 

right.addLayer(aggregatedVars_Img, 
  {bands: ["mixed_Proportion"], min: 0, max: 0.45, 
  palette: ["FFFFFF", "00FF00"]}, 
  "Mixed forest coverage", true); 

// GEDI datasets.
right.addLayer(aggregatedVars_Img, 
  {bands: ["rh98_mean"], min: 0, max: 35,  
  palette: ["FFFFFF", "228B22"]}, 
  "Canopy Height (mean)", true);

right.addLayer(aggregatedVars_Img, 
  {bands: ["cover_mean"], min: 0, max: 0.7, 
  palette: ["FFFFFF", "00008B"]}, 
  "Total Canopy Cover (mean)", true); 

right.addLayer(aggregatedVars_Img, 
  {bands: ["fhd_normal_mean"], min: 1, max: 3.5, 
  palette: ["0000FF", "FFFFFF", "FF0000"]}, 
  "Foliage Height Diversity (mean)", true);

right.addLayer(aggregatedVars_Img, 
  {bands: ["pai_mean"], min: 0, max: 3, 
  palette: ["FFFFFF", "FF8B00"]}, 
  "Total Plant Area Index (mean)", true); 

right.addLayer(aggregatedVars_Img, 
  {bands: ["GEDI_Proportion"], min: 0, max: 0.05, 
  palette: ["FFFFFF", "FF0000"]}, 
  "GEDI coverage", true); 

right.addLayer(trainingGrid_FC, 
  {
    color: "FF0000"
  }, 
  "trainingGrid_FC");

right.addLayer(testGrid_FC, 
  {
    color: "00FFFF"
  }, 
  "testGrid_FC");
