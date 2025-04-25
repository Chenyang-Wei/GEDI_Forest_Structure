/*******************************************************************************
 * Introduction *
 * 
 *  1) Derive GEDI Level-2B variables.
 * 
 * Last updated: 6/29/2024
 * 
 * Runtime: 2h
 * 
 * https://code.earthengine.google.com/52efc7b4fd38a8700a18615fbdd752b9?noload=1
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
var prj_25m = {
  crs: "EPSG:4326",
  scale: 25
};

// Major working directories.
var wd_Main_Str = "users/Chenyang_Wei/"
  + "LiDAR-Birds/Eastern_North_America/";

// Study period.
var startYear_Num = 2019;
var endYear_Num = 2022;

var startMonth_Num = 5;
var endMonth_Num = 9;

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// PAVD bands below 60 m.
var PAVDbands_Below60m_List = [
  "pavd_z0", "pavd_z1",
  "pavd_z2", "pavd_z3",
  "pavd_z4", "pavd_z5",
  "pavd_z6", "pavd_z7",
  "pavd_z8", "pavd_z9",
  "pavd_z10", "pavd_z11"
];


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Mask GEDI Level-2B data.
var Mask_L2B = function(L2B_Img) {
  
  var qualityMask_Img = L2B_Img.select("l2b_quality_flag")
    .eq(1);
  
  var degradeMask_Img = L2B_Img.select("degrade_flag")
    .eq(0);
  
  // Use GEDI data acquired at night.
  var solarMask_Img = L2B_Img.select("solar_elevation")
    .lt(0);
  
  // High penetration sensitivity.
  var sensitivity_Img = L2B_Img.select("sensitivity");
  
  var sensitivityMask_Img = sensitivity_Img
    .gt(0.95)
    .and(sensitivity_Img.lte(1));
  
  // Full-power beams.
  var beamID_Img = L2B_Img.select("beam");
  
  var fullPowerMask_Img = beamID_Img.eq(5)
    .or(beamID_Img.eq(6))
    .or(beamID_Img.eq(8))
    .or(beamID_Img.eq(11));
  
  // Whether the L2B algorithm is run.
  var l2bAlgorithmMask_Img = L2B_Img
    .select("algorithmrun_flag")
    .eq(1);
  
  // Total canopy cover (total and all intervals: 31 bands).
  var cover_Img = L2B_Img.select("cover.*");
  
  var coverMask_Img = cover_Img
    .gte(0)
    .and(cover_Img.lte(1));
  
  coverMask_Img = coverMask_Img
    .reduce(ee.Reducer.min());
  
  // Plant Area Index (total and all intervals: 31 bands).
  var paiMask_Img = L2B_Img.select("pai.*")
    .gte(0)
    .reduce(ee.Reducer.min());
  
  // Plant Area Volume Density (all intervals: 30 bands).
  var pavdMask_Img = L2B_Img.select("pavd.*")
    .gte(0)
    .reduce(ee.Reducer.min());
  
  // Foliage Height Diversity.
  var fhdMask_Img = L2B_Img.select("fhd_normal")
    .gte(0);
  
  return L2B_Img.updateMask(qualityMask_Img)
    .updateMask(degradeMask_Img)
    .updateMask(solarMask_Img)
    .updateMask(sensitivityMask_Img)
    .updateMask(fullPowerMask_Img)
    .updateMask(l2bAlgorithmMask_Img)
    .updateMask(coverMask_Img)
    .updateMask(paiMask_Img)
    .updateMask(pavdMask_Img)
    .updateMask(fhdMask_Img);
};

// Calculate PAVDs between 0 and 60 m at 10-m intervals.
var Calculate_PAVDs_0_60m = function(L2B_Img) {
  
  // Identify original PAVD bands.
  var oldPAVDs_Img = L2B_Img.select(PAVDbands_Below60m_List);
  
  // Compute PAVD for each 10-m interval.
  var startZs_List = ee.List.sequence({
    start: 0, 
    end: 10, 
    count: 6
  });
  
  var newPAVDs_List = startZs_List.map(function(startZ_Num) {
    
    // Define Z-indices and height limits.
    startZ_Num = ee.Number(startZ_Num).toInt();
    
    var endZ_Num = startZ_Num.add(1);
    
    var startHeight_Num = startZ_Num
      .multiply(5);
    
    var endHeight_Num = startHeight_Num
      .add(10);
    
    // Determine band names.
    var startBandName_Str = ee.String("pavd_z")
      .cat(startZ_Num);
    
    var endBandName_Str = ee.String("pavd_z")
      .cat(endZ_Num);
    
    var newPAVDname_Str = ee.String("pavd_")
      .cat(startHeight_Num)
      .cat("_")
      .cat(endHeight_Num)
      .cat("m");
    
    // Calculate a new PAVD.
    var newPAVD_Img = oldPAVDs_Img.select(startBandName_Str)
      .add(oldPAVDs_Img.select(endBandName_Str))
      .divide(2)
      .rename(newPAVDname_Str);
  
    return newPAVD_Img;
  });
  
  // Combine the calculated PAVDs into a new Image.
  var newPAVDs_Img = ee.ImageCollection.fromImages(newPAVDs_List)
    .toBands();
  
  newPAVDs_Img = newPAVDs_Img.select(
    [
      "0_pavd_0_10m", "1_pavd_10_20m", "2_pavd_20_30m",
      "3_pavd_30_40m", "4_pavd_40_50m", "5_pavd_50_60m"
    ],
    [
      "PAVD_0_10m", "PAVD_10_20m", "PAVD_20_30m",
      "PAVD_30_40m", "PAVD_40_50m", "PAVD_50_60m"
    ]
  );
  
  return L2B_Img.addBands(newPAVDs_Img);
};

// Calculate the PAVD over 60 m.
var Calculate_PAVD_over60m = function(L2B_Img) {
  
  // Identify original PAVD bands.
  var oldPAVDs_Img = L2B_Img.select("pavd.*");
  
  // Select PAVDs over 60 m.
  var PAVDbands_Over60m_List = oldPAVDs_Img
    .bandNames()
    .removeAll(PAVDbands_Below60m_List);
  
  var PAVDs_Over60m_Img = oldPAVDs_Img
    .select(PAVDbands_Over60m_List);
  
  // Average the selected PAVDs.
  var newPAVD_Img = PAVDs_Over60m_Img
    .reduce(ee.Reducer.mean())
    .rename("PAVD_over60m");
  
  return L2B_Img.addBands(newPAVD_Img);
};


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();

// // Overlapping tiles.
// var tiles_FC = ee.FeatureCollection(wd_Main_Str
//   + "Study_Domain/Tiles_withID_30km"
// );

// GEDI Level-2B data located within the AOI and
//   collected during the study period.
var studyPeriod_AOI_Filter = ee.Filter.and(
  ee.Filter.bounds(AOI_Geom),
  ee.Filter.calendarRange({
    start: startYear_Num, 
    end: endYear_Num, 
    field: "year"
  }),
  ee.Filter.calendarRange({
    start: startMonth_Num, 
    end: endMonth_Num, 
    field: "month"
  })
);

var L2B_IC = ee.ImageCollection(
  "LARSE/GEDI/GEDI02_B_002_MONTHLY")
  .filter(studyPeriod_AOI_Filter);


/*******************************************************************************
 * 1) Derive GEDI Level-2B variables. *
 ******************************************************************************/

