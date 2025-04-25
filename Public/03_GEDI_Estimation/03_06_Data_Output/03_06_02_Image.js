/*******************************************************************************
 * Introduction *
 * 
 *  1) Export the composited GEDI estimates at 300 m.
 * 
 *  2) Export the rasterized tile-level model accuracy
 *     at 30 km.
 * 
 *  3) Export a few predictor variables at 300 m.
 * 
 * Last updated: 11/26/2024
 * 
 * Runtime: 
 *  1) Average: 5m ~ 12m; weighted average: 4m ~ 9m.
 *  2) <1m.
 *  3) 6m ~ 18m.
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
var prj_300m = {
  crs: "EPSG:4326",
  scale: 300
};

var prj_30km = {
  crs: "EPSG:4326",
  scale: 30e3
};

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_GEE_Str;

var wd_Main_2_Str = ENA_mod.wd_Birds_Str;

var wd_Main_3_Str = ENA_mod.wd_OSU_Str;

var wd_Main_4_Str = ENA_mod.wd_LiDAR_Str
  + "Environmental_Data/"
  + "Sentinel-2_Variables/";

var wd_Main_5_Str = ENA_mod.wd_EO_Str;

// // Names of all response variables.
// var allResponseVarNames_List = 
//   ENA_mod.allResponseVarNames_List;

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

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Accuracy assessment results.
var accuracy_AllVars_FC = ee.FeatureCollection(
  wd_Main_2_Str
  + "GEDI_Estimation/"
  + "Accuracy_AllResponseVars");

// Predictor variables.
var L8_EVI_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "HLSL30_Variables"
).select(
  ["EVI"],
  ["L8_EVI"]
);

var S2_kNDVI_Img = ee.Image(wd_Main_4_Str
  + "S2_Variables"
).select(
  ["kNDVI"],
  ["S2_kNDVI"]
);

var S1_NDRI_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "S1_Variables"
).select("NDRI");

var ALOS_Slope_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "ALOS_TopographicFeatures"
).select("Slope");

var LC_ESRI_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LandCover_ESRI"
);

var LC_GLC_Img = ee.Image(wd_Main_3_Str
  + "Environmental_Data/"
  + "LandCover_GLC"
);

var SLA_Img = ee.Image(wd_Main_5_Str
  + "Environmental_Data/"
  + "LeafTraits_Resampled/"
  + "SLA"
);

var OCS_0_30cm_Img = ee.Image(wd_Main_5_Str
  + "Environmental_Data/"
  + "SoilProperties_Resampled/"
  + "OCS_0-30cm"
);


/*******************************************************************************
 * 1) Export the composited GEDI estimates at 300 m. *
 ******************************************************************************/

if (true) {
  
  // Whether to export the result(s).
  var export_Bool = true; // true/false.
  
  // for (var responseVarID_Num = 0; responseVarID_Num < 14; 
  //   responseVarID_Num ++) {
  
  for (var responseVarID_Num = 0; responseVarID_Num < 11; 
    responseVarID_Num ++) {
  
    // Determine the response variable name.
    // var responseVarName_Str = 
    //   allResponseVarNames_List[responseVarID_Num];
    var responseVarName_Str = 
      selectedVarNames_List[responseVarID_Num];
    
    // Load the composited result.
    var composited_SingleVar_Img = ee.Image(
      wd_Main_1_Str
      + "GEDI_Estimation/"
      + "Composited_Results/"
      + "Weighted/"
      + responseVarName_Str
    );
    
    if (!export_Bool) {
      
      IMG_mod.Print_ImgInfo(
        responseVarName_Str,
        composited_SingleVar_Img
      );
      
    } else {
      
      // Output to Drive.
      var folderName_Str = "300m_WeightedAverage_GEDIestimates";
      
      var fileName_Str = "WtdAvg_" + responseVarName_Str;
      
      Export.image.toDrive({
        image: composited_SingleVar_Img, 
        description: fileName_Str, 
        folder: folderName_Str, 
        region: AOI_Geom, 
        scale: prj_300m.scale,  
        crs: prj_300m.crs,
        maxPixels: 1e13,
        skipEmptyTiles: true
      });
    }
  }
}


/*******************************************************************************
 * 2) Export the rasterized tile-level model accuracy
 *    at 30 km. *
 ******************************************************************************/

