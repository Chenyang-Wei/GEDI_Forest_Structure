/*******************************************************************************
 * Introduction *
 * 
 *  1) Setup
 * 
 *  2) Define Area of Interest
 * 
 *  3) Selecting Predictor Variables
 * 
 *  4) Defining blocks to fold randomly for cross validation
 * 
 *  5) Fitting SDM models
 * 
 *  6) Extracting and displaying model prediction results
 * 
 *  7) Accuracy assessment
 * 
 * Updated: 2/26/2024
 * 
 * Runtime: N/A
 * 
 * @author Chenyang Wei (wei.1504@osu.edu)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var VIS = require(
  "users/ChenyangWei/Public:Modules/General/Visualization.js");

var IMG = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Define spatial resolution to work with in meters.
var GrainSize = 3e3;

// Define a testing area.
var testing = ee.Geometry.Polygon(
        [[[-120.77774115591443, 40.23745729400148],
          [-120.77774115591443, 38.35873575869755],
          [-120.09658881216443, 38.35873575869755],
          [-120.09658881216443, 40.23745729400148]]], null, false);

var GEDI_crs = {
  crs: "EPSG:4326",
  scale: 25
};

/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Define a function to create a grid over AOI.
function makeGrid(geometry, scale) {
  
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
    })
    .filterBounds(geometry);
}

// Define a function to generate a vector of 
//  random numbers between 1 and 1000.
function runif(length) {
    return Array.apply(null, Array(length)).map(function() {
        return Math.round(Math.random() * (1000 - 1) + 1);
    });
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Load the detection/non-detection eBird data.
var Data = ee.FeatureCollection("users/Chenyang_Wei/" 
  + "LiDAR-Birds/Preliminary/Mountain_Bluebird_CA")
  .filterBounds(testing);

// Non-detection.
var nonDetection = Data.filter(ee.Filter.eq("Detectn", 0));

// Detection.
var detection = Data.filter(ee.Filter.eq("Detectn", 1));

print(
  "Data size:", Data.size(),
  "Non-detection:", nonDetection.size(),
  "Detection:", detection.size());

// Load the US Census States 2018.
var studyArea_FC = ee.FeatureCollection("TIGER/2018/States").filter(
  ee.Filter.inList({
    leftField: "NAME", 
    rightValue: ["California"]
  }));


/*******************************************************************************
 * 1) Setup *
 ******************************************************************************/

// Add two maps to the screen.
var left = ui.Map();
var right = ui.Map();

ui.root.clear();
ui.root.add(left);
ui.root.add(right);

// Link the two maps.
ui.Map.Linker([left, right], "change-bounds");


/*******************************************************************************
 * 2) Define Area of Interest *
 ******************************************************************************/

// Define the AOI.
// var AOI = Data.geometry().bounds().buffer(GrainSize * 10);
var AOI = testing.buffer(GrainSize);

// Add border of study area to the map.
var outline = ee.Image().byte().paint({
  featureCollection: AOI, width: 3});


/*******************************************************************************
 * 3) Selecting Predictor Variables *
 ******************************************************************************/

// Combined filter.
var combined_Filter = ee.Filter.and(
  ee.Filter.bounds(AOI),
  ee.Filter.calendarRange({
    start: 2019, 
    end: 2022, 
    field: "year"
  }),
  ee.Filter.calendarRange({
    start: 6, 
    end: 8, 
    field: "month"
  })
);


//// Environmental variables.
// Load elevation data from the data catalog.
var Terrain = ee.Algorithms.Terrain(
  ee.Image("USGS/SRTMGL1_003"));

// Calculate slope, aspect, and a simple hillshade from the terrain Digital Elevation Model.
Terrain = Terrain.select([
  "elevation",
  "slope",
  "aspect"
]);

// Load 250-m MODIS NDVI collection.
var MODIS = ee.ImageCollection("MODIS/006/MOD13Q1")
  .filter(combined_Filter);

// Estimate median NDVI value per pixel.
var MedianNDVI = MODIS
  .select(["NDVI"]).median();

// Combine bands into a single image.
var predictors = Terrain
  .addBands(MedianNDVI)
  .clip(AOI);

// Select bands for modeling.
var bands = [
  "elevation", "slope", "aspect",
  "NDVI"
];
predictors = predictors.select(bands);


