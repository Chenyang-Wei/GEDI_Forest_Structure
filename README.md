# GEDI-Inferred ForesT Structure (GIFTS)

Google Earth Engine workflows for local prediction of temperate forest structure in eastern North America using NASA GEDI LiDAR, radar, optical, and auxiliary environmental data.

This repository accompanies the following article:

> Wei, C., Sweeney, C. P., Roberts, T. H., Keebler, H., Fink, D., Zuckerberg, B., Jarzyna, M. A., & Zhao, K. (2026). Local prediction of temperate forest structure in Eastern North America using LiDAR, radar, and optical data. *Environmental Research Communications*. https://doi.org/10.1088/2515-7620/ae718d

## Overview

Forest structure is a key dimension of forest ecosystems, but field-based structural measurements are difficult to collect consistently across large regions. NASA's Global Ecosystem Dynamics Investigation (GEDI) mission provides spaceborne LiDAR observations of three-dimensional vegetation structure, but GEDI samples forests at discrete footprints rather than as continuous wall-to-wall maps.

This project develops a local modeling framework to predict GEDI-derived forest structural metrics at 30-m resolution across temperate broadleaf and mixed forests of eastern North America. The workflow integrates GEDI Level 2A and Level 2B observations with optical, radar, topographic, land-cover, leaf-trait, and soil-property variables in Google Earth Engine. Local tile-specific random forest models are used to account for spatial nonstationarity in predictor–response relationships, and tile-level predictions are mosaicked into continuous regional outputs.

The published study covers approximately 1.17 million km² of temperate broadleaf and mixed forests in eastern North America for 2019–2022. It predicts 11 GEDI-derived structural metrics, including canopy height, canopy cover, foliage height diversity, plant area index, relative height differences, and vertical plant area volume density metrics.

## Repository contents and workflow

The reproducible Google Earth Engine workflow is organized under the [`Public/`](Public/) directory. Scripts are grouped by major processing stage and numbered to indicate the general order in which they were developed and run. Before running the scripts, users should review and update user-specific settings, including configuration options, file paths, Earth Engine asset IDs, Google Drive export folders, export flags, and project-specific naming conventions.

### Workflow summary

| Step | Folder | Purpose |
|---|---|---|
| 0 | `00_Visualization/` | Visualize the study area, data layers, and the interactive web application. |
| 1 | `01_Study_Area_Determination/` | Define the study domain, select Bird Conservation Regions, create grid cells, and generate overlapping modeling tiles. |
| 2 | `02_Data_Collection&Preprocessing/` | Prepare GEDI structural response variables and multisource predictor layers from optical, radar, topographic, land-cover, leaf-trait, and soil datasets. |
| 3 | `03_GEDI_Estimation/` | Collect training samples, tune random forest hyperparameters, predict GEDI-derived structural metrics, analyze predictor importance, compare global and local models, and export outputs. |

### 00. Visualization

Scripts in [`Public/00_Visualization/`](Public/00_Visualization/) provide utilities for visualizing the study area, checking input datasets, and creating the interactive Google Earth Engine web application.

```text
Public/00_Visualization/
├── 00_01_Study_Area.js        # Visualize datasets and check U.S. states and Canadian provinces intersecting the study domain.
├── 00_02_Data_Collection.js   # Visualize selected tiles, samples, and collected environmental predictor datasets.
└── 00_03_Web_Application.js   # Create a Google Earth Engine App for visualizing GIFTS in eastern North America.
```

### 01. Study area determination

Scripts in [`Public/01_Study_Area_Determination/`](Public/01_Study_Area_Determination/) define the spatial domain of the study, including Bird Conservation Region selection, area-of-interest delineation, grid-cell creation, and tile generation.

