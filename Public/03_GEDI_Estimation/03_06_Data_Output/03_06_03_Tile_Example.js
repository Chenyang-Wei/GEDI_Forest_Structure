/*******************************************************************************
 * Introduction *
 * 
 *  1) Output data for a tile example.
 * 
 * Last updated: 11/26/2024
 * 
 * Runtime: <1m ~ 18m
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
var prj_25m = {
  crs: "EPSG:4326",
  scale: 25
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_EO_Str;

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var startMonth_Num = 5;
var endMonth_Num = 9;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// All tiles.
var allTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Counted_Tiles");

// Selected tiles.
var selectedTiles_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_Tiles");

// Selected grid cells.
var selectedGridCells_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Tiles_60km/"
  + "Selected_GridCells");

// Vectorized samples.
var vectorizedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "VectorizedSamples_NonWater"
);


/*******************************************************************************
 * 1) Identify a tile example. *
 ******************************************************************************/

// Select a tile example.
var tileExample_FC = selectedTiles_FC.filter(
  ee.Filter.eq({
    name: "Sample_Count", 
    value: 14586
  })
);

// Identify the corresponding grid cell.
var cellExample_FC = selectedGridCells_FC.filter(
  ee.Filter.eq({
    name: "Tile_ID", 
    value: 395
  })
);

// Identify the overlapping tiles.
var overlapping_AllTiles_FC = allTiles_FC
  .filterBounds(cellExample_FC)
  .filter(
    ee.Filter.neq({
      name: "Tile_ID", 
      value: 395
    })
  );

var overlapping_SelectedTiles_FC = selectedTiles_FC
  .filterBounds(cellExample_FC)
  .filter(
    ee.Filter.neq({
      name: "Tile_ID", 
      value: 395
    })
  );

// Identify the corresponding samples.
var filteredSamples_FC = vectorizedSamples_FC.filter(
  ee.Filter.eq({
    name: "Tile_ID", 
    value: 395
  })
).select([
  "Tile_ID", "Sample_ID", 
  "cover", "fhd_normal", "pai",
  "rh.*", "RHD_.*", "PAVD_.*"
]);


/*******************************************************************************
 * 2) Derive raw GEDI median data in the tile example. *
 ******************************************************************************/

// GEDI Level-2A data located within the tile example and
//   collected during the study period.
var GEDI_Filter = ee.Filter.and(
  ee.Filter.bounds(tileExample_FC),
  ee.Filter.calendarRange({
    start: startYear_Num, 
    end: endYear_Num, 
    field: "year"
  }),
  ee.Filter.calendarRange({
    start: startMonth_Num, 
    end: endMonth_Num, 
    field: "month"
  })
);

var L2A_IC = ee.ImageCollection(
  "LARSE/GEDI/GEDI02_A_002_MONTHLY")
  .filter(GEDI_Filter)
  .select(["rh25", "rh50", "rh75", "rh98"]);

var L2B_IC = ee.ImageCollection(
  "LARSE/GEDI/GEDI02_B_002_MONTHLY")
  .filter(GEDI_Filter)
  .select([
    "cover", "fhd_normal", "pai"
  ]);

// Generate a temporal median composite.
var L2A_Img = L2A_IC
  .median()
  .setDefaultProjection(prj_25m)
  .toFloat();

var L2B_Img = L2B_IC
  .median()
  .setDefaultProjection(prj_25m)
  .toFloat();

var L2_Img = ee.Image.cat([
  L2A_Img,
  L2B_Img
]);


/*******************************************************************************
 * 3) Vectorize the raw GEDI data. *
 ******************************************************************************/

// Create a coordinate Image.
var coordinates_Img = ee.Image.pixelLonLat() // In degrees.
  .reproject(prj_25m);

// Mask the coordinate Image.
var L2mask_Img = L2_Img.gte(0)
  .reduce(ee.Reducer.min());

coordinates_Img = coordinates_Img
  .updateMask(L2mask_Img);

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

// Add a pixel label to the GEDI samples.
L2_Img = label_Img
  .addBands(L2_Img);

// Raw GEDI samples in the tile example.
var rawSamples_FC = L2_Img
  .reduceToVectors({
    reducer: ee.Reducer.first(), 
    geometry: tileExample_FC.first().geometry(), 
    scale: prj_25m.scale, 
    geometryType: "centroid", 
    eightConnected: false, 
    labelProperty: "Pixel_Label", 
    crs: prj_25m.crs, 
    maxPixels: 1e13
  });

// Formatt conversion for output.
L2_Img = L2_Img
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = false; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  // IMG_mod.Print_ImgInfo(
  //   "L2A_Img:",
  //   L2A_Img
  // );
  
  // IMG_mod.Print_ImgInfo(
  //   "L2B_Img:",
  //   L2B_Img
  // );
  
  IMG_mod.Print_ImgInfo(
    "L2_Img:",
    L2_Img
  );
  
  print("selectedTiles_FC:",
    selectedTiles_FC.first(),
    selectedTiles_FC.size(),
    selectedTiles_FC.aggregate_mean("Sample_Count")); // 14581.6.
  
  print("selectedGridCells_FC:",
    selectedGridCells_FC.first(),
    selectedGridCells_FC.size());
  
  print("vectorizedSamples_FC:",
    vectorizedSamples_FC.first());
  
  print("cellExample_FC:",
    cellExample_FC.first(),
    cellExample_FC.size());
  
  print("overlapping_SelectedTiles_FC:",
    overlapping_SelectedTiles_FC.first(),
    overlapping_SelectedTiles_FC.size()); // 7.
  
  print("filteredSamples_FC:",
    filteredSamples_FC.first(),
    filteredSamples_FC.size()); // 14586.
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-72.056, 42.711, 7);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(overlapping_SelectedTiles_FC, 
    {
      color: "00FFFF"
    }, 
    "overlapping_SelectedTiles_FC");

  Map.addLayer(tileExample_FC, 
    {
      color: "FF0000"
    }, 
    "tileExample_FC");

  Map.addLayer(cellExample_FC, 
    {
      color: "0000FF"
    }, 
    "cellExample_FC");

  Map.addLayer(filteredSamples_FC, 
    {
      color: "FFFF00"
    }, 
    "filteredSamples_FC");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Drive.
  
  Export.table.toDrive({
    collection: tileExample_FC, 
    description: "tileExample", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.table.toDrive({
    collection: cellExample_FC, 
    description: "cellExample", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.table.toDrive({
    collection: overlapping_AllTiles_FC, 
    description: "overlapping_AllTiles", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.table.toDrive({
    collection: overlapping_SelectedTiles_FC, 
    description: "overlapping_SelectedTiles", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.table.toDrive({
    collection: filteredSamples_FC, 
    description: "filteredSamples", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.table.toDrive({
    collection: rawSamples_FC, 
    description: "rawSamples", 
    folder: "Tile_Example", 
    fileFormat: "SHP"
  });
  
  Export.image.toDrive({
    image: L2_Img, 
    description: "L2_A_B", 
    folder: "Tile_Example", 
    region: tileExample_FC.first().geometry(), 
    scale: prj_25m.scale,  
    crs: prj_25m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
}