//// GEDI variables.
// Level-2B.
var qualityMask_L2B = function(im) {
  return im.updateMask(im.select('l2b_quality_flag').eq(1))
      .updateMask(im.select('degrade_flag').eq(0));
};
var GEDI_L2B = 
  ee.ImageCollection('LARSE/GEDI/GEDI02_B_002_MONTHLY')
    .filter(combined_Filter)
    .map(qualityMask_L2B);
var pai = GEDI_L2B
  .select('pai')
  .median()
  .reproject(GEDI_crs); // Total Plant Area Index.

if (false) {
  
  // Level-2A.
  var qualityMask_L2A = function(im) {
    return im.updateMask(im.select('quality_flag').eq(1))
        .updateMask(im.select('degrade_flag').eq(0));
  };
  var rh98 = 
    ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY')
      .filter(combined_Filter)
      .map(qualityMask_L2A)
      .select('rh98')
      .median()
      .reproject(GEDI_crs);

  // Level-2B.
  var cover = GEDI_L2B
    .select('cover')
    .median()
    .reproject(GEDI_crs); // Total canopy cover.
  var fhd_normal = GEDI_L2B
    .select('fhd_normal')
    .median()
    .reproject(GEDI_crs); // Foliage Height Diversity.
  var pgap_theta = GEDI_L2B
    .select('pgap_theta')
    .median()
    .reproject(GEDI_crs); // Total Gap Probability (theta).
  
  // Variable aggregation.
  var rh98_aggr = IMG.Aggregate_Pixels(
    rh98, 25, 
    ee.Reducer.mean(), 
    GrainSize, "EPSG:4326");
  var cover_aggr = IMG.Aggregate_Pixels(
    cover, 25, 
    ee.Reducer.mean(), 
    GrainSize, "EPSG:4326");
  var fhd_normal_aggr = IMG.Aggregate_Pixels(
    fhd_normal, 25, 
    ee.Reducer.mean(), 
    GrainSize, "EPSG:4326");
  var pai_aggr = IMG.Aggregate_Pixels(
    pai, 25, 
    ee.Reducer.mean(), 
    GrainSize, "EPSG:4326");
  var pgap_theta_aggr = IMG.Aggregate_Pixels(
    pgap_theta, 25, 
    ee.Reducer.mean(), 
    GrainSize, "EPSG:4326");
  
  Export.image.toAsset({
    image: rh98_aggr, 
    description: "rh98_aggr", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/rh98_aggr", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
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
  
  Export.image.toAsset({
    image: fhd_normal_aggr, 
    description: "fhd_normal_aggr", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/fhd_normal_aggr", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: pai_aggr, 
    description: "pai_aggr", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/pai_aggr", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: pgap_theta_aggr, 
    description: "pgap_theta_aggr", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/pgap_theta_aggr", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
  // Export.image.toAsset({
  //   image: predictors_GEDI, 
  //   description: "predictors_GEDI_CA", 
  //   assetId: "users/Chenyang_Wei/" 
  //     + "LiDAR-Birds/Preliminary/predictors_GEDI_CA", 
  //   region: AOI, 
  //   scale: GrainSize,  
  //   crs: "EPSG:4326",
  //   maxPixels: 1e13
  // });
  
} else {
  
  // Load the generated GEDI variables.
  var rh98_aggr = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/rh98_aggr"
  );
  var cover_aggr = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/cover_aggr"
  );
  var fhd_normal_aggr = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/fhd_normal_aggr"
  );
  var pai_aggr = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/pai_aggr"
  );
  var pgap_theta_aggr = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/pgap_theta_aggr"
  );
  
  // Combine bands into a single image.
  var predictors_GEDI = rh98_aggr
    .addBands(cover_aggr)
    .addBands(fhd_normal_aggr)
    .addBands(pai_aggr)
    .addBands(pgap_theta_aggr);
  
  // Select bands for modeling.
  var bands_GEDI = [
    "rh98", 
    "cover", "fhd_normal", "pai", "pgap_theta"
  ];
  
  predictors_GEDI = predictors_GEDI.select(bands_GEDI);
}


//// Estimate correlation among predictor variables.
// Extract local covariate values from multi-band predictor image 
//  at 5000 random points.
var PixelVals = predictors.sample({
  scale: GrainSize, 
  numPixels: 5000, 
  geometries: true
}); // Generate 5000 random points.

var PixelVals_GEDI = predictors_GEDI.sample({
  scale: GrainSize, 
  numPixels: 5000, 
  geometries: true
}); // Generate 5000 random points.

