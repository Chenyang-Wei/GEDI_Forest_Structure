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

var VIS = require("users/ChenyangWei/Public:Modules/General/Visualization.js");


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

print("Dataset:", Data.size(),
  Data.first());

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

right.addLayer(outline, {palette: "FF0000"}, "Study Area");

left.addLayer(outline, {palette: 'FF0000'}, "Study Area");

// Center map to the area of interest.
right.centerObject(AOI, 9);

left.centerObject(AOI, 9);


/*******************************************************************************
 * 3) Selecting Predictor Variables *
 ******************************************************************************/

// Load elevation data from the data catalog.
var Terrain = ee.Algorithms.Terrain(ee.Image("USGS/SRTMGL1_003"));

// Calculate slope, aspect, and a simple hillshade from the terrain Digital Elevation Model.
Terrain = Terrain.select([
  "elevation",
  "slope",
  "aspect"
]); // Select elevation, slope and aspect.

// Load 250-m MODIS NDVI collection.
var MODIS = ee.ImageCollection("MODIS/006/MOD13Q1")
  .filter(ee.Filter.and(
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
  ));

// Estimate median NDVI value per pixel.
var MedianNDVI = MODIS
  .select(["NDVI"]).median();

// Combine bands into a single image.
var predictors = Terrain
  .addBands(MedianNDVI)
  .clip(AOI);

// // Mask ocean from predictor variables.
// var watermask = Terrain
//   .select("elevation")
//   .gt(0); // Create a water mask.

// predictors = predictors
//   .updateMask(watermask);

left.addLayer(predictors, 
  {bands: ["elevation"], min: 500, max: 3000,  
  palette: VIS.Elevation_palette}, 
  "Elevation (m)", false);

left.addLayer(predictors, 
  {bands: ["slope"], min: 0, max: 45, 
  palette: ["FFFFFF", "FF0000"]}, 
  "Slope (Degrees)", false);

left.addLayer(predictors, 
  {bands: ["aspect"], min: 0, max: 350, 
  palette: ["FF0000", "0000FF"]}, 
  "Aspect (Degrees)", false); 

left.addLayer(predictors, 
  {bands: ["NDVI"], min: 0, max: 1e4, 
  palette: VIS.NDVI_palette}, 
  "NDVI", false); 


//// Estimate correlation among predictor variables.
// Extract local covariate values from multi-band predictor image 
//  at 5000 random points.
var PixelVals = predictors.sample({
  scale: GrainSize, 
  numPixels: 5000, 
  geometries: true
}); // Generate 5000 random points.

// Select bands for modeling.
var bands = [
  "elevation", "slope", "aspect",
  "NDVI"
];

var predictors = predictors.select(bands);

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

// print("Variables correlation matrix", CorrAll);


/*******************************************************************************
 * 4) Defining blocks to fold randomly for cross validation *
 ******************************************************************************/

// Set range in meters to create spatial blocks.
var Scale = GrainSize * 10;

// Create grid and remove cells outside AOI.
var Grid = makeGrid(AOI, Scale);

Grid = Grid.filterBounds(studyArea_FC);

// Grid = watermask.reduceRegions({
//   collection: Grid, 
//   reducer: ee.Reducer.mean()
// }).filter(ee.Filter.eq("mean", 1));

left.addLayer(Grid, {},
  "Grid for spatail block cross validation", true);

right.addLayer(Grid, {},
  "Grid for spatail block cross validation", true);


/*******************************************************************************
 * 5) Fitting SDM models *
 ******************************************************************************/

// Define a SDM function
//  Activate the desired classifier, Random Forest or Gradient Boosting.
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
  var PresencePoints = Data
    .filter(ee.Filter.eq("Detectn", 1)); // Filter all presence points.
  
  var TrPresencePoints = PresencePoints
    .filterBounds(TrainingGrid);
  
  var TePresencePoints = PresencePoints
    .filterBounds(TestingGrid);

  // Absence.
  var AbsPoints = Data
    .filter(ee.Filter.eq("Detectn", 0)); // Filter all absence points.
  
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
      scale: GrainSize
      // tileScale: 16
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
  
  // Classify using gradient boosting 
  // var ClassifierPr = ee.Classifier.smileGradientTreeBoost({
  //   numberOfTrees:500, //The number of decision trees to create.
  //   shrinkage: 0.005, //The shrinkage parameter in (0, 1) controls the learning rate of procedure. Default: 0.005
  //   samplingRate: 0.7, //The sampling rate for stochastic tree boosting. Default 0.07
  //   maxNodes: null, //The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
  //   loss: "LeastAbsoluteDeviation", //Loss function for regression. One of: LeastSquares, LeastAbsoluteDeviation, Huber.
  //   seed:Seed //The randomization seed.
  // });

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

