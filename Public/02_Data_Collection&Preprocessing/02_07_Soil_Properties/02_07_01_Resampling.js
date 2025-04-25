/*******************************************************************************
 * Introduction *
 * 
 *  1) Downscale each soil property to 30 m.
 * 
 * Last updated: 8/19/2024
 * 
 * Runtime: 58m ~ 1h
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

// Area of interest.
var AOI_Geom = ENA_mod.AOI_Geom;

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_OSU_Str;

var wd_Main_2_Str = ENA_mod.wd_EO_Str;


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// N/A.


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Study area geometry.
var studyArea_Geom = ee.Feature(ee.FeatureCollection(
  wd_Main_1_Str + "Study_Domain/StudyArea_SelectedBCRs"
).first()).geometry();


/****** Soil Grids 250m (v2.0). ******/

// Whether to export the result(s).
var export_Bool = false; // true OR false.

// ID of a soil layer (0 ~ 3).
var layerID_Num = 3;

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  var ocs_Img = ee.Image(
    "projects/soilgrids-isric/ocs_mean")
    .clip(AOI_Geom);

} else {
  
  // Other properties.
  var bdod_Img = ee.Image(
    "projects/soilgrids-isric/bdod_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var cec_Img = ee.Image(
    "projects/soilgrids-isric/cec_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var cfvo_Img = ee.Image(
    "projects/soilgrids-isric/cfvo_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var clay_Img = ee.Image(
    "projects/soilgrids-isric/clay_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var sand_Img = ee.Image(
    "projects/soilgrids-isric/sand_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var silt_Img = ee.Image(
    "projects/soilgrids-isric/silt_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var nitrogen_Img = ee.Image(
    "projects/soilgrids-isric/nitrogen_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var phh20_Img = ee.Image(
    "projects/soilgrids-isric/phh2o_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var soc_Img = ee.Image(
    "projects/soilgrids-isric/soc_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
  
  var ocd_Img = ee.Image(
    "projects/soilgrids-isric/ocd_mean")
    .select(layerID_Num)
    .clip(AOI_Geom);
}


/*******************************************************************************
 * 1) Downscale each soil property to 30 m. *
 ******************************************************************************/

//// Identify data masks.

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  var ocsMask_Img = ocs_Img.mask();

} else {
  
  // Other properties.
  var bdodMask_Img = bdod_Img.mask();
  var cecMask_Img = cec_Img.mask();
  var cfvoMask_Img = cfvo_Img.mask();
  var clayMask_Img = clay_Img.mask();
  var sandMask_Img = sand_Img.mask();
  var siltMask_Img = silt_Img.mask();
  var nitrogenMask_Img = nitrogen_Img.mask();
  var phh20Mask_Img = phh20_Img.mask();
  var socMask_Img = soc_Img.mask();
  var ocdMask_Img = ocd_Img.mask();
}


//// "Bilinear" resampling for the unmasked data.

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  var ocs_30m_Img = ocs_Img.resample("bilinear")
    .reproject(prj_30m);

} else {
  
  // Other properties.
  var bdod_30m_Img = bdod_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var cec_30m_Img = cec_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var cfvo_30m_Img = cfvo_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var clay_30m_Img = clay_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var sand_30m_Img = sand_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var silt_30m_Img = silt_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var nitrogen_30m_Img = nitrogen_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var phh20_30m_Img = phh20_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var soc_30m_Img = soc_Img.resample("bilinear")
    .reproject(prj_30m);
  
  var ocd_30m_Img = ocd_Img.resample("bilinear")
    .reproject(prj_30m);
}


//// "Nearest-neighbor" resampling for data masks.

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  var ocsMask_30m_Img = ocsMask_Img.reproject(prj_30m);

} else {
  
  // Other properties.
  var bdodMask_30m_Img = bdodMask_Img.reproject(prj_30m);
  
  var cecMask_30m_Img = cecMask_Img.reproject(prj_30m);
  
  var cfvoMask_30m_Img = cfvoMask_Img.reproject(prj_30m);
  
  var clayMask_30m_Img = clayMask_Img.reproject(prj_30m);
  
  var sandMask_30m_Img = sandMask_Img.reproject(prj_30m);
  
  var siltMask_30m_Img = siltMask_Img.reproject(prj_30m);
  
  var nitrogenMask_30m_Img = nitrogenMask_Img.reproject(prj_30m);
  
  var phh20Mask_30m_Img = phh20Mask_Img.reproject(prj_30m);
  
  var socMask_30m_Img = socMask_Img.reproject(prj_30m);
  
  var ocdMask_30m_Img = ocdMask_Img.reproject(prj_30m);
}