// Check all pairwise correlations.
//  (Map the reduceColumns function across 
//  all pairwise combinations of predictors.)
var CorrAll = predictors.bandNames().map(function(i){
    var tmp1 = predictors.bandNames().map(function(j){
      var tmp2 = PixelVals.reduceColumns({
        reducer: ee.Reducer.spearmansCorrelation(),
        selectors: [i, j]
      });
    return tmp2.get("correlation");
    });
    return tmp1;
  });

var CorrAll_GEDI = predictors_GEDI.bandNames().map(function(i){
    var tmp1 = predictors_GEDI.bandNames().map(function(j){
      var tmp2 = PixelVals_GEDI.reduceColumns({
        reducer: ee.Reducer.spearmansCorrelation(),
        selectors: [i, j]
      });
    return tmp2.get("correlation");
    });
    return tmp1;
  });

// print("Variables correlation matrix", CorrAll);
// print("Variables correlation matrix (GEDI)", 
//   CorrAll_GEDI);


/*******************************************************************************
* 4) Defining blocks to fold randomly for cross validation *
******************************************************************************/

// Set range in meters to create spatial blocks.
var Scale = GrainSize * 10;

// Create grid and remove cells outside AOI.
var Grid = makeGrid(AOI, Scale);
Grid = Grid
  .filterBounds(studyArea_FC);

// Create a grid with cells at the grain size.
var Grid_GrainSize = makeGrid(AOI, GrainSize);
Grid_GrainSize = Grid_GrainSize
  .filterBounds(studyArea_FC);


/*******************************************************************************
* 5) Fitting SDM models *
******************************************************************************/

//// Define a SDM function.
function SDM(x) {
  
  var Seed = ee.Number(x);
  
  // Randomly split blocks for training and validation.
  var GRID = Grid
    .randomColumn({seed: Seed})
    .sort("random");
  
  var TrainingGrid = GRID
    .filter(
      ee.Filter.lt("random", split));
  
  var TestingGrid = GRID
    .filter(
      ee.Filter.gte("random", split));

  // Presence.
  var PresencePoints = detection; // Filter all presence points.
  
  var TrPresencePoints = PresencePoints
    .filterBounds(TrainingGrid);
  
  var TePresencePoints = PresencePoints
    .filterBounds(TestingGrid);

  // Absence.
  var AbsPoints = nonDetection; // Filter all absence points.
  
  var TrAbsencePoints = AbsPoints
    .filterBounds(TrainingGrid);
  
  var TeAbsencePoints = AbsPoints
    .filterBounds(TestingGrid);

  // Merge points.
  var trainingPartition = TrPresencePoints
    .merge(TrAbsencePoints);
  
  var testingPartition = TePresencePoints
    .merge(TeAbsencePoints);
  
  // Extract local covariate values from multiband predictor image 
  //  at training points.
  var trainPixelVals = predictors
    .sampleRegions({
      collection: trainingPartition, 
      properties: ["Detectn"], 
      scale: GrainSize,
      tileScale: 16
    });

  // Classify using random forest.
  var Classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 500, // The number of decision trees to create.
    variablesPerSplit: null, // The number of variables per split. If unspecified, uses the square root of the number of variables.
    minLeafPopulation: 10, // Only create nodes whose training set contains at least this many points. Integer, default: 1
    bagFraction: 0.5, // The fraction of input to bag per tree. Default: 0.5.
    maxNodes: null, // The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
    seed: Seed // The randomization seed.
  });
  
  // Presence probability.
  var ClassifierPr = Classifier
    .setOutputMode("PROBABILITY")
    .train(trainPixelVals, "Detectn", bands); 

  var ClassifiedImgPr = predictors
    .select(bands)
    .classify(ClassifierPr);
  
  // Binary presence/absence map.
  var ClassifierBin = Classifier
    .setOutputMode("CLASSIFICATION")
    .train(trainPixelVals, "Detectn", bands); 
  
  var ClassifiedImgBin = predictors
    .select(bands)
    .classify(ClassifierBin);
 
  return ee.List([
    ClassifiedImgPr, 
    ClassifiedImgBin, 
    trainingPartition, 
    testingPartition]);
}