// Define partition for training and testing data.
var split = 0.70;  // The proportion of the blocks used to select training data.

// Define number of repetitions.
var numiter = 10;

//// Fit SDM.
// Create random seeds.
var RanSeeds = runif(numiter);
var results = ee.List(RanSeeds)
  .map(SDM);

// Extract results from list.
var results = results.flatten();

print(results);


/*******************************************************************************
 * 6) Extracting and displaying model prediction results *
 ******************************************************************************/

//// Habitat suitability.
// Set visualization parameters.
var visParams = {
  min: 0,
  max: 0.2,
  palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
  "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"],
};

// Extract all model predictions.
var images = ee.List.sequence({
  start: 0, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results.get(x);
});

// Add all the individual model predictions to the map.
//  (The number of layers to add depends on the number of iterations.)
left.addLayer(
  ee.Image(images.get(0)), 
  visParams, "Run1");

left.addLayer(
  ee.Image(images.get(9)), 
  visParams, "Run10");

// Calculate mean of all individual model runs.
var ModelAverage = ee.ImageCollection.fromImages(images)
  .mean();

// Add final habitat suitability layer and presence locations to the map.
left.addLayer(ModelAverage, visParams, 
  "Habitat Suitability");

// var sighting_Colors = ["555555", "4daf4a"];
var sighting_Colors = ["808080", "FF0000"];

left.addLayer(Data.filter(ee.Filter.eq("Detectn", 0)), 
  {color: sighting_Colors[0]}, "Absence", true, 0.75);

left.addLayer(Data.filter(ee.Filter.eq("Detectn", 1)), 
  {color: sighting_Colors[1]}, "Presence", true);

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

//// Distribution map.
// Extract all model predictions.
var images2 = ee.List.sequence({
  start: 1, 
  end: ee.Number(numiter).multiply(4).subtract(1), 
  step: 4
}).map(function(x) {
  return results.get(x);
});

// right.addLayer(
//   ee.Image(images2.get(0)), 
//   {palette: ["white", "green"], min: 0, max: 1}, "Run1");

// right.addLayer(
//   ee.Image(images2.get(9)), 
//   {palette: ["white", "green"], min: 0, max: 1}, "Run10");

// // Calculate mode of all indivudual model runs.
// var DistributionMap = ee.ImageCollection.fromImages(images2)
//   .mode();

// // Add final distribution map and presence locations to the map.
// right.addLayer(DistributionMap, 
//   {palette: ["white", "green"], min: 0, max: 1}, 
//   "Potential distribution");

// right.addLayer(Data.filter(ee.Filter.eq("Detectn", 0)), 
//   {color: sighting_Colors[0]}, "Absence", true, 0.75);

// right.addLayer(Data.filter(ee.Filter.eq("Detectn", 1)), 
//   {color: sighting_Colors[1]}, "Presence", true);

// // Create legend for distribution map
// var legend2 = ui.Panel({
//   style: legend_Style
// });

// legend2.add(ui.Label({
//   value: "Potential distribution map",
//   style: legendTitle_Style
// }));

// var colors2 = ["green","white"];

// var names2 = ["Presence", "Absence"];

// var entry2;

// for (var x = 0; x < 2; x ++){
//   entry2 = [
//     ui.Label({
//       style: {
//         color: colors2[x],
//         margin: '0 0 4px 0'
//       }, 
//       value:'██'
//     }),
//     ui.Label({
//       value: names2[x], 
//       style: {
//         margin: '0 0 4px 4px'
//       }
//     })
//   ];
//   legend2.add(ui.Panel(
//     entry2, 
//     ui.Panel.Layout.Flow('horizontal')
//   ));
// }

// legend2.add(ui.Panel({
//   widgets: [
//     ui.Label({
//       value: "Non-detection",
//       style: caption_Style
//     }),
//     ui.Label({
//       style:{
//         color: sighting_Colors[0], 
//         margin: '0 0 0 4px'
//       }, 
//       value: '◉'
//     })
//   ],
//   layout: ui.Panel.Layout.Flow('horizontal')
// }));