//// Mask the reprojected Images.

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  ocs_30m_Img = ocs_30m_Img.updateMask(ocsMask_30m_Img);

} else {
  
  // Other properties.
  bdod_30m_Img = bdod_30m_Img.updateMask(bdodMask_30m_Img);
  
  cec_30m_Img = cec_30m_Img.updateMask(cecMask_30m_Img);
  
  cfvo_30m_Img = cfvo_30m_Img.updateMask(cfvoMask_30m_Img);
  
  clay_30m_Img = clay_30m_Img.updateMask(clayMask_30m_Img);
  
  sand_30m_Img = sand_30m_Img.updateMask(sandMask_30m_Img);
  
  silt_30m_Img = silt_30m_Img.updateMask(siltMask_30m_Img);
  
  nitrogen_30m_Img = nitrogen_30m_Img.updateMask(nitrogenMask_30m_Img);
  
  phh20_30m_Img = phh20_30m_Img.updateMask(phh20Mask_30m_Img);
  
  soc_30m_Img = soc_30m_Img.updateMask(socMask_30m_Img);
  
  ocd_30m_Img = ocd_30m_Img.updateMask(ocdMask_30m_Img);
}


//// Concatenate all the soil property Images into one multi-band Image.

if (layerID_Num == 3) {
  
  // "ocs_0-30cm_mean".
  var soilProperties_30m_Img = ocs_30m_Img;

} else {
  
  // Other properties.
  var soilProperties_30m_Img = ee.Image.cat([
    bdod_30m_Img,
    cec_30m_Img,
    cfvo_30m_Img,
    clay_30m_Img,
    sand_30m_Img,
    silt_30m_Img,
    nitrogen_30m_Img,
    phh20_30m_Img,
    soc_30m_Img,
    ocd_30m_Img
  ]);
}


//// Clip to the study area.

soilProperties_30m_Img = soilProperties_30m_Img
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  if (layerID_Num == 3) {
    
    // "ocs_0-30cm_mean".
    IMG_mod.Print_ImgInfo(
      "ocs_Img:",
      ocs_Img
    );
    
    Map.addLayer(ocs_Img, 
      {
        min: 6, 
        max: 189, 
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "ocs_Img");
  
    Map.addLayer(soilProperties_30m_Img, 
      {
        min: 6, 
        max: 189, 
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "ocs_30m_Img");
    
  } else {
    
    // Other properties.
    IMG_mod.Print_ImgInfo(
      "sand_Img:",
      sand_Img
    );
    
    Map.addLayer(sand_Img, 
      {
        min: 50, 
        max: 1000, 
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "sand_Img");
    
    Map.addLayer(soilProperties_30m_Img.select(4), 
      {
        min: 50, 
        max: 1000, 
        palette: PAL_mod.matplotlib.viridis[7]
      }, 
      "sand_30m_Img");
  }
  
  IMG_mod.Print_ImgInfo(
    "soilProperties_30m_Img:",
    soilProperties_30m_Img
  );
  
} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  if (layerID_Num == 3) {
    
    // "ocs_0-30cm_mean".
    var output_FileName_Str = "OCS_0-30cm";
    
  } else if (layerID_Num === 0) {
    
    // Other properties.
    var output_FileName_Str = "Properties_"
      + "0-5cm";
    
  } else if (layerID_Num == 1) {
    
    // Other properties.
    var output_FileName_Str = "Properties_"
      + "5-15cm";
    
  } else if (layerID_Num == 2) {
    
    // Other properties.
    var output_FileName_Str = "Properties_"
      + "15-30cm";
  }
  
  Export.image.toAsset({
    image: soilProperties_30m_Img, 
    description: output_FileName_Str, 
    assetId: wd_Main_2_Str
      + "Environmental_Data/"
      + "SoilProperties_Resampled/"
      + output_FileName_Str, 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

