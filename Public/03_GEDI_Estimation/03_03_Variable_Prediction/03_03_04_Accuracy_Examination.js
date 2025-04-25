/*******************************************************************************
 * Introduction *
 * 
 *  1) Check the accuracy assessment result of 
 *     each response variable.
 * 
 * Last updated: 10/4/2024
 * 
 * Runtime: N/A
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var PAL_mod = require(
  "users/gena/packages:palettes");

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_Str = ENA_mod.wd_Birds_Str;

var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

// Names of all response variables.
var allVarNames_List = 
  ENA_mod.allResponseVarNames_List; 

// Name of all predictors.
var predictors_Dict = ee.Dictionary({
  "B2": 1,
  "B3": 1,
  "B4": 1,
  "B5": 1,
  "B6": 1,
  "B7": 1,
  "NDVI": 1,
  "kNDVI": 1,
  "NIRv": 1,
  "EVI": 1,
  "NDWI": 1,
  "mNDWI": 1,
  "NBR": 1,
  "BSI": 1,
  "SI": 1,
  "BU": 1,
  "Brightness": 1,
  "Greenness": 1,
  "Wetness": 1,
  "SR_B2": 2,
  "SR_B3": 2,
  "SR_B4": 2,
  "SR_B8": 2,
  "S2_B5": 2,
  "S2_B6": 2,
  "S2_B7": 2,
  "S2_B8A": 2,
  "S2_B11": 2,
  "S2_B12": 2,
  "S2_NDVI": 2,
  "S2_kNDVI": 2,
  "S2_NIRv": 2,
  "S2_EVI": 2,
  "S2_NDWI": 2,
  "S2_mNDWI": 2,
  "S2_NBR": 2,
  "S2_BSI": 2,
  "S2_SI": 2,
  "S2_BU": 2,
  "S2_Brightness": 2,
  "S2_Greenness": 2,
  "S2_Wetness": 2,
  "VV_median": 3,
  "VH_median": 3,
  "VH_VV_ratio": 3,
  "NDRI": 3,
  "RVI": 3,
  "Elevation": 4,
  "Slope": 4,
  "Aspect": 4,
  "East-westness": 4,
  "North-southness": 4,
  "CHILI": 4,
  "mTPI": 4,
  "Topo_Diversity": 4,
  "Landform": 4,
  "LandCover_ESRI": 5,
  "LandCover_GLC": 5,
  "SLA": 6,
  "LNC": 6,
  "LPC": 6,
  "LDMC": 6,
  "bdod_0-5cm_mean": 7,
  "cec_0-5cm_mean": 7,
  "cfvo_0-5cm_mean": 7,
  "clay_0-5cm_mean": 7,
  "sand_0-5cm_mean": 7,
  "silt_0-5cm_mean": 7,
  "nitrogen_0-5cm_mean": 7,
  "phh2o_0-5cm_mean": 7,
  "soc_0-5cm_mean": 7,
  "ocd_0-5cm_mean": 7,
  "bdod_5-15cm_mean": 7,
  "cec_5-15cm_mean": 7,
  "cfvo_5-15cm_mean": 7,
  "clay_5-15cm_mean": 7,
  "sand_5-15cm_mean": 7,
  "silt_5-15cm_mean": 7,
  "nitrogen_5-15cm_mean": 7,
  "phh2o_5-15cm_mean": 7,
  "soc_5-15cm_mean": 7,
  "ocd_5-15cm_mean": 7,
  "bdod_15-30cm_mean": 7,
  "cec_15-30cm_mean": 7,
  "cfvo_15-30cm_mean": 7,
  "clay_15-30cm_mean": 7,
  "sand_15-30cm_mean": 7,
  "silt_15-30cm_mean": 7,
  "nitrogen_15-30cm_mean": 7,
  "phh2o_15-30cm_mean": 7,
  "soc_15-30cm_mean": 7,
  "ocd_15-30cm_mean": 7,
  "ocs_0-30cm_mean": 7
});

// var predictors_Dict = ee.Dictionary({
//   "B2": 0,
//   "B3": 1,
//   "B4": 2,
//   "B5": 3,
//   "B6": 4,
//   "B7": 5,
//   "NDVI": 6,
//   "kNDVI": 7,
//   "NIRv": 8,
//   "EVI": 9,
//   "NDWI": 10,
//   "mNDWI": 11,
//   "NBR": 12,
//   "BSI": 13,
//   "SI": 14,
//   "BU": 15,
//   "Brightness": 16,
//   "Greenness": 17,
//   "Wetness": 18,
//   "SR_B2": 20,
//   "SR_B3": 21,
//   "SR_B4": 22,
//   "SR_B8": 23,
//   "S2_B5": 24,
//   "S2_B6": 25,
//   "S2_B7": 26,
//   "S2_B8A": 27,
//   "S2_B11": 28,
//   "S2_B12": 29,
//   "S2_NDVI": 30,
//   "S2_kNDVI": 31,
//   "S2_NIRv": 32,
//   "S2_EVI": 33,
//   "S2_NDWI": 34,
//   "S2_mNDWI": 35,
//   "S2_NBR": 36,
//   "S2_BSI": 37,
//   "S2_SI": 38,
//   "S2_BU": 39,
//   "S2_Brightness": 40,
//   "S2_Greenness": 41,
//   "S2_Wetness": 42,
//   "VV_median": 50,
//   "VH_median": 51,
//   "VH_VV_ratio": 52,
//   "NDRI": 53,
//   "RVI": 54,
//   "Elevation": 60,
//   "Slope": 61,
//   "Aspect": 62,
//   "East-westness": 63,
//   "North-southness": 64,
//   "CHILI": 65,
//   "mTPI": 66,
//   "Topo_Diversity": 67,
//   "Landform": 68,
//   "LandCover_ESRI": 70,
//   "LandCover_GLC": 71,
//   "SLA": 80,
//   "LNC": 81,
//   "LPC": 82,
//   "LDMC": 83,
//   "bdod_0-5cm_mean": 90,
//   "cec_0-5cm_mean": 91,
//   "cfvo_0-5cm_mean": 92,
//   "clay_0-5cm_mean": 93,
//   "sand_0-5cm_mean": 94,
//   "silt_0-5cm_mean": 95,
//   "nitrogen_0-5cm_mean": 96,
//   "phh2o_0-5cm_mean": 97,
//   "soc_0-5cm_mean": 98,
//   "ocd_0-5cm_mean": 99,
//   "bdod_5-15cm_mean": 100,
//   "cec_5-15cm_mean": 101,
//   "cfvo_5-15cm_mean": 102,
//   "clay_5-15cm_mean": 103,
//   "sand_5-15cm_mean": 104,
//   "silt_5-15cm_mean": 105,
//   "nitrogen_5-15cm_mean": 106,
//   "phh2o_5-15cm_mean": 107,
//   "soc_5-15cm_mean": 108,
//   "ocd_5-15cm_mean": 109,
//   "bdod_15-30cm_mean": 110,
//   "cec_15-30cm_mean": 111,
//   "cfvo_15-30cm_mean": 112,
//   "clay_15-30cm_mean": 113,
//   "sand_15-30cm_mean": 114,
//   "silt_15-30cm_mean": 115,
//   "nitrogen_15-30cm_mean": 116,
//   "phh2o_15-30cm_mean": 117,
//   "soc_15-30cm_mean": 118,
//   "ocd_15-30cm_mean": 119,
//   "ocs_0-30cm_mean": 120
// });


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Accuracy assessment.
var accuracy_AllVars_FC = ee.FeatureCollection(
  wd_Main_Str
  + "GEDI_Estimation/"
  + "Accuracy_AllResponseVars");

// Study area.
var studyArea_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "Study_Domain/StudyArea_SelectedBCRs");

print("allVarNames_List:",
  allVarNames_List);

print("accuracy_AllVars_FC:",
  accuracy_AllVars_FC.first(),
  accuracy_AllVars_FC.size()); // 23702 = 1693 * 14.


/*******************************************************************************
 * 1) Check the accuracy assessment result of 
 *    each response variable. *
 ******************************************************************************/

