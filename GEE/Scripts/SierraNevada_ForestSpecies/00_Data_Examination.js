/*******************************************************************************
 * Introduction *
 * 
 *  1) Examine the sub-sampled observations
 * 
 * Updated: 3/26/2024
 * 
 * Runtime: N/A
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/


/*******************************************************************************
 * Objects *
 ******************************************************************************/


/*******************************************************************************
 * Functions *
 ******************************************************************************/


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// eBird observations.
var allSpecies_FC = ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "allSpecies_SubSampled"
);

/*******************************************************************************
 * 1) Examine the sub-sampled observations *
 ******************************************************************************/

// Extract the data of a single year.
var obs_2019_FC = allSpecies_FC.filter(
  ee.Filter.eq({
    name: "year", 
    value: 2019
  })
);

print(obs_2019_FC.aggregate_array(""))


/*******************************************************************************
 * 2) Operation #2 *
 ******************************************************************************/


/*******************************************************************************
 * 3) Operation #3 *
 ******************************************************************************/


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  // Check the result(s).
  print();
  
  // Visualization.
  Map.setOptions("Satellite");
  
  // // Add a FeatureCollection to the map.
  // Map.addLayer(CA_FC, 
  //   {
  //     color: "FF0000"
  //   }, 
  //   "California");

  // // Add an Image to the map.
  // Map.addLayer(example_Img, 
  //   {
  //     bands: ["bandName"],
  //     palette: ["228B22"]
  //   }, 
  //   "Forest");
  
} else {
  
  //// Output to Asset.
  
  var fileName = "HybasSampled_ATETs";
  
  // Feature Collection.
  Export.table.toAsset({
    collection: sampled_Transects, 
    description: fileName, 
    assetId: GATE.wd_Global 
      + "Elevational_Transects/"
      + "Validation/"
      + fileName
  });
  
  // Image.
  Export.image.toAsset({
    image: cover_aggr, 
    description: "cover_aggr", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/cover_aggr", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
  
  //// Output to Drive.
  
  var fileName = "HybasSampled_ATETs";
  
  // Feature Collection.
  Export.table.toDrive({
    collection: sampled_Transects, 
    description: fileName, 
    folder: fileName, 
    fileFormat: "SHP"
  });
}