```text
Public/01_Study_Area_Determination/
├── 01_01_BCR_Selection.js        # Select the BCRs of interest and merge them into the study domain.
├── 01_02_AOI_Determination.js    # Compare the study domain with temperate broadleaf/mixed-forest ecoregions and define the rectangular AOI.
├── 01_03_GridCell_Creation.js    # Create grid cells, assign random Tile_ID values, and generate smaller AOI-covering grid cells.
└── 01_04_Tile_Generation.js      # Create 60-km overlapping tiles by merging 15-km grid cells.
```

### 02. Data collection and preprocessing

Scripts in [`Public/02_Data_Collection&Preprocessing/`](Public/02_Data_Collection%26Preprocessing/) collect and preprocess GEDI observations and predictor variables from public remote-sensing and environmental datasets. These scripts produce the Earth Engine assets used in model training, prediction, and validation.

```text
Public/02_Data_Collection&Preprocessing/
├── 02_00_GEDI-L2/
│   ├── 02_00_01_L2A_Variables.js           # Derive GEDI Level-2A variables.
│   └── 02_00_02_L2B_Variables.js           # Derive GEDI Level-2B variables.
│
├── 02_01_HLSL30/
│   ├── 02_01_01_Surface_Reflectance.js     # Preprocess HLS-2 Landsat imagery and create median surface-reflectance composites.
│   └── 02_01_02_Spectral_Indices.js        # Calculate spectral indices and perform Tasseled Cap transformation for the HLSL30 median composite.
│
├── 02_02_Sentinel-2/
│   ├── 02_02_01_Surface_Reflectance_10m.js # Preprocess 10-m Sentinel-2 bands and aggregate temporal median surface reflectance to 30 m.
│   ├── 02_02_02_Surface_Reflectance_20m.js # Preprocess 20-m Sentinel-2 bands and aggregate temporal median surface reflectance to 30 m.
│   └── 02_02_03_Spectral_Indices.js        # Calculate spectral indices and perform Tasseled Cap transformation for Sentinel-2 median surface reflectance.
│
├── 02_03_ALOS/
│   ├── 02_03_01_Calculated_Features.js     # Derive topographic features from 30-m ALOS elevation.
│   └── 02_03_02_Resampled_Features.js      # Downscale ALOS topographic variables to 30 m.
│
├── 02_04_Land_Cover/
│   ├── 02_04_01_ESRI.js                    # Determine local modal ESRI land cover and aggregate it to 30 m.
│   └── 02_04_02_GLC.js                     # Determine modal GLC land cover at each 30-m pixel during 2019-2022.
│
├── 02_05_Sentinel-1/
│   └── 02_05_01_Variables.js               # Collect preprocessed Sentinel-1 data and calculate 30-m variables for the study period.
│
├── 02_06_Leaf_Traits/
│   └── 02_06_01_Resampling.js              # Downscale leaf-trait variables to 30 m.
│
└── 02_07_Soil_Properties/
    └── 02_07_01_Resampling.js              # Downscale soil-property variables to 30 m.
```

### 03. GEDI-based forest-structure estimation

Scripts in [`Public/03_GEDI_Estimation/`](Public/03_GEDI_Estimation/) implement the modeling workflow for predicting GEDI-derived forest-structure metrics across Eastern North America. This includes sample extraction, random forest hyperparameter tuning, local prediction, predictor-importance analysis, comparison of local and global models, and final data export.

#### 03.01. Sample collection

```text
Public/03_GEDI_Estimation/03_01_Sample_Collection/
├── 03_01_01_Variable_Sampling.js        # Stack predictors, calculate GEDI relative-height differences, sample variables, and add pixel labels.
├── 03_01_02_Sample_Vectorization.js     # Vectorize sampled variables by tile.
├── 03_01_03_Tile_SampleCounting.js      # Count vectorized samples within each 60-km tile.
├── 03_01_04_GridCell_SampleCounting.js  # Join grid cells with counted tiles and count samples within each grid cell.
├── 03_01_05_Tile_Filtering.js           # Select adequately sampled grid cells and join selected tiles with those grid cells.
├── 03_01_06_Sample_Collection.js        # Randomly collect a fixed number of vectorized samples for each selected tile/grid-cell pair.
└── 03_01_07_Output_To_Drive.js          # Rename sample properties for shapefile compatibility and export collected samples to Google Drive.
```