Map.addLayer(AOI_Geom, 
  {
    color: "FFFFFF"
  }, 
  "AOI_Geom",
  true, 0.5);

Map.addLayer(studyArea_FC, 
  {
    color: "000000"
  }, 
  "studyArea_FC",
  false, 1);

// Compute percentile values of RMSE and R-squared, 
//   grouped by response variable.
var percentiles_AllVars_List = accuracy_AllVars_FC
  .reduceColumns({
    selectors: ["Response_Var", "RMSE", "R_squared"],
    reducer: ee.Reducer.percentile([5, 50, 95]).repeat(2)
      .group({
        groupField: 0, 
        groupName: "VarName"
      })
  }).get("groups");

// Convert the percentile values to a FeatureCollection.
var percentiles_AllVars_FC = ee.FeatureCollection(
  
  ee.List(percentiles_AllVars_List).map(
    
    function(percentiles_SingleVar_Dict) {
      
      percentiles_SingleVar_Dict = 
        ee.Dictionary(percentiles_SingleVar_Dict);
      
      var varName_Str = percentiles_SingleVar_Dict
        .getString("VarName");
      
      var p5_List = ee.List(percentiles_SingleVar_Dict
        .get("p5"));
      
      var p50_List = ee.List(percentiles_SingleVar_Dict
        .get("p50"));
      
      var p95_List = ee.List(percentiles_SingleVar_Dict
        .get("p95"));
      
      return ee.Feature(null).set({
        VarName: varName_Str,
        RMSE_p5: p5_List.get(0),
        R2_p5: p5_List.get(1),
        RMSE_p50: p50_List.get(0),
        R2_p50: p50_List.get(1),
        RMSE_p95: p95_List.get(0),
        R2_p95: p95_List.get(1),
      });
    } 
  )
);


