/*******************************************************************************
 * Introduction *
 * 
 *  1) Operation #1.
 * 
 *  2) Operation #2.
 * 
 *  3) Operation #3.
 * 
 * Updated: 2/8/2024.
 * 
 * Runtime: N/A.
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

// Load the EC JRC global map of forest cover 2020, V1.
var forest_Img = ee.ImageCollection("JRC/GFC2020/V1")
  .mosaic();

// Load the US Census States 2018.
var US_states_FC = ee.FeatureCollection("TIGER/2018/States");


/*******************************************************************************
 * 1) Operation #1 *
 ******************************************************************************/

// Select the state of California.
var CA_Ftr = US_states_FC.filter(
  ee.Filter.eq({
    name: "NAME", 
    value: "California"
  })
).first();

// Select the state of Ohio.
var OH_Ftr = US_states_FC.filter(
  ee.Filter.eq({
    name: "NAME", 
    value: "Ohio"
  })
).first();


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
  print(forest_Img);
  print(CA_Ftr);
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.setCenter(-99.342, 38.57, 5);
  
  Map.addLayer(ee.FeatureCollection([CA_Ftr]), 
    {
      color: "FFFFFF"
    }, 
    "California");
  
  Map.addLayer(ee.FeatureCollection([OH_Ftr]), 
    {
      color: "FFFFFF"
    }, 
    "Ohio");
  
  Map.addLayer(forest_Img, 
    {
      bands: ["Map"],
      palette: ["228B22"]
    }, 
    "Forest");
  
} else {
  
  // Output to Asset.
  
  var fileName = "HybasSampled_ATETs";
  
  Export.table.toAsset({
    collection: sampled_Transects, 
    description: fileName, 
    assetId: GATE.wd_Global 
      + "Elevational_Transects/"
      + "Validation/"
      + fileName
  });
  
  // Output to Drive.
  
  var fileName = "HybasSampled_ATETs";
  
  Export.table.toDrive({
    collection: sampled_Transects, 
    description: fileName, 
    folder: fileName, 
    fileFormat: "SHP"
  });
}
