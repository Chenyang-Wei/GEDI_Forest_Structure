/*******************************************************************************
 * Introduction *
 * 
 *  1) Obtain the weighted average GEDI estimates at 
 *     each randomly collected sample.
 * 
 * Last updated: 1/13/2025
 * 
 * Runtime: <1m ~ 2m
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");

var IMG_mod = require(
  "users/ChenyangWei/Public:Modules/General/Image_Analysis&Processing.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Projection information.
var prj_30m = {
  crs: "EPSG:4326",
  scale: 30
};

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_GEE_Str;

// Names of selected response variables.
var selectedVarNames_List = [
  "RHD_25to50",
  "RHD_50to75",
  "RHD_75to98",
  "rh98",
  "cover",
  "fhd_normal",
  "pai",
  "PAVD_0_10m",
  "PAVD_10_20m",
  "PAVD_20_30m",
  "PAVD_30_40m"
];


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Rename an estimated response variable.
function Rename_EstimatedVariable(selectedVarName_Str) {
  
  return "W_" + selectedVarName_Str;
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Randomly collected samples with raw GEDI estimates.
var collectedSamples_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "Composited_Results/"
  + "SampledEstimates_Raw"
);


/*******************************************************************************
 * 1) Obtain the weighted average GEDI estimates at 
 *    each randomly collected sample. *
 ******************************************************************************/

// Load and merge the estimation result of each response variable.
var estimates_AllVars_Img = ee.Image();

for (var varID_Num = 0; varID_Num < 11; varID_Num ++) {

  // Determine the response variable name.
  var varName_Str = 
    selectedVarNames_List[varID_Num];
  
  // Load the estimated variable.
  var estimates_OneVar_Img = ee.Image(
    wd_Main_1_Str
    + "GEDI_Estimation/"
    + "Composited_Results/"
    + "Weighted/"
    + varName_Str
  );
  
  estimates_AllVars_Img = estimates_AllVars_Img
    .addBands(estimates_OneVar_Img);
}

// Select and rename the estimated variables.
var estVarNames_List = selectedVarNames_List
  .map(Rename_EstimatedVariable);

estimates_AllVars_Img = estimates_AllVars_Img
  .select(selectedVarNames_List, estVarNames_List)
  .reproject(prj_30m);

// Collect the estimated variables at each sample.
var sampledEstimates_FC = estimates_AllVars_Img.reduceRegions({
  collection: collectedSamples_FC, 
  reducer: ee.Reducer.first(), 
  scale: prj_30m.scale, 
  crs: prj_30m.crs
});


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true/false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  IMG_mod.Print_ImgInfo(
    "estimates_AllVars_Img:",
    estimates_AllVars_Img // 11 bands.
  );
  
  print("collectedSamples_FC:",
    collectedSamples_FC.first(),
    collectedSamples_FC.size()); // 16930.
  
  print("sampledEstimates_FC:",
    sampledEstimates_FC.first(),
    sampledEstimates_FC.size()); // 16930.
  
} else {
  
  /****** Export the result(s). ******/
  
  var outputName_Str = "SampledEstimates_Weighted";
  
  Export.table.toAsset({
    collection: sampledEstimates_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Composited_Results/"
      + outputName_Str
  });
  
  Export.table.toDrive({
    collection: sampledEstimates_FC, 
    description: outputName_Str, 
    folder: outputName_Str, 
    fileFormat: "SHP"
  });
}

