/*******************************************************************************
 * Introduction *
 * 
 *  1) Rename the soil properties of the randomly collected samples 
 *     to meet the naming requirement of shapefiles.
 * 
 *  2) Rename some other properties.
 * 
 *  3) Export the results to Google Drive.
 * 
 * Last updated: 9/10/2024
 * 
 * Runtime: 7m
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_EO_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Randomly collected samples.
var collectedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "CollectedSamples_10perCell"
);


/*******************************************************************************
 * 1) Rename the soil properties of the randomly collected samples 
 *    to meet the naming requirement of shapefiles. *
 ******************************************************************************/

// All property names.
var all_PropertyNames_List = collectedSamples_FC
  .first().propertyNames()
  .remove("system:index");

var old_SoilNames_List = ee.List([]);

var new_SoilNames_List = ee.List([]);

// Top-soil properties.
var layerName_Str = "0-5cm_mean";

var layerID_Str = "1";

var old_SoilLayer_List = all_PropertyNames_List
  .filter(
    ee.Filter.stringContains({
      leftField: "item", 
      rightValue: layerName_Str
    })
  );

var new_SoilLayer_List = old_SoilLayer_List.map(
  function Rename_Soil(old_SoilName_Str) {
    old_SoilName_Str = ee.String(old_SoilName_Str);
    
    var new_SoilName_Str = old_SoilName_Str
      .slice({
        start: 0,
        end: old_SoilName_Str.index(layerName_Str)
      });
    
    new_SoilName_Str = new_SoilName_Str
      .cat(layerID_Str);
    
    return new_SoilName_Str;
  });

old_SoilNames_List = old_SoilNames_List
  .cat(old_SoilLayer_List);

new_SoilNames_List = new_SoilNames_List
  .cat(new_SoilLayer_List);

// Middle-soil properties.
var layerName_Str = "5-15cm_mean";

var layerID_Str = "2";

var old_SoilLayer_List = all_PropertyNames_List
  .filter(
    ee.Filter.stringContains({
      leftField: "item", 
      rightValue: layerName_Str
    })
  );

var new_SoilLayer_List = old_SoilLayer_List.map(
  function Rename_Soil(old_SoilName_Str) {
    old_SoilName_Str = ee.String(old_SoilName_Str);
    
    var new_SoilName_Str = old_SoilName_Str
      .slice({
        start: 0,
        end: old_SoilName_Str.index(layerName_Str)
      });
    
    new_SoilName_Str = new_SoilName_Str
      .cat(layerID_Str);
    
    return new_SoilName_Str;
  });

old_SoilNames_List = old_SoilNames_List
  .cat(old_SoilLayer_List);

new_SoilNames_List = new_SoilNames_List
  .cat(new_SoilLayer_List);

// Bottom-soil properties.
var layerName_Str = "15-30cm_mean";

var layerID_Str = "3";

var old_SoilLayer_List = all_PropertyNames_List
  .filter(
    ee.Filter.stringContains({
      leftField: "item", 
      rightValue: layerName_Str
    })
  );

var new_SoilLayer_List = old_SoilLayer_List.map(
  function Rename_Soil(old_SoilName_Str) {
    old_SoilName_Str = ee.String(old_SoilName_Str);
    
    var new_SoilName_Str = old_SoilName_Str
      .slice({
        start: 0,
        end: old_SoilName_Str.index(layerName_Str)
      });
    
    new_SoilName_Str = new_SoilName_Str
      .cat(layerID_Str);
    
    return new_SoilName_Str;
  });

old_SoilNames_List = old_SoilNames_List
  .cat(old_SoilLayer_List);

new_SoilNames_List = new_SoilNames_List
  .cat(new_SoilLayer_List);

// Single-layer property.
var old_SingleLayer_Str = "ocs_0-30cm_mean";
var new_SingleLayer_Str = "ocs_4";

old_SoilNames_List = old_SoilNames_List
  .add(old_SingleLayer_Str);

new_SoilNames_List = new_SoilNames_List
  .add(new_SingleLayer_Str);


/*******************************************************************************
 * 2) Rename some other properties. *
 ******************************************************************************/

// Old property names.
var old_PropertyNames_List = ee.List([
  "PAVD_0_10m", "PAVD_10_20m", "PAVD_20_30m", 
  "PAVD_30_40m", "PAVD_40_50m", "PAVD_50_60m", 
  "PAVD_over60m",
  "fhd_normal", 
  "VH_VV_ratio",
  "Brightness", "Greenness", "Wetness",
  "S2_Brightness", "S2_Greenness", "S2_Wetness",
  "LandCover_GLC", "LandCover_ESRI",
  "North-southness", "East-westness",
  "Topo_Diversity",
  "Pixel_Label"
]);

old_PropertyNames_List = old_PropertyNames_List
  .cat(old_SoilNames_List);

// New property names.
var new_PropertyNames_List = ee.List([
  "PAVD0_10", "PAVD10_20", "PAVD20_30", 
  "PAVD30_40", "PAVD40_50", "PAVD50_60", 
  "PAVD_ov60",
  "fhd", 
  "VH_VV",
  "Bright", "Green", "Wet",
  "S2_Bright", "S2_Green", "S2_Wet",
  "LC_GLC", "LC_ESRI",
  "N_S", "E_W",
  "Topo_Div",
  "Px_Label"
]);

new_PropertyNames_List = new_PropertyNames_List
  .cat(new_SoilNames_List);

// Unchanged property names.
var unchanged_PropertyNames_List = all_PropertyNames_List
  .removeAll(old_PropertyNames_List);

// Rename the selected properties.
old_PropertyNames_List = unchanged_PropertyNames_List
  .cat(old_PropertyNames_List);

new_PropertyNames_List = unchanged_PropertyNames_List
  .cat(new_PropertyNames_List);

var renamed_CollectedSamples_FC = collectedSamples_FC
  .select({
    propertySelectors: old_PropertyNames_List, 
    newProperties: new_PropertyNames_List
  });


/*******************************************************************************
 * 3) Export the results to Google Drive. *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  print("collectedSamples_FC:",
    all_PropertyNames_List, // 113 elements.
    collectedSamples_FC.size()); // 16930.
  
  print("Soil properties:",
    old_SoilNames_List,
    new_SoilNames_List);
  
  print("All the properties to rename:",
    old_PropertyNames_List,
    new_PropertyNames_List);
  
  print("renamed_CollectedSamples_FC:",
    renamed_CollectedSamples_FC.first(),
    renamed_CollectedSamples_FC.size());
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(collectedSamples_FC, 
    {
      color: "FF0000"
    }, 
    "collectedSamples_FC");

} else {
  
  /****** Export the result(s). ******/
  
  var fileName_Str = 
    "CollectedSamples_10perCell";
  
  // Output to Drive.
  Export.table.toDrive({
    collection: renamed_CollectedSamples_FC, 
    description: fileName_Str, 
    folder: fileName_Str, 
    fileFormat: "SHP"
  });
}

