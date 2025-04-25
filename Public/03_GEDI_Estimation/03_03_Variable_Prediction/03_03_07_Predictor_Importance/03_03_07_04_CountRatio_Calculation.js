/*******************************************************************************
 * Introduction *
 * 
 *  1) For each tile and each response variable,
 *     calculate the proportion of top-ranked predictors
 *     in each group.
 * 
 * Last updated: 10/29/2024
 * 
 * Runtime: 35m
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Modules *
 ******************************************************************************/

var ENA_mod = require(
  "users/ChenyangWei/Public:Modules/LiDAR-Birds/Eastern_North_America.js");


/*******************************************************************************
 * Objects *
 ******************************************************************************/

// Major working directories.
var wd_Main_1_Str = ENA_mod.wd_Birds_Str;

// Whether to output the result(s).
var output_Bool = true; // true/false.


/*******************************************************************************
 * Functions *
 ******************************************************************************/

// Calculate the predictor proportion for each group.
function Calculate_CountRatio(groupImportance_Ftr) {
  
  var rawCount_Num = groupImportance_Ftr.getNumber("GrpImpt_Count");
  
  var countRatio_Num = rawCount_Num.divide(varNumber_Num);
  
  return groupImportance_Ftr.set({
    GrpImpt_CountRatio: countRatio_Num
  });
}


/*******************************************************************************
 * Datasets *
 ******************************************************************************/

// Distinct summarized variable importance of each predictor group.
var summarized_Importance_FC = ee.FeatureCollection(
  wd_Main_1_Str
  + "GEDI_Estimation/"
  + "SummarizedImportance_Distinct");


/*******************************************************************************
 * 1) For each tile and each response variable,
 *    calculate the proportion of top-ranked predictors
 *    in each group. *
 ******************************************************************************/

// Number of predictors in each group.
var L8_VarNumber_Num = 19;
var S2_VarNumber_Num = 23;
var S1_VarNumber_Num = 5;
var TP_VarNumber_Num = 9;
var LC_VarNumber_Num = 2;
var LT_VarNumber_Num = 4;
var SP_VarNumber_Num = 31;


/* Calculate the predictor proportion for each group. */

// L8.
var L8_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "L8"
}));

var varNumber_Num = L8_VarNumber_Num;

L8_Predictors_FC = L8_Predictors_FC.map(Calculate_CountRatio);

// S2.
var S2_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "S2"
}));

var varNumber_Num = S2_VarNumber_Num;

S2_Predictors_FC = S2_Predictors_FC.map(Calculate_CountRatio);

// S1.
var S1_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "S1"
}));

var varNumber_Num = S1_VarNumber_Num;

S1_Predictors_FC = S1_Predictors_FC.map(Calculate_CountRatio);

// TP.
var TP_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "TP"
}));

var varNumber_Num = TP_VarNumber_Num;

TP_Predictors_FC = TP_Predictors_FC.map(Calculate_CountRatio);

// LC.
var LC_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "LC"
}));

var varNumber_Num = LC_VarNumber_Num;

LC_Predictors_FC = LC_Predictors_FC.map(Calculate_CountRatio);

// LT.
var LT_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "LT"
}));

var varNumber_Num = LT_VarNumber_Num;

LT_Predictors_FC = LT_Predictors_FC.map(Calculate_CountRatio);

// SP.
var SP_Predictors_FC = summarized_Importance_FC.filter(ee.Filter.eq({
  name: "Pred_Grp", 
  value: "SP"
}));

var varNumber_Num = SP_VarNumber_Num;

SP_Predictors_FC = SP_Predictors_FC.map(Calculate_CountRatio);

// Merge the calculation results.
var summarizedImportance_CountRatio_FC = ee.FeatureCollection([
  L8_Predictors_FC,
  S2_Predictors_FC,
  S1_Predictors_FC,
  TP_Predictors_FC,
  LC_Predictors_FC,
  LT_Predictors_FC,
  SP_Predictors_FC
]).flatten();


/*******************************************************************************
 * Results *
 ******************************************************************************/

if (!output_Bool) {
  
  // Data examination.
  print(
    "summarized_Importance_FC:",
    summarized_Importance_FC.first(), // 9 properties.
    summarized_Importance_FC.size(), // 115208 <= 1693 * 14 * 7 (groups).
    summarized_Importance_FC.limit(20)
  );
  
  print(
    "L8_Predictors_FC:",
    L8_Predictors_FC.first(),
    L8_Predictors_FC.size()
  );
  
  print(
    "SP_Predictors_FC:",
    SP_Predictors_FC.first(),
    SP_Predictors_FC.size()
  );
  
  print(
    "summarizedImportance_CountRatio_FC:",
    summarizedImportance_CountRatio_FC.first(),
    summarizedImportance_CountRatio_FC.size() // 115208.
  );
  
} else {
  
  // Export the result(s).
  
  var outputName_Str = "SummarizedImportance_CountRatio";
  
  Export.table.toAsset({
    collection: summarizedImportance_CountRatio_FC, 
    description: outputName_Str, 
    assetId: wd_Main_1_Str
      + "GEDI_Estimation/"
      + outputName_Str
  });
}

