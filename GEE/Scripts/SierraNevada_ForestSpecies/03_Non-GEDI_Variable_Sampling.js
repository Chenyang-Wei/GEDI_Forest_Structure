/*******************************************************************************
 * Introduction *
 * 
 *  1) Add duplicate land cover data
 * 
 *  2) Combine and mask datasets
 * 
 *  3) Sample variables by year
 * 
 * Updated: 3/25/2024
 * 
 * Runtime: 3m ~ 14m.
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
var prjInfo = {
  crs: "EPSG:4326",
  scale: 30
};

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var studyYears_List = ee.List.sequence(
  startYear_Num, endYear_Num);

// Combined reducers.
var meanSDcount_Reducers = ee.Reducer.mean().unweighted()
  .combine({
    reducer2: ee.Reducer.stdDev().unweighted(),
    sharedInputs: true
  })
  .combine({
    reducer2: ee.Reducer.count(),
    sharedInputs: true
  });


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Duplicate land cover bands.
var Duplicate_LCbands = function(lcBands_Img, lcName_Str) {
  lcName_Str = ee.String(lcName_Str);
  
  var renamedBands_Img = lcBands_Img
    .select(["landcover_2019", "landcover_2021"], 
    [lcName_Str.cat("2019"), lcName_Str.cat("2021")]);
  
  var duplicatedBands_Img = lcBands_Img
    .select(["landcover_2019", "landcover_2021"], 
    [lcName_Str.cat("2020"), lcName_Str.cat("2022")]);
  
  var combinedBands_Img = renamedBands_Img
    .addBands(duplicatedBands_Img);
  
  return combinedBands_Img;
};

// Remove the year information in a band name.
var Remove_YearInName = function(bandName_Str) {
  var newName_Str = ee.String(bandName_Str).slice({
    start: 0,
    end: 2
  });
  
  return newName_Str;
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Buffered eBird observations.
var fileName;

if (training) {
  fileName = "Buffered_TrainingObs_SubSampled";
} else {
  fileName = "Buffered_TestObs_SubSampled";
}

var buffered_FC = ee.FeatureCollection(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Modeling/"
    + fileName
);

// Land area mask.
var landMask_Img = ee.Image(
  "UMD/hansen/global_forest_change_2022_v1_10")
  .select("datamask")
  .eq(1)
  .reproject(prjInfo);


/* No temporal variation. */

// An empty image.
var empty_Img = ee.Image(1)
  .reproject(prjInfo)
  .rename("empty");

// Topographic features.
var topography_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "topography"
).select(
  ["elevation", "slope", "aspect"],
  ["elv", "slp", "asp"]
);


/* With temporal variations. */

// NDVI.
var NDVI_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "annualMax_NDVIs"
);

// NLCD forests.
var deciduous_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "deciduous_Forest"
);

var evergreen_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "evergreen_Forest"
);

var mixed_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "mixed_Forest"
);


/*******************************************************************************
 * 1) Add duplicate land cover data *
 ******************************************************************************/

deciduous_Img = Duplicate_LCbands(deciduous_Img, "Df");

evergreen_Img = Duplicate_LCbands(evergreen_Img, "Ef");

mixed_Img = Duplicate_LCbands(mixed_Img, "Mf");


/*******************************************************************************
 * 2) Combine and mask datasets *
 ******************************************************************************/

var nonTemporal_Img = empty_Img
  .addBands(topography_Img)
  .updateMask(landMask_Img);

var temporal_Img = NDVI_Img
  .addBands(deciduous_Img)
  .addBands(evergreen_Img)
  .addBands(mixed_Img)
  .updateMask(landMask_Img);


/*******************************************************************************
 * 3) Sample variables by year *
 ******************************************************************************/

var sampledVars_FC = ee.FeatureCollection(studyYears_List.map(
  function Sample_Vars(studyYear_Num) {
    
    // Select the observations.
    var buffered_PerYear_FC = buffered_FC.filter(
      ee.Filter.eq({
        name: "year", 
        value: studyYear_Num
      }));
    
    // Select the temporal variables.
    var temporalVars_Img = temporal_Img.select(
      ee.String(".*").cat(ee.Number(studyYear_Num).toInt())
    );
    
    // Rename the selected bands.
    var newName_List = temporalVars_Img.bandNames()
      .map(Remove_YearInName);
    
    temporalVars_Img = temporalVars_Img.select(
      temporalVars_Img.bandNames(),
      newName_List
    );
    
    // Sample variables.
    var combinedVars_Img = temporalVars_Img
      .addBands(nonTemporal_Img);
    
    var sampledVars_PerYear_FC = combinedVars_Img
      .reduceRegions({
        collection: buffered_PerYear_FC, 
        reducer: meanSDcount_Reducers, 
        scale: prjInfo.scale, 
        crs: prjInfo.crs
      });

    return sampledVars_PerYear_FC;
  }
)).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the result(s).
  print("Sampled variables:", 
    sampledVars_FC.first(),
    sampledVars_FC.size()
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  
  Map.addLayer(buffered_FC, 
    {
      color: "FF0000"
    }, 
    "buffered_FC");
  
} else {
  
  var outputName;
  
  if (training) {
    outputName = "Buf_Training_NonGEDIvars_SSd";
  } else {
    outputName = "Buf_Test_NonGEDIvars_SSd";
  }

  // Output to Asset.
  Export.table.toAsset({
    collection: sampledVars_FC, 
    description: outputName, 
    assetId: "users/Chenyang_Wei/" 
      + "LiDAR-Birds/SierraNevada_US/Modeling/"
      + outputName
  });
  
}

