/*******************************************************************************
 * Introduction *
 * 
 *  1) Determine the most common land cover type at the local level.
 * 
 *  2) Aggregate the land cover data to 30 m.
 * 
 * Last updated: 6/16/2024
 * 
 * Runtime: 33m
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
var prj_10m = {
  crs: "EPSG:4326",
  scale: 10
};

var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// ESRI 10m Annual Land Cover (2017-2023).
var landCover_IC = ee.ImageCollection(
  "projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS")
  .select(["b1"], ["LandCover_ESRI"]);


/*******************************************************************************
 * 1) Determine the most common land cover type at the local level. *
 ******************************************************************************/

// Extract the land cover data within the AOI
//   during 2019-2022.
var studyPeriod_AOI_Filter = ee.Filter.and(
  ee.Filter.bounds(AOI_Geom),
  ee.Filter.calendarRange({
    start: startYear_Num, 
    end: endYear_Num, 
    field: "year"
  })
);

landCover_IC = landCover_IC
  .filter(studyPeriod_AOI_Filter);

// Determine the most common land cover type
//   at each pixel.
var landCover_10m_Img = landCover_IC
  .mode()
  .setDefaultProjection(prj_10m);


/*******************************************************************************
 * 2) Aggregate the land cover data to 30 m. *
 ******************************************************************************/

// "Mode" aggregation.
var landCover_30m_Img = landCover_10m_Img
  .reduceResolution({
    reducer: ee.Reducer.mode()
  })
  .reproject(prj_30m);

// Clip to the study area.
landCover_30m_Img = landCover_30m_Img
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "landCover_IC.first():",
    landCover_IC.first()
  );
  
  IMG_mod.Print_ImgInfo(
    "landCover_10m_Img:",
    landCover_10m_Img
  );
  
  IMG_mod.Print_ImgInfo(
    "landCover_30m_Img:",
    landCover_30m_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(landCover_10m_Img, 
    {
      min: 1,
      max: 11,
      palette: "0000FF, FFFFFF, FF0000"
    }, 
    "landCover_10m_Img");

  if (false) {
    // Check the annual land cover data.
    // var year_Num = 2019;
    // var year_Num = 2020;
    // var year_Num = 2021;
    var year_Num = 2022;
    
    var annual_LandCover_IC = landCover_IC.filter(
      ee.Filter.calendarRange({
        start: year_Num, 
        field: "year"
      })
    );
    
    print("landCover_IC:", 
      landCover_IC.size());
    
    print(year_Num + "-annual_LandCover_IC:", 
      annual_LandCover_IC.size());
    
    Map.addLayer(annual_LandCover_IC, 
      {
        min: 1,
        max: 11,
        palette: "0000FF, FFFFFF, FF0000"
      }, 
      "annual_LandCover_IC-" + year_Num);
  }
} else {
  
  // Output to Asset.
  var fileName_Str = "LandCover_ESRI";
  
  Export.image.toAsset({
    image: landCover_30m_Img, 
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