function SDM_GEDI(x) {
  
  var Seed = ee.Number(x);
  
  // Randomly split blocks for training and validation.
  var GRID = Grid
    .randomColumn({seed: Seed})
    .sort("random");
  
  var TrainingGrid = GRID
    .filter(
      ee.Filter.lt("random", split));
  
  var TestingGrid = GRID
    .filter(
      ee.Filter.gte("random", split));

  // Presence.
  var PresencePoints = detection; // Filter all presence points.
  
  var TrPresencePoints = PresencePoints
    .filterBounds(TrainingGrid);
  
  var TePresencePoints = PresencePoints
    .filterBounds(TestingGrid);

  // Absence.
  var AbsPoints = nonDetection; // Filter all absence points.
  
  var TrAbsencePoints = AbsPoints
    .filterBounds(TrainingGrid);
  
  var TeAbsencePoints = AbsPoints
    .filterBounds(TestingGrid);

  // Merge points.
  var trainingPartition = TrPresencePoints
    .merge(TrAbsencePoints);
  
  var testingPartition = TePresencePoints
    .merge(TeAbsencePoints);
  
  // Extract local covariate values from multiband predictor image 
  //  at training points.
  var trainPixelVals = predictors_GEDI
    .sampleRegions({
      collection: trainingPartition, 
      properties: ["Detectn"], 
      scale: GrainSize,
      tileScale: 16
    });

  // Classify using random forest.
  var Classifier = ee.Classifier.smileRandomForest({
    numberOfTrees: 500, // The number of decision trees to create.
    variablesPerSplit: null, // The number of variables per split. If unspecified, uses the square root of the number of variables.
    minLeafPopulation: 10, // Only create nodes whose training set contains at least this many points. Integer, default: 1
    bagFraction: 0.5, // The fraction of input to bag per tree. Default: 0.5.
    maxNodes: null, // The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
    seed: Seed // The randomization seed.
  });
  
  // Presence probability.
  var ClassifierPr = Classifier
    .setOutputMode("PROBABILITY")
    .train(trainPixelVals, "Detectn", bands_GEDI); 

  var ClassifiedImgPr = predictors_GEDI
    .select(bands_GEDI)
    .classify(ClassifierPr);
  
  // Binary presence/absence map.
  var ClassifierBin = Classifier
    .setOutputMode("CLASSIFICATION")
    .train(trainPixelVals, "Detectn", bands_GEDI); 
  
  var ClassifiedImgBin = predictors_GEDI
    .select(bands_GEDI)
    .classify(ClassifierBin);
 
  return ee.List([
    ClassifiedImgPr, 
    ClassifiedImgBin, 
    trainingPartition, 
    testingPartition]);
}

// Define partition for training and testing data.
var split = 0.70;  // The proportion of the blocks used to select training data.

// Define number of repetitions.
var numiter = 10;

//// Fit SDM.
// Create random seeds.
var RanSeeds = runif(numiter);

var results = ee.List(RanSeeds)
  .map(SDM).flatten();
var results_GEDI = ee.List(RanSeeds)
  .map(SDM_GEDI).flatten();

// print(results);
// print(results_GEDI);


/*******************************************************************************
* 6) Extracting and displaying model prediction results *
******************************************************************************/

//// Habitat suitability.
// Extract all model predictions.
var images = ee.List.sequence({
  start: 0, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results.get(x);
});

var images_GEDI = ee.List.sequence({
  start: 0, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results_GEDI.get(x);
});

if (false) {
  // Calculate mean of all individual model runs.
  var ModelAverage = 
    ee.ImageCollection.fromImages(images)
      .mean();
  
  var ModelAverage_GEDI = 
    ee.ImageCollection.fromImages(images_GEDI)
      .mean();

  Export.image.toAsset({
    image: ModelAverage, 
    description: "Average_Habitat_Suitability", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/Average_Habitat_Suitability", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: ModelAverage_GEDI, 
    description: "Average_Habitat_Suitability_GEDI", 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/Average_Habitat_Suitability_GEDI", 
    region: AOI, 
    scale: GrainSize,  
    crs: "EPSG:4326",
    maxPixels: 1e13
  });
  
} else {
  
  // Load the estimated "Average Habitat Suitability".
  var ModelAverage = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/Average_Habitat_Suitability"
  );
  var ModelAverage_GEDI = ee.Image(
    "users/Chenyang_Wei/" 
      + "LiDAR-Birds/Preliminary/Average_Habitat_Suitability_GEDI"
  );
}


//// Distribution map.
// Extract all model predictions.
var images2 = ee.List.sequence({
  start: 1, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results.get(x);
});

var images2_GEDI = ee.List.sequence({
  start: 1, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results_GEDI.get(x);
});


/*******************************************************************************
* 7) Accuracy assessment *
******************************************************************************/

// Extract testing/validation datasets
var TestingDatasets = ee.List.sequence({
  start: 3, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x){
  return results.get(x);
});

