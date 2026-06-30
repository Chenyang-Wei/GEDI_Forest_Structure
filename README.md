# GEDI Forest Structure

Google Earth Engine workflows for local prediction of temperate forest structure in eastern North America using NASA GEDI LiDAR, radar, optical, and auxiliary environmental data.

This repository accompanies the following article:

> Wei, C., Sweeney, C. P., Roberts, T. H., Keebler, H., Fink, D., Zuckerberg, B., Jarzyna, M. A., & Zhao, K. (2026). Local prediction of temperate forest structure in Eastern North America using LiDAR, radar, and optical data. *Environmental Research Communications*. https://doi.org/10.1088/2515-7620/ae718d

## Overview

Forest structure is a key dimension of forest ecosystems, but field-based structural measurements are difficult to collect consistently across large regions. NASA's Global Ecosystem Dynamics Investigation (GEDI) mission provides spaceborne LiDAR observations of three-dimensional vegetation structure, but GEDI samples forests at discrete footprints rather than as continuous wall-to-wall maps.

This project develops a local modeling framework to predict GEDI-derived forest structural metrics at 30-m resolution across temperate broadleaf and mixed forests of eastern North America. The workflow integrates GEDI Level 2A and Level 2B observations with optical, radar, and auxiliary variables (topography, land cover, leaf traits, and soil properties) in Google Earth Engine. Local tile-specific random forest models are used to account for spatial nonstationarity in predictor–response relationships, and tile-level predictions are mosaicked into continuous regional outputs.

The published study covers approximately 1.17 million km² of temperate broadleaf and mixed forests in eastern North America for 2019–2022. It predicts 11 GEDI-derived structural metrics, including canopy height, canopy cover, foliage height diversity, plant area index, relative height differences, and vertical plant area volume density metrics.

## Repository contents

The public workflow is organized under [`Public/`](Public/):

```text
Public/
├── 00_Visualization/
│   ├── 00_01_Study_Area.js
│   ├── 00_02_Data_Collection.js
│   └── 00_03_Web_Application.js
├── 01_Study_Area_Determination/
│   ├── 01_01_BCR_Selection.js
│   ├── 01_02_AOI_Determination.js
│   ├── 01_03_GridCell_Creation.js
│   └── 01_04_Tile_Generation.js
├── 02_Data_Collection&Preprocessing/
│   ├── 02_00_GEDI-L2/
│   │   ├── 02_00_01_L2A_Variables.js
│   │   └── 02_00_02_L2B_Variables.js
│   ├── 02_01_HLSL30/
│   ├── 02_02_Sentinel-2/
│   ├── 02_03_ALOS/
│   ├── 02_04_Land_Cover/
│   ├── 02_05_Sentinel-1/
│   ├── 02_06_Leaf_Traits/
│   └── 02_07_Soil_Properties/
└── 03_GEDI_Estimation/
    ├── 03_01_Sample_Collection/
    ├── 03_02_Hyperparameter_Tuning/
    ├── 03_03_Variable_Prediction/
    ├── 03_04_Predictor_Analysis/
    ├── 03_05_Global_vs_Local/
    └── 03_06_Data_Output/
```

### Workflow summary

| Step | Folder | Purpose |
|---|---|---|
| 0 | `00_Visualization/` | Scripts for visualizing the study area, data layers, and the interactive web application. |
| 1 | `01_Study_Area_Determination/` | Define the study region, select Bird Conservation Regions, create grid cells, and generate overlapping modeling tiles. |
| 2 | `02_Data_Collection&Preprocessing/` | Prepare GEDI structural response variables and multisource predictor layers from optical, radar, topographic, land-cover, leaf-trait, and soil datasets. |
| 3 | `03_GEDI_Estimation/` | Collect training samples, tune random forest hyperparameters, predict GEDI-derived structural metrics, analyze predictor importance, compare global and local models, and export outputs. |

## Data sources

The workflow uses publicly available remote-sensing and environmental datasets accessible through Google Earth Engine or related public data services. Major inputs include:

- GEDI Level 2A and Level 2B products for forest structural measurements.
- Harmonized Landsat and Sentinel-2 surface reflectance products.
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

3. Review and update user-specific settings, including:

   - Earth Engine asset paths.
   - Google Drive export folders.
   - Study-area or tile identifiers.
   - Export flags.
   - Any project-specific naming conventions.

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
