/*******************************************************************************
 * Introduction *
 * 
 *  1) Determine the study area
 * 
 *  2) Select a few canopy cover vertical profile metrics
 * 
 *  3) Aggregate the selected metrics to a coarser resolution
 * 
 *  4) Check the collection dates of the raw GEDI data
 * 
 * Updated: 2/13/2024
 * 
 * Runtime: N/A
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var IMG = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information of GEDI.
var GEDI_prjInfo_Dict = {
  crs: "EPSG:4326",
  scale: 25
};
// var GEDI_prjInfo_Dict = {
//   crs: "EPSG:32631",
//   scale: 25
// };

// PAI visualization parameters.
var vis_PAI = {
  min: 0,
  max: 3,
  palette: ["0000FF", "FFFFFF", "228B22"]
};


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// To mask the L2B raster data.
var qualityMask_L2bRaster = function(l2b_Img) {
  return l2b_Img.updateMask(
      l2b_Img.select("l2b_quality_flag").eq(1)
    ).updateMask(
      l2b_Img.select("degrade_flag").eq(0)
    );
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Load the EC JRC global map of forest cover 2020 (V1).
var rawForest_Img = ee.ImageCollection("JRC/GFC2020/V1")
  .mosaic();

// Load the US Census States 2018.
var US_states_FC = ee.FeatureCollection("TIGER/2018/States");

// Load and mask the GEDI L2B raster data.
var l2bRaster_IC = ee.ImageCollection("LARSE/GEDI/GEDI02_B_002_MONTHLY")
  .map(qualityMask_L2bRaster);

// print(l2bRaster_IC.first().projection().nominalScale())


/*******************************************************************************
 * 1) Determine the study area *
 ******************************************************************************/

// Select the state(s) of interest.
var studyArea_FC = US_states_FC.filter(
  ee.Filter.inList({
    leftField: "NAME", 
    rightValue: ["Ohio", "Wisconsin"]
  }));

// Extract the geometry of the study area.
var studyArea_Geom = studyArea_FC.geometry();

// // Reproject the forest map.
// var reprojectedForest_Img = rawForest_Img
//   .reproject(GEDI_prjInfo_Dict);


/*******************************************************************************
 * 2) Select a few canopy cover vertical profile metrics *
 ******************************************************************************/

// Select the L2B raster data intersecting the study area.
var filtered_L2bRaster_IC = l2bRaster_IC
  .filterBounds(studyArea_Geom);
  // .filterDate({
  //   start: "2019-06-01", 
  //   end: "2019-09-01"
  // });

// Total Plant Area Index during the summer time.
var pai_Summer_IC = filtered_L2bRaster_IC.select("pai")
  .filter(ee.Filter.calendarRange({
    start: 6, 
    end: 8, 
    field: "month"
  }));

var pai_ForestMedian_Img = pai_Summer_IC.median()
  .updateMask(rawForest_Img)
  .setDefaultProjection(GEDI_prjInfo_Dict);


/*******************************************************************************
 * 3) Aggregate the selected metrics to a coarser resolution *
 ******************************************************************************/

// Total Plant Area Index.
var pai_Forest3k_Img = IMG.Aggregate_Pixels(
  pai_ForestMedian_Img, 25, 
  ee.Reducer.mean(), 
  3000, "EPSG:4326");


/*******************************************************************************
 * 4) Check the collection dates of the raw GEDI data *
 ******************************************************************************/

var rawPAI_IC = filtered_L2bRaster_IC.select("pai");

var rawPAI_median, i, Year, Month;

// Visualization.
Map.setOptions("Satellite");
// Map.centerObject(studyArea_Geom, 6);
Map.setCenter(-82.2498, 40.274, 12);

Map.addLayer(studyArea_Geom, 
  {
    color: "FFFFFF"
  }, 
  "States of Ohio and Wisconsin");

Map.addLayer(rawForest_Img, 
  {
    bands: ["Map"],
    palette: ["808080"]
  }, 
  "Forested Areas (10 m)",
  true);

// Year of collection.
var yearColors_List = ["e41a1c", "377eb8", 
  "4daf4a", "984ea3", "ff7f00"];

for (i = 0; i <= 4; i ++) {
  
  Year = i + 2019;
  
  rawPAI_median = rawPAI_IC.filter(
    ee.Filter.calendarRange({
      start: Year, 
      field: "year"
    })
  ).median();
  // .aside(print);

  Map.addLayer(rawPAI_median, 
    {palette: yearColors_List[i]}, 
    "Total Plant Area Index in " + Year);
}

// Month of collection.
var monthColors_List = ['#a6cee3','#1f78b4','#b2df8a',
  '#33a02c','#fb9a99','#e31a1c','#fdbf6f',
  '#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

var rawPAI_2021_IC = rawPAI_IC.filter(
  ee.Filter.calendarRange({
    start: 2021, 
    field: "year"
  })
);

for (Month = 1; Month <= 12; Month ++) {
  
  // // Switch colors between months.
  // if (Month % 2 === 0) {
  //   var monthColor_Str = "0000FF";
  // }
  // else {
  //   var monthColor_Str = "FF0000";
  // }
  
  rawPAI_median = rawPAI_2021_IC.filter(
    ee.Filter.calendarRange({
      start: Month, 
      field: "month"
    })
  ).median();
  // .aside(print);

  Map.addLayer(rawPAI_median, 
    // {palette: monthColor_Str}, 
    {palette: monthColors_List[Month]}, 
    "Total Plant Area Index in 2021/" + Month);
}


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  // Check the result(s).
  // print(reprojectedForest_Img.projection().nominalScale());
  print(studyArea_Geom);
  print(rawPAI_IC.aggregate_array("year").distinct());
  print(rawPAI_IC.first());
  
  Map.addLayer(pai_Forest3k_Img, 
    vis_PAI, 
    "Total Plant Area Index (3 km, Summer, Forest)");
  
  Map.addLayer(pai_ForestMedian_Img, 
    vis_PAI, 
    "Total Plant Area Index (25 m, Summer, Forest)");
  
}