var TestingDatasets_GEDI = ee.List.sequence({
  start: 3, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x){
  return results_GEDI.get(x);
});

// // Double check the number of points for model validation.
// print("Number of presence and absence points for model validation:", 
//   ee.List.sequence(0, ee.Number(numiter).subtract(1), 1).map(function(x) {
//     return ee.List([
//       ee.FeatureCollection(TestingDatasets.get(x))
//         .filter(ee.Filter.eq("Detectn", 1)).size(),
//       ee.FeatureCollection(TestingDatasets.get(x))
//         .filter(ee.Filter.eq("Detectn", 0)).size()
//     ]);
//   })
// );

// Define functions to estimate accuracy.
function estimateAccuracy(x) {
  var occurance_Map = ee.Image(images2.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var occurance_Vals = occurance_Map.sampleRegions({
    collection: TData, 
    properties: ["Detectn"], 
    scale: GrainSize,
    tileScale: 16
  });
  
  occurance_Vals = occurance_Vals.map(function(pt) {
    var obs = pt.get("Detectn");
    var est = pt.get("classification");
    var sum = ee.Number(obs).add(est);
    
    return pt.set({
      incorrect: sum
    });
  });
  
  var correct_Num = occurance_Vals.filter(
    ee.Filter.neq("incorrect", 1)
  ).size();
  
  var total_Num = occurance_Vals.size();
  
  var correct_Rate = correct_Num
    .divide(total_Num);
  
  return correct_Rate;
}

function estimateAccuracy_GEDI(x) {
  var occurance_Map = ee.Image(images2_GEDI.get(x));
  var TData = ee.FeatureCollection(TestingDatasets_GEDI.get(x));
  var occurance_Vals = occurance_Map.sampleRegions({
    collection: TData, 
    properties: ["Detectn"], 
    scale: GrainSize,
    tileScale: 16
  });
  
  occurance_Vals = occurance_Vals.map(function(pt) {
    var obs = pt.get("Detectn");
    var est = pt.get("classification");
    var sum = ee.Number(obs).add(est);
    
    return pt.set({
      incorrect: sum
    });
  });
  
  var correct_Num = occurance_Vals.filter(
    ee.Filter.neq("incorrect", 1)
  ).size();
  
  var total_Num = occurance_Vals.size();
  
  var correct_Rate = correct_Num
    .divide(total_Num);
  
  return correct_Rate;
}

var accuracy = ee.List.sequence(0, ee.Number(numiter).subtract(1), 1)
  .map(estimateAccuracy);
var accuracy_GEDI = ee.List.sequence(0, ee.Number(numiter).subtract(1), 1)
  .map(estimateAccuracy_GEDI);

// print("Accuracy:", accuracy
//   .reduce(ee.Reducer.mean())); // 0.9330766124360024.
// print("Accuracy_GEDI:", accuracy_GEDI
//   .reduce(ee.Reducer.mean())); // 0.932784724843932.


/*******************************************************************************
* Results *
******************************************************************************/

var output = false; // true OR false.

if (!output) {
  
  //// Visualization.
  // var sighting_Colors = ["555555", "4daf4a"];
  var sighting_Colors = ["808080", "FF0000"];

  left.setOptions("Satellite");
  right.setOptions("Satellite");
  
  // Center map to the area of interest.
  var zoomLevel = 9;
  left.centerObject(AOI, zoomLevel);
  right.centerObject(AOI, zoomLevel);

  // Environmental variables.
  left.addLayer(predictors, 
    {bands: ["elevation"], min: 500, max: 3000,  
    palette: VIS.Elevation_palette}, 
    "Elevation (m)", true);
  
  left.addLayer(predictors, 
    {bands: ["aspect"], min: 0, max: 350, 
    palette: ["FF0000", "0000FF"]}, 
    "Aspect (Degrees)", true); 
  
  left.addLayer(predictors, 
    {bands: ["slope"], min: 0, max: 45, 
    palette: ["FFFFFF", "228B22"]}, 
    "Slope (Degrees)", true);
  
  left.addLayer(predictors, 
    {bands: ["NDVI"], min: 0, max: 1e4, 
    palette: VIS.NDVI_palette}, 
    "NDVI", true); 

  // GEDI variables.
  right.addLayer(predictors_GEDI, 
    {bands: ["rh98"], min: 0, max: 35,  
    palette: ["FFFFFF", "228B22"]}, 
    "Canopy height (m)", true);
  
  right.addLayer(predictors_GEDI, 
    {bands: ["cover"], min: 0, max: 0.7, 
    palette: ["FFFFFF", "00008B"]}, 
    "Total canopy cover", true); 
  
  right.addLayer(predictors_GEDI, 
    {bands: ["fhd_normal"], min: 1, max: 3.5, 
    palette: ["0000FF", "FFFFFF", "FF0000"]}, 
    "Foliage Height Diversity", true);
  
  right.addLayer(predictors_GEDI, 
    {bands: ["pai"], min: 0, max: 3, 
    palette: ["FFFFFF", "228B22"]}, 
    "Total Plant Area Index", true); 

  right.addLayer(predictors_GEDI, 
    {bands: ["pgap_theta"], min: 0.2, max: 1, 
    palette: ["228B22", "FFFFFF"]}, 
    "Total Gap Probability (theta)", true); 

  right.addLayer(pai.clip(AOI), 
    {min: 0, max: 3, 
    palette: ["FFFFFF", "228B22"]}, 
    "25-m Total PAI", false); 

  // Final habitat suitability layer.
  var suitability_VisParams = {
    min: 0,
    max: 0.2,
    palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
    "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"],
  };
  left.addLayer(ModelAverage, suitability_VisParams, 
    "Habitat Suitability");
  right.addLayer(ModelAverage_GEDI, suitability_VisParams, 
    "Habitat Suitability (GEDI)");
  
  // Grain-size grid. 
  left.addLayer(Grid_GrainSize, {color: "000000"},
    "Grain-size grid", true, 0.75);
  right.addLayer(Grid_GrainSize, {color: "000000"},
    "Grain-size grid", true, 0.75);

  // Partition blocks. 
  var Grid_Outline = ee.Image().byte().paint({
    featureCollection: Grid, width: 3});
  
  left.addLayer(Grid_Outline, {palette: "FFFFFF"},
    "Grid for cross validation", true);
  right.addLayer(Grid_Outline, {palette: "FFFFFF"},
    "Grid for cross validation", true);

  // Study area.
  left.addLayer(outline, {palette: "FF0000"}, "Study Area");
  right.addLayer(outline, {palette: 'FF0000'}, "Study Area");

  // Non-detection.
  left.addLayer(nonDetection, 
    {color: sighting_Colors[0]}, "Non-detection", true, 0.75);
  right.addLayer(nonDetection, 
    {color: sighting_Colors[0]}, "Non-detection", true, 0.75);
  
  // Detection
  left.addLayer(detection, 
    {color: sighting_Colors[1]}, "Detection", true);
  right.addLayer(detection, 
    {color: sighting_Colors[1]}, "Detection", true);
}

