/*******************************************************************************
 * Introduction *
 * 
 *  1) Variable sampling
 * 
 * Updated: 3/11/2024
 * 
 * Runtime: 1m ~ 7m
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Training vs. test (true OR false).
var training = true;

// Projection information.
var newPrj = {
  crs: "EPSG:4326",
  scale: 3e3
};


/*******************************************************************************
 * Functions *
 ******************************************************************************/


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// eBird observations.
var fileName;

if (training) {
  fileName = "trainingObs_AllSpecies";
} else {
  fileName = "testObs_AllSpecies";
}

var allSpecies_FC = ee.FeatureCollection(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Modeling/"
    + fileName
);

// Aggregated variables.
var aggregatedVars_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Aggregated_Vars/"
    + "aggregatedVars_3km"
);


/*******************************************************************************
 * 1) Variable sampling *
 ******************************************************************************/

// Rename a few bands for shapefile output requirement.
var oldBandNames_List = aggregatedVars_Img.bandNames();

var toChange_List = [
  "fhd_normal_mean",
  "fhd_normal_stdDev",
  "elevation_mean",
  "elevation_stdDev"
];

var changed_List = [
  "fhd_mean",
  "fhd_stdDev",
  "elv_mean",
  "elv_stdDev"
];

var noChange_List = oldBandNames_List
  .removeAll(toChange_List);

oldBandNames_List = noChange_List
  .cat(toChange_List);

var newBandNames_List = noChange_List
  .cat(changed_List);

aggregatedVars_Img = aggregatedVars_Img
  .select(oldBandNames_List, newBandNames_List);

// Sample variables.
var sampledVars_FC = aggregatedVars_Img.reduceRegions({
  collection: allSpecies_FC, 
  reducer: ee.Reducer.first(), 
  scale: newPrj.scale, 
  crs: newPrj.crs
});


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  print("Combination result:", 
    aggregatedVars_Img.bandNames());
  
  print("allSpecies_FC:",
    allSpecies_FC.first(),
    allSpecies_FC.size());
  
  print("sampledVars_FC:",
    sampledVars_FC.first(),
    sampledVars_FC.size());
  
} else {
  
  var outputName;
  
  if (training) {
    outputName = "trainingVars_AllSpecies";
  } else {
    outputName = "testVars_AllSpecies";
  }

  // Output to Asset.
  Export.table.toAsset({
    collection: sampledVars_FC, 
    description: outputName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Modeling/"
      + outputName
  });
  
  // Output to Drive.
  Export.table.toDrive({
    collection: sampledVars_FC, 
    description: outputName, 
    folder: outputName, 
    fileFormat: "SHP"
  });
}