#### 03.02. Hyperparameter tuning

```text
Public/03_GEDI_Estimation/03_02_Hyperparameter_Tuning/
├── 03_02_01_Tree_Number/
│   ├── 03_02_01_01_Modeling.js          # Train and test Random Forest models with candidate tree numbers for each response variable.
│   ├── 03_02_01_02_Result_Merging.js    # Merge all response-variable modeling results for tree-number selection.
│   └── 03_02_01_03_Visualization.js     # Display tree-number modeling results for each response variable.
│
└── 03_02_02_Other_Hyperparameters/
    ├── 03_02_02_01_1st-Round_Tuning.js  # Run first-round tuning for variables per split, minimum leaf population, and bagging fraction.
    ├── 03_02_02_02_2nd-Round_Tuning.js  # Run second-round tuning for variables per split, minimum leaf population, and bagging fraction.
    ├── 03_02_02_03_3rd-Round_Tuning.js  # Run third-round tuning for non-FHD response variables.
    ├── 03_02_02_04_3rd-Round_FHD.js     # Run third-round FHD tuning, including manual minimum-leaf-population selection.
    ├── 03_02_02_05_Result_Merging.js    # Merge testing results and optimal hyperparameter values across response variables.
    └── 03_02_02_06_Visualization.js     # Visualize hyperparameter tuning results.
```

#### 03.03. Variable prediction

```text
Public/03_GEDI_Estimation/03_03_Variable_Prediction/
├── 03_03_00_Visualization.js            # Composite and visualize tile-level estimates for each GEDI variable.
├── 03_03_01_NonFHD_Prediction.js        # Train and test tile-level Random Forest models for non-FHD response variables.
├── 03_03_02_FHD_Prediction.js           # Train and test tile-level Random Forest models for FHD.
├── 03_03_03_Accuracy_Merging.js         # Merge tile-level accuracy assessment results for all response variables.
├── 03_03_04_Accuracy_Examination.js     # Examine accuracy-assessment results for each response variable.
├── 03_03_05_Result_Composition.js       # Composite and visualize estimated GEDI variables across tiles.
│
├── 03_03_06_Weighted_Composition/
│   ├── 03_03_06_00_Visualization.js             # Visualize tile weights and compare average versus weighted composited results.
│   ├── 03_03_06_01_Centroid_Rasterization.js    # Rasterize the geometric centroid of each selected tile.
│   ├── 03_03_06_02_Distance_Calculation.js      # Derive normalized location-based weights from distance to each tile centroid.
│   ├── 03_03_06_03_MSEinverse_Calculation.js    # Calculate inverse MSE for selected grid cells and attach it to corresponding tiles.
│   ├── 03_03_06_04_MSEinverse_Normalization.js  # Normalize inverse MSE values by response variable and tile.
│   ├── 03_03_06_05_Weight_Combination.js        # Combine MSE-based and location-based weights by selected tile and response variable.
│   ├── 03_03_06_06_Result_Composition.js        # Calculate weighted-average GEDI estimates at each pixel for each selected variable.
│   └── 03_03_06_07_Result_Sampling.js           # Extract weighted-average GEDI estimates at each randomly collected sample.
│
├── 03_03_07_Predictor_Importance/
│   ├── 03_03_07_01_Importance_Re-arranging.js   # Rearrange variable importance for each tile and response variable.
│   ├── 03_03_07_02_Importance_Summarization.js  # Summarize variable importance by predictor group for each tile and response variable.
│   ├── 03_03_07_03_Importance_Distinct.js       # Identify distinct summarized variable-importance records by tile, response variable, and predictor group.
│   ├── 03_03_07_04_CountRatio_Calculation.js    # Calculate the proportion of top-ranked predictors in each predictor group.
│   └── 03_03_07_05_Importance_Ranking.js        # Rank predictor groups by summarized variable importance for each tile and response variable.
│
└── 03_03_08_Result_Sampling.js          # Extract estimated response variables at each randomly collected sample.
```