// legend2.add(ui.Panel({
//   widgets: [
//     ui.Label({
//       value: "Detection",
//       style: caption_Style
//     }),
//     ui.Label({
//       style:{
//         color: sighting_Colors[1], 
//         margin: '0 0 0 4px'
//       }, 
//       value: '◉'
//     })
//   ],
//   layout: ui.Panel.Layout.Flow('horizontal')
// }));

// right.add(legend2);


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

// Double check the number of points for model validation.
print("Number of presence and absence points for model validation:", 
  ee.List.sequence(0, ee.Number(numiter).subtract(1), 1).map(function(x) {
    return ee.List([
      ee.FeatureCollection(TestingDatasets.get(x))
        .filter(ee.Filter.eq("Detectn", 1)).size(),
      ee.FeatureCollection(TestingDatasets.get(x))
        .filter(ee.Filter.eq("Detectn", 0)).size()
    ]);
  })
);

// Define functions to estimate accuracy.
function estimateAccuracy(x) {
  var occurance_Map = ee.Image(images2.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var occurance_Vals = occurance_Map.sampleRegions({
    collection: TData, 
    properties: ["Detectn"], 
    scale: GrainSize
    // tileScale: 16
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

print("Accuracy:", accuracy.reduce(ee.Reducer.mean()));


// // Define functions to estimate sensitivity, specificity, and precision.
// function getAcc(img, TP) {
//   var Pr_Prob_Vals = img.sampleRegions({
//     collection: TP, 
//     properties: ["Detectn"], 
//     scale: GrainSize, 
//     tileScale: 16
//   });
  
//   var seq = ee.List.sequence({start: 0, end: 1, count: 25});
  
//   return ee.FeatureCollection(seq.map(function(cutoff) {
    
//     var Pres = Pr_Prob_Vals.filterMetadata("Detectn", "equals", 1);
    
//     // True-positive and true-positive rate (sensitivity).
//     var TP =  ee.Number(Pres.filterMetadata("classification", 
//       "greater_than", cutoff).size());
    
//     var TPR = TP.divide(Pres.size());
    
//     var Abs = Pr_Prob_Vals.filterMetadata("Detectn", "equals", 0);
    
//     // False-negative.
//     var FN = ee.Number(Pres.filterMetadata("classification",
//       "less_than", cutoff).size());

//     // True-negative and true-negative rate (specificity).
//     var TN = ee.Number(Abs.filterMetadata("classification",
//       "less_than", cutoff).size());

//     var TNR = TN.divide(Abs.size());
    
//     // False-positive and false-positive rate
//     var FP = ee.Number(Abs.filterMetadata("classification", 
//       "greater_than", cutoff).size());
    
//     var FPR = FP.divide(Abs.size());
    
//     // Precision.
//     var Precision = TP.divide(TP.add(FP));
    
//     // Sum of sensitivity and specificity.
//     var SUMSS = TPR.add(TNR);
    
//     return ee.Feature(null,
//       {
//         cutoff: cutoff, 
//         TP:TP, TN:TN, FP:FP, FN:FN, 
//         TPR:TPR, TNR:TNR, FPR:FPR, 
//         Precision:Precision, SUMSS:SUMSS
//       });
//   }));
// }

// // Calculate AUC of the Receiver Operator Characteristic.
// function getAUCROC(x){
//   var X = ee.Array(x.aggregate_array("FPR"));
//   var Y = ee.Array(x.aggregate_array("TPR")); 
//   var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
//   var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
//   return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
// }

// function AUCROCaccuracy(x){
//   var HSM = ee.Image(images.get(x));
//   var TData = ee.FeatureCollection(TestingDatasets.get(x));
//   var Acc = getAcc(HSM, TData);
//   return getAUCROC(Acc);
// }

// var AUCROCs = ee.List.sequence(0, ee.Number(numiter).subtract(1), 1)
//   .map(AUCROCaccuracy);

// print("AUC-ROC:", AUCROCs);

// print("Mean AUC-ROC", AUCROCs.reduce(ee.Reducer.mean()));


/*******************************************************************************
 * Results *
 ******************************************************************************/


var output = false; // true OR false.

if (!output) {
  
  // Check the result(s).
  print();
  
  // Visualization.
  Map.setOptions("Satellite");
  
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

