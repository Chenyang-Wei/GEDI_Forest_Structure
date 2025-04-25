/*******************************************************************************
 * Introduction *
 * 
 *  1) Select the BCRs of interest.
 * 
 *  2) Merge the selected BCRs.
 * 
 * Last updated: 5/16/2024
 * 
 * Runtime: <1m
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Major working directories.
var wd_Root_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/";

var wd_Main_Str = wd_Root_Str
  + "Eastern_North_America/";


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Bird Conservation Regions (BCRs) in North America.
var BCRs_FC = ee.FeatureCollection(wd_Root_Str
  + "Data/Birds/BCR_Terrestrial_master_International");


/*******************************************************************************
 * 1) Select the BCRs of interest. *
 ******************************************************************************/

// Determine a List of BCR IDs.
var BCR_ID_List = [13, 14, 28, 29];

// Select the BCRs of interest.
var selected_BCRs_FC = BCRs_FC.filter(
  ee.Filter.and(
    ee.Filter.inList({
      leftField: "BCR", 
      rightValue: BCR_ID_List
    })
  )
);


/*******************************************************************************
 * 2) Merge the selected BCRs. *
 ******************************************************************************/

var studyArea_FC = selected_BCRs_FC.union();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  print("BCRs_FC:", 
    BCRs_FC.first(),
    BCRs_FC.size(),
    BCRs_FC.geometry().projection()); // EPSG:4326.
  
  print("selected_BCRs_FC:", 
    selected_BCRs_FC.aggregate_array("Label"));
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(selected_BCRs_FC, 6);
  
  Map.addLayer(BCRs_FC, 
    {
      color: "FFFFFF"
    }, 
    "BCRs_FC");

  Map.addLayer(studyArea_FC, 
    {
      color: "FF0000"
    }, 
    "studyArea_FC");

} else {
  
  // Output to Asset.
  var fileName_Str = "StudyArea_SelectedBCRs";
  
  Export.table.toAsset({
    collection: studyArea_FC, 
    description: fileName_Str, 
    assetId: wd_Main_Str
      + "Study_Domain/"
      + fileName_Str
  });
}

