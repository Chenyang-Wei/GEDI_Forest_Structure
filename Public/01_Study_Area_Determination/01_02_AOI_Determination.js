/*******************************************************************************
 * Introduction *
 * 
 *  1) Compare the study domain with the ecoregions of 
 *     "Temperate Broadleaf & Mixed Forests".
 * 
 *  2) Determine a rectangular area of interest.
 * 
 * Last updated: 5/29/2024
 * 
 * Runtime: N/A
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

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

// RESOLVE Ecoregions 2017.
var ecoregions_FC = ee.FeatureCollection("RESOLVE/ECOREGIONS/2017");

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs");


/*******************************************************************************
 * 1) Compare the study domain with the ecoregions of 
 *    "Temperate Broadleaf & Mixed Forests". *
 ******************************************************************************/

// Select the ecoregions of interest.
var selected_Ecoregions_FC = ecoregions_FC.filter(
  ee.Filter.and(
    ee.Filter.stringContains({
      leftField: "BIOME_NAME", 
      rightValue: "Temperate Broadleaf & Mixed Forests"
    })
  )
);


/*******************************************************************************
 * 2) Determine a rectangular area of interest. *
 ******************************************************************************/

// Buffer the study area.
var bufferSize_Num = 30e3; // Same as the tile size.

var buffered_StudyArea_FC = ee.Feature(studyArea_FC.first())
  .buffer(bufferSize_Num)
  .geometry();

// Generate a bounding box of the buffered study area.
var AOI_Geom = buffered_StudyArea_FC.bounds();

print("AOI_Geom:", AOI_Geom);

// Load the saved AOI.
var saved_AOI_Geom = ENA_mod.AOI_Geom;


/*******************************************************************************
 * Results *
 ******************************************************************************/

var vis = true; // true OR false.

if (vis) {
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(studyArea_FC, 6);
  
  print("studyArea_FC:", studyArea_FC);
  
  Map.addLayer(selected_Ecoregions_FC, 
    {
      color: "FFFFFF"
    }, 
    "selected_Ecoregions_FC");

  Map.addLayer(AOI_Geom, 
    {
      color: "0000FF"
    }, 
    "AOI_Geom");

  Map.addLayer(saved_AOI_Geom, 
    {
      color: "FFFF00"
    }, 
    "saved_AOI_Geom");

  Map.addLayer(studyArea_FC, 
    {
      color: "FF0000"
    }, 
    "studyArea_FC");
}