// Create legend for habitat suitability map.
var legend_Style = {
  position: 'bottom-left', 
  padding: '8px 15px'
};

var legend = ui.Panel({
  style: legend_Style
});

var legendTitle_Style = {
  fontWeight: 'bold', 
  fontSize: '18px', 
  margin: '0 0 4px 0', 
  padding: '0px'
};

legend.add(ui.Label({
  value: "Habitat suitability",
  style: legendTitle_Style
}));

var colors = ["#DCE319FF", "#287D8EFF", "#440154FF"];

var names = ['High', 'Medium','Low'];

var entry;

for (var x = 0; x < 3; x ++){
  entry = [
    ui.Label({
      style: {
        color: colors[x],
        margin: '0 0 4px 0'
      }, 
      value:'██'
    }),
    ui.Label({
      value: names[x], 
      style: {
        margin: '0 0 4px 4px'
      }
    })
  ];
  legend.add(ui.Panel(
    entry, 
    ui.Panel.Layout.Flow('horizontal')
  ));
}

var caption_Style = {
  fontWeight: 'bold', 
  fontSize: '16px', 
  margin: '0 0 4px 0'
};

legend.add(ui.Panel({
  widgets: [
    ui.Label({
      value: "Non-detection",
      style: caption_Style
    }),
    ui.Label({
      style:{
        color: sighting_Colors[0], 
        margin: '0 0 0 4px'
      }, 
      value: '◉'
    })
  ],
  layout: ui.Panel.Layout.Flow('horizontal')
}));

legend.add(ui.Panel({
  widgets: [
    ui.Label({
      value: "Detection",
      style: caption_Style
    }),
    ui.Label({
      style:{
        color: sighting_Colors[1], 
        margin: '0 0 0 4px'
      }, 
      value: '◉'
    })
  ],
  layout: ui.Panel.Layout.Flow('horizontal')
}));

left.add(legend);

