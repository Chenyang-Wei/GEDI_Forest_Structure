/*******************************************************************************
 * Introduction *
 * 
 *  1) Sample variables by year
 * 
 * Updated: 3/25/2024
 * 
 * Runtime: 5m ~ 22m.
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
var training = false;

// Projection information.
var prjInfo = {
  crs: "EPSG:4326",
  scale: 25
};

// Empty Image name.
var emptyName_Str = "emp_25m";

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

// Remove the year information in a band name.
var Remove_YearInName = function(bandName_Str) {
  var newName_Str = ee.String(bandName_Str).slice({
    start: 0,
    end: -5
  });
  
  return newName_Str;
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Buffered eBird observations.
var fileName;

if (training) {
  fileName = "Buf_Training_NonGEDIvars_SSd";
} else {
  fileName = "Buf_Test_NonGEDIvars_SSd";
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

// An empty image.
var empty_Img = ee.Image(1)
  .reproject(prjInfo)
  .rename(emptyName_Str);

// GEDI.
var GEDI_Img = ee.Image(
  "users/Chenyang_Wei/" 
    + "LiDAR-Birds/SierraNevada_US/Environmental_Vars/"
    + "GEDI_AnnualMedians"
);


/*******************************************************************************
 * 1) Sample variables by year *
 ******************************************************************************/

// Group and mask variables.
var nonTemporal_Img = empty_Img
  .updateMask(landMask_Img);

var temporal_Img = GEDI_Img
  .updateMask(landMask_Img);

// Sample variables.
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
    
    // Rename the FHD band.
    var bandToChange_Str = "fhd_normal";
    
    var noChange_List = temporalVars_Img.bandNames()
      .remove(bandToChange_Str);
    
    temporalVars_Img = temporalVars_Img.select(
      noChange_List.add(bandToChange_Str),
      noChange_List.add("fhd")
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
  print("Sampled non-GEDI variables:", 
    buffered_FC.first(),
    buffered_FC.size()
  );
  
  print("Sampled variables:", 
    sampledVars_FC.first(),
    sampledVars_FC.size()
  );
  
} else {
  
  var outputName;
  
  if (training) {
    outputName = "Buf_Training_AllVars_SSd";
  } else {
    outputName = "Buf_Test_AllVars_SSd";
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