#### 03.04. Predictor analysis

```text
Public/03_GEDI_Estimation/03_04_Predictor_Analysis/
├── 03_04_00_Visualization.js          # Visualize predictor-comparison results for each response variable.
├── 03_04_01_Tile_Selection.js         # Randomly select tiles with at least 12,500 samples.
├── 03_04_02_Tile_Filtering.js         # Manually choose a subset of non-overlapping tiles.
├── 03_04_03_Sample_Collection.js      # Draw 10 sets of 1,250 GEDI samples without replacement from each selected non-overlapping tile.
├── 03_04_04_Sample_Split.js           # Split each drawing of 1,250 samples into training and testing subsets by selected non-overlapping tile.
├── 03_04_05_Complete_Modeling.js      # Train and test Random Forest models using all predictor variables for each tile and drawing.
├── 03_04_06_Partial_Modeling.js       # Train and test Random Forest models using predictor subsets for each tile and drawing.
├── 03_04_07_Model_Comparison.js       # Quantify the contribution of each predictor group for each drawing, tile, and response variable.
├── 03_04_08_Result_Merging.js         # Merge model-comparison results across all 10 drawings and response variables.
└── 03_04_09_Result_Aggregation.js     # Aggregate model-comparison results across all 10 drawings by tile and response variable.
```

#### 03.05. Global versus local modeling

```text
Public/03_GEDI_Estimation/03_05_Global_vs_Local/
├── 03_05_00_Visualization.js          # Compare estimation accuracy between global and local models for each response variable.
├── 03_05_01_Complete_Modeling.js      # Train global Random Forest models across selected tiles and locally test them within each tile.
├── 03_05_02_Result_Merging.js         # Merge globally trained and locally tested complete-model results across all response variables.
└── 03_05_03_Result_Aggregation.js     # Aggregate local testing results of global models across all 10 drawings by tile and response variable.
```

#### 03.06. Data output

```text
Public/03_GEDI_Estimation/03_06_Data_Output/
├── 03_06_01_FeatureCollection.js      # Output selected FeatureCollections to Google Drive.
├── 03_06_02_Image.js                  # Export composited GEDI estimates, rasterized tile-level accuracy, and selected predictors.
└── 03_06_03_Tile_Example.js           # Output data for a tile example.
```

## Data sources

The workflow uses publicly available remote-sensing and environmental datasets accessible through Google Earth Engine or related public data services. Major inputs include:

- NASA GEDI Level 2A and Level 2B products for forest structural measurements.
- Harmonized Landsat and Sentinel-2 Landsat surface reflectance products.
- Sentinel-2 optical imagery and derived spectral information.
- Sentinel-1 synthetic aperture radar data.
- ALOS topographic information.
- Land-cover products.
- Leaf-trait and soil-property covariates.

Please check the individual scripts for the exact Earth Engine image collections, feature collections, band names, filters, and preprocessing choices used in each step.

## Main outputs

The workflow was designed to generate wall-to-wall, 30-m predictions of GEDI-derived forest structural metrics for the study region. Depending on the script and export settings, outputs may include:

- Study-area and modeling-tile assets.
- GEDI response-variable layers and sample collections.
- Predictor stacks for each modeling tile.
- Tile-level random forest model predictions.
- Local model performance summaries.
- Predictor-importance summaries.
- Global-versus-local model comparison outputs.
- Final mosaicked forest-structure prediction layers.
- Web-application visualization layers.

Large raster outputs and intermediate Earth Engine assets are not stored directly in this GitHub repository. Users should run the scripts in their own Google Earth Engine environment and update asset paths, export folders, and project-specific identifiers as needed.

## Interactive visualization

An interactive Google Earth Engine web application for exploring the predicted forest structural metrics is available here:

https://lidar-birds.projects.earthengine.app/view/gifts

## Getting started

### Requirements

To run or adapt the workflow, you will need:

- A Google Earth Engine account.
- Access to the Google Earth Engine Code Editor.
- Sufficient Earth Engine asset storage, computational capacity, and export quota for large regional processing.
- Basic familiarity with the Earth Engine JavaScript API.

This repository is written in JavaScript for Google Earth Engine.

### Suggested use

1. Clone or download this repository.

   ```bash
   git clone https://github.com/Chenyang-Wei/GEDI_Forest_Structure.git
   ```

2. Open the relevant `.js` scripts in the Google Earth Engine Code Editor.

3. Review and update user-specific settings, including configuration options, file paths, Earth Engine asset IDs, Google Drive export folders, export flags, and project-specific naming conventions.

4. Run the scripts in sequence following the folder numbering:

   ```text
   01_Study_Area_Determination
   02_Data_Collection&Preprocessing
   03_GEDI_Estimation
   ```

5. Use the visualization scripts in `00_Visualization/` to inspect the study area, data products, and web-application layers.

## Reproducibility notes

The scripts provide the public Google Earth Engine workflow used for the published study. Exact reproduction may require:

- Access to the same Earth Engine datasets and dataset versions.
- Sufficient compute quota for large regional exports.
- Correct replacement of user-specific Earth Engine asset paths.
- Consistent study-period, study-area, tile, and model-parameter settings.

Because Earth Engine datasets and data catalogs may be updated over time, users should record dataset versions, script versions, and export dates when reproducing or extending the analysis.

## Citation

If you use this repository, adapt the workflow, or use outputs derived from this project, please cite the associated paper:

```bibtex
@article{wei2026gediForestStructure,
  title   = {Local prediction of temperate forest structure in Eastern North America using {LiDAR}, radar, and optical data},
  author  = {Wei, Chenyang and Sweeney, Colin P. and Roberts, Trevor Holden and Keebler, Hikaru and Fink, Daniel and Zuckerberg, Benjamin and Jarzyna, Marta A. and Zhao, Kaiguang},
  journal = {Environmental Research Communications},
  year    = {2026},
  doi     = {10.1088/2515-7620/ae718d},
  url     = {https://doi.org/10.1088/2515-7620/ae718d}
}
```

You may also cite this GitHub repository when referencing the code implementation:

```text
Wei, C. (2024-2026). GEDI_Forest_Structure: Google Earth Engine workflows for local prediction of temperate forest structure in eastern North America. GitHub. https://github.com/Chenyang-Wei/GEDI_Forest_Structure
```

## License

This repository is released under the MIT License. See [`LICENSE`](LICENSE) for the full license text.

The MIT License permits reuse, modification, distribution, sublicensing, and commercial use of the repository code, provided that the copyright notice and permission notice are included in copies or substantial portions of the software. The software is provided without warranty.

Although the MIT License allows broad reuse of the code, scholarly and professional reuse should still cite the associated paper and acknowledge this repository where appropriate.

The MIT License applies to the code and documentation in this repository. Third-party datasets, Google Earth Engine data products, satellite imagery, derived scientific publications, and external web services may be governed by their own licenses, terms of use, or citation requirements.

## Contact

For questions about the repository or associated paper, please contact:

**Chenyang Wei**  
GitHub: [@Chenyang-Wei](https://github.com/Chenyang-Wei)  
Project repository: https://github.com/Chenyang-Wei/GEDI_Forest_Structure

## Acknowledgements

This project uses NASA GEDI observations and multiple public remote-sensing and environmental datasets made available through Google Earth Engine and related data providers. We gratefully acknowledge the data providers, the Google Earth Engine platform, and the collaborators and coauthors who contributed to the associated study.

This work was supported by the U.S. National Science Foundation under awards DEB-2307188 to Marta A. Jarzyna and Kaiguang Zhao and DEB-2307189 to Benjamin Zuckerberg. Any opinions, findings, conclusions, or recommendations expressed in this material are those of the authors and do not necessarily reflect the views of the U.S. National Science Foundation.