if (false) {
  
  // Whether to export the result(s).
  var export_Bool = true; // true/false.
  
  // Accuracy properties to rasterize.
  var propertyNames_List = [
    "R_squared"
  ];
  
  // Perform operations by response variable.
  var selectedResponseVars_List = [
    "fhd_normal",
    "pai",
    "rh98",
    "cover"
  ];
  
  for (var responseVarID_Num = 0; responseVarID_Num < 4; 
    responseVarID_Num ++) {
  
    // Determine the response variable name.
    var responseVarName_Str = 
      selectedResponseVars_List[responseVarID_Num];
    
    // Extract the corresponding model accuracy.
    var accuracy_OneVar_FC = accuracy_AllVars_FC.filter(
      ee.Filter.eq({
        name: "Response_Var", 
        value: responseVarName_Str
      })
    );
    
    // Rasterize the tile-level model accuracy.
    var R2_OneVar_Img = accuracy_OneVar_FC
      .filter(ee.Filter.notNull(["R_squared"]))
      .reduceToImage({
        properties: ["R_squared"],
        reducer: ee.Reducer.first().setOutputs([
          responseVarName_Str + "_R2"
        ])
      })
      .reproject(prj_30km)
      .clipToCollection(accuracy_OneVar_FC)
      .toFloat();
  
    var RMSE_OneVar_Img = accuracy_OneVar_FC
      .filter(ee.Filter.notNull(["RMSE"]))
      .reduceToImage({
        properties: ["RMSE"],
        reducer: ee.Reducer.first().setOutputs([
          responseVarName_Str + "_RMSE"
        ])
      })
      .reproject(prj_30km)
      .clipToCollection(accuracy_OneVar_FC)
      .toFloat();
  
    // var accuracy_OneVar_Img = ee.Image.cat([
    //   R2_OneVar_Img,
    //   RMSE_OneVar_Img
    // ])
    // .clipToCollection(accuracy_OneVar_FC)
    // .toFloat();
  
    if (!export_Bool) {
      
      /****** Check the dataset(s) and object(s). ******/
      
      print("accuracy_OneVar_FC:",
        accuracy_OneVar_FC.first(),
        accuracy_OneVar_FC.size()
      );
      
      // IMG_mod.Print_ImgInfo(
      //   "accuracy_OneVar_Img",
      //   accuracy_OneVar_Img
      // );
      
      // Visualization.
      Map.setOptions("Satellite");
      Map.centerObject(AOI_Geom, 6);
      
      Map.addLayer(
        AOI_Geom, 
        {
          color: "FFFFFF"
        }, 
        "AOI_Geom"
      );
    
      // Map.addLayer(
      //   accuracy_OneVar_Img.select(responseVarName_Str + "_R2"), 
      //   {
      //     min: 0,
      //     max: 1,
      //     palette: "0000FF, FFFFFF, FF0000"
      //   }, 
      //   "R2_OneVar_Img"
      // );
      
      Map.addLayer(
        accuracy_OneVar_FC, 
        {
          color: "FFFFFF"
        }, 
        "accuracy_OneVar_FC"
      );
      
    } else {
        
      // Output to Drive.
      // Export.image.toDrive({
      //   image: accuracy_OneVar_Img, 
      //   description: responseVarName_Str, 
      //   folder: "Tile-Level_Accuracy", 
      //   region: AOI_Geom, 
      //   scale: prj_30km.scale,  
      //   crs: prj_30km.crs,
      //   maxPixels: 1e13,
      //   skipEmptyTiles: true
      // });
      
      Export.image.toDrive({
        image: R2_OneVar_Img, 
        description: responseVarName_Str + "_R2", 
        folder: "Tile-Level_Accuracy", 
        region: AOI_Geom, 
        scale: prj_30km.scale,  
        crs: prj_30km.crs,
        maxPixels: 1e13,
        skipEmptyTiles: true
      });
      
      Export.image.toDrive({
        image: RMSE_OneVar_Img, 
        description: responseVarName_Str + "_RMSE", 
        folder: "Tile-Level_Accuracy", 
        region: AOI_Geom, 
        scale: prj_30km.scale,  
        crs: prj_30km.crs,
        maxPixels: 1e13,
        skipEmptyTiles: true
      });
      
      // // Output to Asset.
      // Export.image.toAsset({
      //   image: accuracy_OneVar_Img, 
      //   description: responseVarName_Str, 
      //   assetId: wd_Main_2_Str
      //     + "GEDI_Estimation/"
      //     + "Tile-Level_Accuracy/"
      //     + responseVarName_Str, 
      //   region: AOI_Geom, 
      //   scale: prj_30km.scale,  
      //   crs: prj_30km.crs,
      //   maxPixels: 1e13
      // });
    }
  }
}


/*******************************************************************************
 * 3) Export a few predictor variables at 300 m. *
 ******************************************************************************/

if (false) {
  
  // Output to Drive.
  Export.image.toDrive({
    image: L8_EVI_Img, 
    description: "L8_EVI", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: S2_kNDVI_Img, 
    description: "S2_kNDVI", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: S1_NDRI_Img, 
    description: "S1_NDRI", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: ALOS_Slope_Img, 
    description: "ALOS_Slope", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: LC_ESRI_Img, 
    description: "LC_ESRI", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: LC_GLC_Img, 
    description: "LC_GLC", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: SLA_Img, 
    description: "SLA", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  Export.image.toDrive({
    image: OCS_0_30cm_Img, 
    description: "OCS_0_30cm", 
    folder: "Predictors_300m", 
    region: AOI_Geom, 
    scale: prj_300m.scale,  
    crs: prj_300m.crs,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
}

