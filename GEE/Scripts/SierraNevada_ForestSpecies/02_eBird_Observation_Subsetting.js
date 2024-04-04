/*******************************************************************************
 * Introduction *
 * 
 *  1) Create and split a grid
 * 
 *  2) Buffer and subset the eBird observations
 * 
 * Updated: 3/25/2024
 * 
 * Runtime: 2m
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Set a seed.
var seed_Num = 17;

// Proportion of the training dataset.
var split_Num = 0.75;

// Grid scale.
var gridScale_Num = 3e4;

// Buffer radius.
var radius_Num = 1.5e3;

// Study area.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  "users/Chenyang_Wei/" 
  + "LiDAR-Birds/SierraNevada_US/"
  + "Sierra_Nevada_US_GMBAv2_Standard"
).first()).geometry();

var AOI = studyArea_Geom.bounds();


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

// Add a column of "Type".
var Add_Type = function(ftr) {
  return ftr.set({
    Type: type_Str
  });
};

// Buffer the point Features.
var Buffer_Pts = function(pt_Ftr) {
  return pt_Ftr.buffer(radius_Num);
};


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
 * 1) Create and split a grid *
 ******************************************************************************/

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


/*******************************************************************************
 * 2) Buffer and subset the eBird observations *
 ******************************************************************************/

var type_Str;

// Training.
type_Str = "training";

var trainingObs_FC = allSpecies_FC
  .filterBounds(trainingGrid_FC)
  .map(Add_Type);

// Test.
type_Str = "test";

var testObs_FC = allSpecies_FC
  .filterBounds(testGrid_FC)
  .map(Add_Type);

// Buffer the point Features.
trainingObs_FC = trainingObs_FC.map(Buffer_Pts);

testObs_FC = testObs_FC.map(Buffer_Pts);


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  print("Grid cell #:", Grid_FC.size()); // 136.
  
  print("Sample sizes:", 
    trainingObs_FC.size(), // 565450.
    testObs_FC.size(), // 208050.
    allSpecies_FC.size() // 773500.
  );
  
  print("Data preview:", 
    trainingObs_FC.first(),
    testObs_FC.first()
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  
  Map.addLayer(AOI, 
    {
      color: "FFFFFF"
    }, 
    "AOI");
  
  Map.addLayer(studyArea_Geom, 
    {
      color: "0000FF"
    }, 
    "studyArea_Geom");
  
  Map.addLayer(Grid_FC, 
    {
      color: "228B22"
    }, 
    "Grid_FC");
  
  Map.addLayer(trainingGrid_FC, 
    {
      color: "FF0000"
    }, 
    "trainingGrid_FC");
  
  Map.addLayer(testGrid_FC, 
    {
      color: "00FFFF"
    }, 
    "testGrid_FC");
  
} else {
  
  //// Output to Asset.
  var fileName;
  
  // Training.
  fileName = "Buffered_TrainingObs_SubSampled";
  
  Export.table.toAsset({
    collection: trainingObs_FC, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Modeling/"
      + fileName
  });
  
  // Test.
  fileName = "Buffered_TestObs_SubSampled";
  
  Export.table.toAsset({
    collection: testObs_FC, 
    description: fileName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Modeling/"
      + fileName
  });
}