/****** Check the accuracy assessment results. ******/

// Median values over a threshold.
var R2_Thres_Num = 0.5;

var median_R2_FC = percentiles_AllVars_FC.filter(
  ee.Filter.gte("R2_p50", R2_Thres_Num)
);

print("Median R-squared >= " + R2_Thres_Num, 
  median_R2_FC.aggregate_array("VarName"));

for (var varID_Num = 0; varID_Num < allVarNames_List.length; 
  varID_Num ++) {

  // Determine the response variable for visualization.
  var varName_Str = 
    allVarNames_List[varID_Num];
  
  var percentiles_SingleVar_Ftr = percentiles_AllVars_FC
    .filter(ee.Filter.eq("VarName", varName_Str))
    .first();
  
  // Convert the corresponding RMSE and R-squared results to Images.
  var accuracy_SingleVar_FC = accuracy_AllVars_FC
    .filter(ee.Filter.eq("Response_Var", varName_Str));
  
  var empty_Img = ee.Image().toDouble();
  
  var RMSE_SingleResponseVar_Img = empty_Img.paint({
    featureCollection: accuracy_SingleVar_FC, 
    color: "RMSE"
  });
  
  var Rsquared_SingleResponseVar_Img = empty_Img.paint({
    featureCollection: accuracy_SingleVar_FC, 
    color: "R_squared"
  });
  
  // Make a histogram of R-squared.
  var R2_singleResponseVar_Chart =
    ui.Chart.feature
      .histogram({
        features: accuracy_SingleVar_FC, 
        property: "R_squared", 
        maxBuckets: 100
      })
      .setOptions({
        title: varName_Str
          + " (median: "
          + ee.Number(percentiles_SingleVar_Ftr.get("R2_p50"))
            .multiply(1e2).round().divide(1e2).getInfo()
          + ")",
        titleTextStyle: {italic: true, bold: true},
        hAxis: {
          title: "R-squared", 
          titleTextStyle: {italic: false, bold: true}
        },
        vAxis: {
          title: "Tile count",
          titleTextStyle: {italic: false, bold: true}
        },
        fontSize: 32,
        pointSize: 12,
        colors: ["228B22"],
        legend: {position: "none"}
      });

  // Make a histogram of RMSE.
  var RMSE_singleResponseVar_Chart =
    ui.Chart.feature
      .histogram({
        features: accuracy_SingleVar_FC, 
        property: "RMSE", 
        maxBuckets: 100
      })
      .setOptions({
        title: varName_Str 
          + " (median: "
          + ee.Number(percentiles_SingleVar_Ftr.get("RMSE_p50"))
            .multiply(1e3).round().divide(1e3).getInfo()
          + ")",
        titleTextStyle: {italic: true, bold: true},
        hAxis: {
          title: "RMSE", 
          titleTextStyle: {italic: false, bold: true}
        },
        vAxis: {
          title: "Tile count",
          titleTextStyle: {italic: false, bold: true}
        },
        fontSize: 32,
        pointSize: 12,
        colors: ["FF6700"],
        legend: {position: "none"}
      });

  
  // Whether to display the result(s).
  var display_Bool = true; // true OR false.
  
  if (display_Bool) {
    
    print(R2_singleResponseVar_Chart,
      RMSE_singleResponseVar_Chart);
  
    // Map visualization.
    Map.setOptions("Satellite");
    Map.centerObject(AOI_Geom, 4);
    
    Map.addLayer(RMSE_SingleResponseVar_Img, 
      {
        min: percentiles_SingleVar_Ftr.get("RMSE_p5")
          .getInfo(),
        max: percentiles_SingleVar_Ftr.get("RMSE_p95")
          .getInfo(),
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      varName_Str + ": RMSE",
      false);
  
    Map.addLayer(Rsquared_SingleResponseVar_Img, 
      {
        min: 0.2,
        max: 0.8,
        palette: PAL_mod.matplotlib.plasma[7]
      }, 
      varName_Str + ": R-squared",
      false);
  }
}


/*******************************************************************************
 * 2) Examine the relative importance of the top-ranked
 *    predictor(s) of each response variable. *
 ******************************************************************************/

// Assign an ID to each top-ranked predictor.
accuracy_AllVars_FC = accuracy_AllVars_FC.map(
  function Assign_PredictorID(accuracy_AllVars_Ftr) {
    
    var var1_Name_Str = accuracy_AllVars_Ftr.get("Var1_Name");
    var var2_Name_Str = accuracy_AllVars_Ftr.get("Var2_Name");
    var var3_Name_Str = accuracy_AllVars_Ftr.get("Var3_Name");
    
    var var1_ID_Num = predictors_Dict.getNumber(var1_Name_Str);
    var var2_ID_Num = predictors_Dict.getNumber(var2_Name_Str);
    var var3_ID_Num = predictors_Dict.getNumber(var3_Name_Str);
    
    return accuracy_AllVars_Ftr.set({
      Var1_ID: var1_ID_Num,
      Var2_ID: var2_ID_Num,
      Var3_ID: var3_ID_Num
    });
  }
);

for (var varID_Num = 0; varID_Num < allVarNames_List.length; 
  varID_Num ++) { // (For non-FHD variables.)

  // Determine the response variable for visualization.
  var varName_Str = 
    allVarNames_List[varID_Num];
  
  // Convert each top-ranked predictor to an Image.
  var accuracy_SingleVar_FC = accuracy_AllVars_FC
    .filter(ee.Filter.eq("Response_Var", varName_Str));
  
  var empty_Img = ee.Image().toShort();
  
  var Var1_ID_Img = empty_Img.paint({
    featureCollection: accuracy_SingleVar_FC, 
    color: "Var1_ID"
  });
  
  var Var2_ID_Img = empty_Img.paint({
    featureCollection: accuracy_SingleVar_FC, 
    color: "Var2_ID"
  });
  
  var Var3_ID_Img = empty_Img.paint({
    featureCollection: accuracy_SingleVar_FC, 
    color: "Var3_ID"
  });
  
  // Map visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 4);

  Map.addLayer(Var1_ID_Img, 
    {
      min: 1,
      max: 7,
      palette: "#e41a1c, #377eb8, #4daf4a," 
        + "#984ea3, #ff7f00, #ffff33, #a65628"
    }, 
    varName_Str + ": Top-1 Predictor",
    false);

  // Map.addLayer(Var2_ID_Img, 
  //   {
  //     min: 0,
  //     max: 120,
  //     palette: PAL_mod.crameri.roma[50]
  //   }, 
  //   varName_Str + ": Top-2 Predictor",
  //   false);

  // Map.addLayer(Var3_ID_Img, 
  //   {
  //     min: 0,
  //     max: 120,
  //     palette: PAL_mod.crameri.roma[50]
  //   }, 
  //   varName_Str + ": Top-3 Predictor",
  //   false);
}

if (true) {
  var ecoRegions = ee.FeatureCollection('RESOLVE/ECOREGIONS/2017')
    .filterBounds(AOI_Geom);

  // patch updated colors
  var colorUpdates = [
    {ECO_ID: 204, COLOR: '#B3493B'},
    {ECO_ID: 245, COLOR: '#267400'},
    {ECO_ID: 259, COLOR: '#004600'},
    {ECO_ID: 286, COLOR: '#82F178'},
    {ECO_ID: 316, COLOR: '#E600AA'},
    {ECO_ID: 453, COLOR: '#5AA500'},
    {ECO_ID: 317, COLOR: '#FDA87F'},
    {ECO_ID: 763, COLOR: '#A93800'},
  ];
  
  // loop over all other features and create a new style property for styling
  // later on
  var ecoRegions = ecoRegions.map(function(f) {
    var color = f.get('COLOR');
    return f.set({style: {color: color, width: 0}});
  });
  
  // make styled features for the regions we need to update colors for,
  // then strip them from the main asset and merge in the new feature
  for (var i=0; i < colorUpdates.length; i++) {
    colorUpdates[i].layer = ecoRegions
        .filterMetadata('ECO_ID','equals',colorUpdates[i].ECO_ID)
        .map(function(f) {
          return f.set({style: {color: colorUpdates[i].COLOR, width: 0}});
        });
  
    ecoRegions = ecoRegions
        .filterMetadata('ECO_ID','not_equals',colorUpdates[i].ECO_ID)
        .merge(colorUpdates[i].layer);
  }
  
  // use style property to color shapes
  var imageRGB = ecoRegions.style({styleProperty: 'style'});
  
  Map.addLayer(imageRGB, {}, 'RESOLVE/ECOREGIONS/2017');
  
  Map.addLayer(studyArea_FC, 
    {
      color: "000000"
    }, 
    "studyArea_FC",
    true, 0.5);

}