// GEDI data preprocessing.
var preprocessedL2B_IC = L2B_IC
  .map(Mask_L2B);

// Re-calculate PAVDs.
preprocessedL2B_IC = preprocessedL2B_IC
  .map(Calculate_PAVDs_0_60m);

preprocessedL2B_IC = preprocessedL2B_IC
  .map(Calculate_PAVD_over60m);

// Select the bands of interest.
var bandNames_List = [
  "cover", "fhd_normal", "pai",
  "PAVD.*"
];

preprocessedL2B_IC = preprocessedL2B_IC
  .select(bandNames_List);

// Generate a temporal median composite within the study area.
var L2B_MedianVariables_Img = preprocessedL2B_IC
  .median()
  .setDefaultProjection(prj_25m)
  .clip(studyArea_Geom)
  .toFloat();


/*******************************************************************************
 * Results *
 ******************************************************************************/

var output = true; // true OR false.

if (!output) {
  
  // Check the dataset(s).
  IMG_mod.Print_ImgInfo(
    "L2B_MedianVariables_Img:",
    L2B_MedianVariables_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 10);
  
  Map.addLayer(studyArea_Geom, 
    {
      color: "FF0000"
    }, 
    "studyArea_Geom");

  // Map.addLayer(tiles_FC, 
  //   {
  //     color: "00FFFF"
  //   }, 
  //   "tiles_FC");

  Map.addLayer(L2B_MedianVariables_Img.select("pai"), 
    {
      min: 0,
      max: 3,
      palette: ["0000FF", "FFFFFF", "FF0000"]
    }, 
    "pai");

} else {
  
  // Output to Asset.
  var fileName_Str = "L2B_MedianVariables";
  
  Export.image.toAsset({
    image: L2B_MedianVariables_Img, 
    description: fileName_Str, 
    assetId: wd_Main_Str
      + "Environmental_Data/"
      + fileName_Str, 
    region: AOI_Geom, 
    scale: prj_25m.scale,  
    crs: prj_25m.crs,
    maxPixels: 1e13
  });
}

