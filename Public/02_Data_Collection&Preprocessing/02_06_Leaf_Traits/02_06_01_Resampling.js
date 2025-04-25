/*******************************************************************************
 * Introduction *
 * 
 *  1) Downscale each leaf trait to 30 m.
 * 
 * Last updated: 8/19/2024
 * 
 * Runtime: 1h ~ 2h
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


/****** Global Leaf trait estimates for land modelling. ******/
/****** (Moreno-Martínez et al., 2018, RSE). ******/

// Specific leaf area (mm2/g).
var SLA_Img = ee.Image(
  "projects/sat-io/open-datasets/GLOBAL-LEAF-TRAITS/SLA_1km_v3")
  .select([0], ["SLA"])
  .clip(AOI_Geom);

// Leaf nitrogen content per dry mass (mg/g).
var LNC_Img = ee.Image(
  "projects/sat-io/open-datasets/GLOBAL-LEAF-TRAITS/LNC_1km_v3")
  .select([0], ["LNC"])
  .clip(AOI_Geom);

// Leaf phosphorus content per dry mass (mg/g).
var LPC_Img = ee.Image(
  "projects/sat-io/open-datasets/GLOBAL-LEAF-TRAITS/LPC_1km_v3")
  .select([0], ["LPC"])
  .clip(AOI_Geom);

// Leaf dry matter content (g/g).
var LDMC_Img = ee.Image(
  "projects/sat-io/open-datasets/GLOBAL-LEAF-TRAITS/LDMC_1km_v3")
  .select([0], ["LDMC"])
  .clip(AOI_Geom);


/*******************************************************************************
 * 1) Downscale each leaf trait to 30 m. *
 ******************************************************************************/

// Identify unprocessed data.
//   (Positive values correspond with natural vegetated areas.)
var SLAmask_Img = SLA_Img.gt(0);

var LNCmask_Img = LNC_Img.gt(0);

var LPCmask_Img = LPC_Img.gt(0);

var LDMCmask_Img = LDMC_Img.gt(0);

// Mask the unprocessed data in the original Images.
SLA_Img = SLA_Img.updateMask(SLAmask_Img);

LNC_Img = LNC_Img.updateMask(LNCmask_Img);

LPC_Img = LPC_Img.updateMask(LPCmask_Img);

LDMC_Img = LDMC_Img.updateMask(LDMCmask_Img);

// "Bilinear" resampling for the processed data.
var SLA_30m_Img = SLA_Img.resample("bilinear")
  .reproject(prj_30m);

var LNC_30m_Img = LNC_Img.resample("bilinear")
  .reproject(prj_30m);

var LPC_30m_Img = LPC_Img.resample("bilinear")
  .reproject(prj_30m);

var LDMC_30m_Img = LDMC_Img.resample("bilinear")
  .reproject(prj_30m);

// "Nearest-neighbor" resampling for the unprocessed data.
var SLAmask_30m_Img = SLAmask_Img.reproject(prj_30m);

var LNCmask_30m_Img = LNCmask_Img.reproject(prj_30m);

var LPCmask_30m_Img = LPCmask_Img.reproject(prj_30m);

var LDMCmask_30m_Img = LDMCmask_Img.reproject(prj_30m);

// Mask the unprocessed data in the reprojected Images
//   and clip to the study area.
SLA_30m_Img = SLA_30m_Img.updateMask(SLAmask_30m_Img)
  .clip(studyArea_Geom);

LNC_30m_Img = LNC_30m_Img.updateMask(LNCmask_30m_Img)
  .clip(studyArea_Geom);

LPC_30m_Img = LPC_30m_Img.updateMask(LPCmask_30m_Img)
  .clip(studyArea_Geom);

LDMC_30m_Img = LDMC_30m_Img.updateMask(LDMCmask_30m_Img)
  .clip(studyArea_Geom);


/*******************************************************************************
 * Results *
 ******************************************************************************/

// Whether to export the result(s).
var export_Bool = true; // true OR false.

if (!export_Bool) {
  
  /****** Check the dataset(s) and object(s). ******/
  
  IMG_mod.Print_ImgInfo(
    "SLA_30m_Img:",
    SLA_30m_Img
  );
  
  // Visualization.
  Map.setOptions("Satellite");
  Map.centerObject(AOI_Geom, 8);
  
  Map.addLayer(AOI_Geom, 
    {
      color: "FFFFFF"
    }, 
    "AOI_Geom");

  Map.addLayer(SLA_Img, 
    {
      min: 7, 
      max: 22, 
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "SLA_Img");

  Map.addLayer(SLA_30m_Img, 
    {
      min: 7, 
      max: 22, 
      palette: PAL_mod.matplotlib.viridis[7]
    }, 
    "SLA_30m_Img");

} else {
  
  /****** Export the result(s). ******/
  
  //// Output to Asset.
  
  Export.image.toAsset({
    image: SLA_30m_Img, 
    description: "SLA", 
    assetId: wd_Main_2_Str
      + "Environmental_Data/"
      + "LeafTraits_Resampled/"
      + "SLA", 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: LNC_30m_Img, 
    description: "LNC", 
    assetId: wd_Main_2_Str
      + "Environmental_Data/"
      + "LeafTraits_Resampled/"
      + "LNC", 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: LPC_30m_Img, 
    description: "LPC", 
    assetId: wd_Main_2_Str
      + "Environmental_Data/"
      + "LeafTraits_Resampled/"
      + "LPC", 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
  
  Export.image.toAsset({
    image: LDMC_30m_Img, 
    description: "LDMC", 
    assetId: wd_Main_2_Str
      + "Environmental_Data/"
      + "LeafTraits_Resampled/"
      + "LDMC", 
    region: AOI_Geom, 
    scale: prj_30m.scale,  
    crs: prj_30m.crs,
    maxPixels: 1e13
  });
}

