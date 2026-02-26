/*******************************************************************************
 * Introduction *
 * 
 *   This script creates a Google Earth Engine App to visualize the dataset of
 *     GEDI-Inferred ForesT Structure (GIFTS) in eastern North America.
 * 
 * Source:
 *   https://doi.org/10.31223/X5ZR0P
 * 
 * Note: 
 *   The UI Pattern Template was provided by Tyler Erickson (tylere@google.com)
 *     and Justin Braaten (braaten@google.com) at Google.
 * 
 * Updated: 11/21/2025.
 * 
 * Author: Chenyang Wei (chenyangwei.cwei@gmail.com)
 ******************************************************************************/


/*******************************************************************************
 * Model *
 ******************************************************************************/

// Define a JSON object for storing the data model.
var m = {};

// Define a scalar for rounding numbers.
m.scalar = 1e2;

// Define a set of theme colors.
m.themeColors = {};
m.themeColors.blue = "0000FF";
m.themeColors.navyBlue = "000080";
m.themeColors.lightGray = "F0F0F0";
m.themeColors.darkGray = "505050";

// Define a few visualization palettes.
m.visPalettes = {};

m.visPalettes.NDVI = 
  "FFFFFF, CE7E45, DF923D, F1B555, FCD163, 99B718, 74A901, 66A000, 529400, "
    + "3E8601, 207401, 056201, 004C00, 023B01, 012E01, 011D01, 011301";

m.visPalettes.viridis = 
  "#440154, #481467, #482576, #453781, #404688, #39558C, #33638D, #2D718E, "
    + "#287D8E, #238A8D, #1F968B, #20A386, #29AF7F, #3DBC74, #56C667, #75D054, "
    + "#95D840, #BADE28, #DDE318, #FDE725";

m.visPalettes.magma = 
  "#000004, #07061C, #150E38, #29115A, #3F0F72, #56147D, #6A1C81, #802582, "
    + "#942C80, #AB337C, #C03A76, #D6456C, #E85362, #F4695C, #FA815F, #FD9B6B, "
    + "#FEB47B, #FECD90, #FDE5A7, #FCFDBF";

// Define the major file path.
m.filePath = "projects/my-new-gee-project/assets/"
  + "LiDAR-Birds/Eastern_North_America/GEDI_Estimation/"
  + "Composited_Results/Weighted/";

// Define the Images of GEDI-derived metrics.
m.metricImages = {};

m.metricImages.rh98 = ee.Image(
  m.filePath + "rh98"
);
m.metricImages.cover = ee.Image(
  m.filePath + "cover"
);
m.metricImages.pai = ee.Image(
  m.filePath + "pai"
);
m.metricImages.fhd_normal = ee.Image(
  m.filePath + "fhd_normal"
);

m.metricImages.PAVD_0_10m = ee.Image(
  m.filePath + "PAVD_0_10m"
);
m.metricImages.PAVD_10_20m = ee.Image(
  m.filePath + "PAVD_10_20m"
);
m.metricImages.PAVD_20_30m = ee.Image(
  m.filePath + "PAVD_20_30m"
);
m.metricImages.PAVD_30_40m = ee.Image(
  m.filePath + "PAVD_30_40m"
);

m.metricImages.RHD_25to50 = ee.Image(
  m.filePath + "RHD_25to50"
);
m.metricImages.RHD_50to75 = ee.Image(
  m.filePath + "RHD_50to75"
);
m.metricImages.RHD_75to98 = ee.Image(
  m.filePath + "RHD_75to98"
);

// Create a multi-band Images of all metrics.
m.metricImages.allMetrics = ee.Image.cat([
  m.metricImages.rh98,
  m.metricImages.cover,
  m.metricImages.pai,
  m.metricImages.fhd_normal,
  
  m.metricImages.PAVD_0_10m,
  m.metricImages.PAVD_10_20m,
  m.metricImages.PAVD_20_30m,
  m.metricImages.PAVD_30_40m,
  
  m.metricImages.RHD_25to50,
  m.metricImages.RHD_50to75,
  m.metricImages.RHD_75to98
]);

// Define the GEDI-derived metric names.
m.metricNames = {};

m.metricNames.rh98 = "Canopy height (m)";
m.metricNames.cover = "Total canopy cover fraction";
m.metricNames.pai = "Total plant area index (m²/m²)";
m.metricNames.fhd_normal = "Foliage height diversity";

m.metricNames.PAVD_0_10m = "0m ~ 10m";
m.metricNames.PAVD_10_20m = "10m ~ 20m";
m.metricNames.PAVD_20_30m = "20m ~ 30m";
m.metricNames.PAVD_30_40m = "30m ~ 40m";

m.metricNames.RHD_25to50 = "25% ~ 50%";
m.metricNames.RHD_50to75 = "50% ~ 75%";
m.metricNames.RHD_75to98 = "75% ~ 98%";

// Define the names of metric types.
m.metricTypeNames = {};
m.metricTypeNames.footprint = "Footprint-level metrics";
m.metricTypeNames.PAVD = "Plant area volume density (m²/m³)";
m.metricTypeNames.RHD = "Relative height difference (m)";

// Define a group of metric values.
m.metricValues = {};


/*******************************************************************************
 * Components *
 ******************************************************************************/

// Define a JSON object for storing UI components.
var c = {};

// Define a control panel for user input.
c.controlPanel = ui.Panel();

// Define a series of panel widgets to be used as horizontal dividers.
c.dividers = {};
c.dividers.divider1 = ui.Panel();
c.dividers.divider2 = ui.Panel();
c.dividers.divider3 = ui.Panel();
c.dividers.divider4 = ui.Panel();

// Define the main interactive map.
c.map = ui.Map();

// Define an app info widget group.
c.info = {};
c.info.titleLabel = 
  ui.Label(
    "GEDI-Inferred ForesT Structure (GIFTS) in Eastern North America");

// Brief introduction.
c.info.introTitles = {};
c.info.introLabels = {};
c.info.introLabels.label_1 = 
  ui.Label(
    "Exlore the 30-m locally predicted temperate forest structure "
      + "in Eastern North America based on LiDAR, radar, and optical data.");
c.info.introTitles.title_1 = 
  ui.Label(
    "Step 1 - Display forest structural metrics on the map");
c.info.introTitles.title_2 = 
  ui.Label(
    "Step 2 - Click on the map to inspect local metric values");
c.info.introPanel = 
  ui.Panel({
    widgets: [
      c.info.introLabels.label_1,
      c.info.introTitles.title_1,
      c.info.introTitles.title_2
    ]
  });

// Web links.
c.info.webLinks = {};
c.info.webLinks.link_1 = 
  ui.Label({
    value: "Check the Code",
    targetUrl: "https://github.com/AccountName/"
      + "RepositoryName/tree/main/Eastern_North_America/"
      + "GEE/GEDI_Data_Fusion"
  });
c.info.linkPanel = 
  ui.Panel({
    widgets: [
      c.info.webLinks.link_1
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

// Combine all the info widgets.
c.info.panel = 
  ui.Panel([
    c.info.titleLabel, 
    c.info.introPanel,
    // c.info.linkPanel
  ]);

// Define a group of metric type labels.
c.metricTypeLabels = {};
c.metricTypeLabels.footprint = 
  ui.Label(
    "1. " + m.metricTypeNames.footprint + ":"
  );
c.metricTypeLabels.PAVD = 
  ui.Label(
    "2. " + m.metricTypeNames.PAVD + ":"
  );
c.metricTypeLabels.RHD = 
  ui.Label(
    "3. " + m.metricTypeNames.RHD + ":"
  );

// Define a group of checkboxes.
c.checkboxes = {};

c.checkboxes.allFootprint = 
  ui.Checkbox({
    label: "All", 
    value: false
  });
c.checkboxes.rh98 = 
  ui.Checkbox({
    label: m.metricNames.rh98, 
    value: true
  });
c.checkboxes.cover = 
  ui.Checkbox({
    label: m.metricNames.cover, 
    value: false
  });
c.checkboxes.pai = 
  ui.Checkbox({
    label: m.metricNames.pai, 
    value: false
  });
c.checkboxes.fhd_normal = 
  ui.Checkbox({
    label: m.metricNames.fhd_normal, 
    value: false
  });

c.checkboxes.allPAVD = 
  ui.Checkbox({
    label: "All", 
    value: false
  });
c.checkboxes.PAVD_0_10m = 
  ui.Checkbox({
    label: m.metricNames.PAVD_0_10m, 
    value: false
  });
c.checkboxes.PAVD_10_20m = 
  ui.Checkbox({
    label: m.metricNames.PAVD_10_20m, 
    value: false
  });
c.checkboxes.PAVD_20_30m = 
  ui.Checkbox({
    label: m.metricNames.PAVD_20_30m, 
    value: false
  });
c.checkboxes.PAVD_30_40m = 
  ui.Checkbox({
    label: m.metricNames.PAVD_30_40m, 
    value: false
  });

c.checkboxes.allRHD = 
  ui.Checkbox({
    label: "All", 
    value: false
  });
c.checkboxes.RHD_25to50 = 
  ui.Checkbox({
    label: m.metricNames.RHD_25to50, 
    value: false
  });
c.checkboxes.RHD_50to75 = 
  ui.Checkbox({
    label: m.metricNames.RHD_50to75, 
    value: false
  });
c.checkboxes.RHD_75to98 = 
  ui.Checkbox({
    label: m.metricNames.RHD_75to98, 
    value: false
  });

// Define a group of checkbox panels.
c.checkboxPanels = {};

c.checkboxPanels.footprint = 
  ui.Panel([
    c.checkboxes.allFootprint,
    c.checkboxes.rh98,
    c.checkboxes.cover,
    c.checkboxes.pai,
    c.checkboxes.fhd_normal
  ]);

c.checkboxPanels.PAVD = 
  ui.Panel([
    c.checkboxes.allPAVD,
    ui.Panel({
      widgets: [
        c.checkboxes.PAVD_0_10m,
        c.checkboxes.PAVD_10_20m
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    }),
    ui.Panel({
      widgets: [
        c.checkboxes.PAVD_20_30m,
        c.checkboxes.PAVD_30_40m
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

c.checkboxPanels.RHD = 
  ui.Panel([
    c.checkboxes.allRHD,
    ui.Panel({
      widgets: [
        c.checkboxes.RHD_25to50,
        c.checkboxes.RHD_50to75
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    }),
    ui.Panel({
      widgets: [
        c.checkboxes.RHD_75to98
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

// Define a group of legend color bars.
c.legendColorbars = {};
c.legendColorbars.footprint = 
  ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legendColorbars.PAVD = 
  ui.Thumbnail(ee.Image.pixelLonLat().select(0));
c.legendColorbars.RHD = 
  ui.Thumbnail(ee.Image.pixelLonLat().select(0));

// Define a group of metric extremes.
c.metricExtremes = {};
c.metricExtremes.min = {};
c.metricExtremes.max = {};
c.metricExtremes.min.rh98 = 2.6;
c.metricExtremes.max.rh98 = 40;
c.metricExtremes.min.cover = 0.01;
c.metricExtremes.max.cover = 0.9;
c.metricExtremes.min.pai = 0.02;
c.metricExtremes.max.pai = 4.6;
c.metricExtremes.min.fhd_normal = 1.3;
c.metricExtremes.max.fhd_normal = 3.3;
c.metricExtremes.min.PAVD = 0;
c.metricExtremes.max.PAVD = 0.2;
c.metricExtremes.min.RHD = 0;
c.metricExtremes.max.RHD = 10;

// Define a group of legend labels.
c.legendLabels = {};
c.legendLabels.min = {};
c.legendLabels.max = {};
c.legendLabels.min.rh98 = 
  ui.Label(c.metricExtremes.min.rh98);
c.legendLabels.max.rh98 = 
  ui.Label(c.metricExtremes.max.rh98);
c.legendLabels.min.cover = 
  ui.Label(c.metricExtremes.min.cover);
c.legendLabels.max.cover = 
  ui.Label(c.metricExtremes.max.cover);
c.legendLabels.min.pai = 
  ui.Label(c.metricExtremes.min.pai);
c.legendLabels.max.pai = 
  ui.Label(c.metricExtremes.max.pai);
c.legendLabels.min.fhd_normal = 
  ui.Label(c.metricExtremes.min.fhd_normal);
c.legendLabels.max.fhd_normal = 
  ui.Label(c.metricExtremes.max.fhd_normal);
c.legendLabels.min.PAVD = 
  ui.Label(c.metricExtremes.min.PAVD);
c.legendLabels.max.PAVD = 
  ui.Label(c.metricExtremes.max.PAVD);
c.legendLabels.min.RHD = 
  ui.Label(c.metricExtremes.min.RHD);
c.legendLabels.max.RHD = 
  ui.Label(c.metricExtremes.max.RHD);

// Define a group of legend label panels.
c.legendLabelPanels = {};
c.legendLabelPanels.rh98 = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.rh98,
      c.legendLabels.max.rh98
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });
c.legendLabelPanels.cover = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.cover,
      c.legendLabels.max.cover
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });
c.legendLabelPanels.pai = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.pai,
      c.legendLabels.max.pai
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });
c.legendLabelPanels.fhd_normal = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.fhd_normal,
      c.legendLabels.max.fhd_normal
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });
c.legendLabelPanels.PAVD = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.PAVD,
      c.legendLabels.max.PAVD
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });
c.legendLabelPanels.RHD = 
  ui.Panel({
    widgets: [
      c.legendLabels.min.RHD,
      c.legendLabels.max.RHD
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

// Define a group of legend panels.
c.legendPanels = {};

c.legendPanels.footprint = 
  ui.Panel([
    c.legendColorbars.footprint,
    c.legendLabelPanels.rh98,
    c.legendLabelPanels.cover,
    c.legendLabelPanels.pai,
    c.legendLabelPanels.fhd_normal
  ]);

c.legendPanels.PAVD = 
  ui.Panel([
    c.legendColorbars.PAVD,
    c.legendLabelPanels.PAVD
  ]);

c.legendPanels.RHD = 
  ui.Panel([
    c.legendColorbars.RHD,
    c.legendLabelPanels.RHD
  ]);

// Define a group of metric selection panels.
c.metricPanels = {};

c.metricPanels.footprint = 
  ui.Panel([
    c.metricTypeLabels.footprint,
    ui.Panel({
      widgets: [
        c.checkboxPanels.footprint,
        c.legendPanels.footprint
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

c.metricPanels.PAVD = 
  ui.Panel([
    c.metricTypeLabels.PAVD,
    ui.Panel({
      widgets: [
        c.checkboxPanels.PAVD,
        c.legendPanels.PAVD
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

c.metricPanels.RHD = 
  ui.Panel([
    c.metricTypeLabels.RHD,
    ui.Panel({
      widgets: [
        c.checkboxPanels.RHD,
        c.legendPanels.RHD
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

// Define a panel for inspecting a local point.
c.inspector = {};

c.inspector.TitleLabels = {};
c.inspector.NameLabels = {};
c.inspector.ValueLabels = {};

c.inspector.MetricTypePanels = {};
c.inspector.MetricPanels = {};
c.inspector.ChartPanels = {};

c.inspector.shownButton = 
  ui.Button("Show inspector"); // Hide the container panel.

// Footprint-level metrics.
c.inspector.TitleLabels.footprint = 
  ui.Label(m.metricTypeNames.footprint);

c.inspector.NameLabels.rh98 = 
  ui.Label(m.metricNames.rh98 + ":");
c.inspector.ValueLabels.rh98 = 
  ui.Label();
c.inspector.MetricPanels.rh98 = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.rh98,
      c.inspector.ValueLabels.rh98
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.cover = 
  ui.Label(m.metricNames.cover + ":");
c.inspector.ValueLabels.cover = 
  ui.Label();
c.inspector.MetricPanels.cover = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.cover,
      c.inspector.ValueLabels.cover
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.pai = 
  ui.Label(m.metricNames.pai + ":");
c.inspector.ValueLabels.pai = 
  ui.Label();
c.inspector.MetricPanels.pai = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.pai,
      c.inspector.ValueLabels.pai
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.fhd_normal = 
  ui.Label(m.metricNames.fhd_normal + ":");
c.inspector.ValueLabels.fhd_normal = 
  ui.Label();
c.inspector.MetricPanels.fhd_normal = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.fhd_normal,
      c.inspector.ValueLabels.fhd_normal
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

// PAVD metrics.
c.inspector.TitleLabels.PAVD = 
  ui.Label(m.metricTypeNames.PAVD);

c.inspector.NameLabels.PAVD_0_10m = 
  ui.Label(m.metricNames.PAVD_0_10m + ":");
c.inspector.ValueLabels.PAVD_0_10m = 
  ui.Label();
c.inspector.MetricPanels.PAVD_0_10m = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.PAVD_0_10m,
      c.inspector.ValueLabels.PAVD_0_10m
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.PAVD_10_20m = 
  ui.Label(m.metricNames.PAVD_10_20m + ":");
c.inspector.ValueLabels.PAVD_10_20m = 
  ui.Label();
c.inspector.MetricPanels.PAVD_10_20m = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.PAVD_10_20m,
      c.inspector.ValueLabels.PAVD_10_20m
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.PAVD_20_30m = 
  ui.Label(m.metricNames.PAVD_20_30m + ":");
c.inspector.ValueLabels.PAVD_20_30m = 
  ui.Label();
c.inspector.MetricPanels.PAVD_20_30m = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.PAVD_20_30m,
      c.inspector.ValueLabels.PAVD_20_30m
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.PAVD_30_40m = 
  ui.Label(m.metricNames.PAVD_30_40m + ":");
c.inspector.ValueLabels.PAVD_30_40m = 
  ui.Label();
c.inspector.MetricPanels.PAVD_30_40m = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.PAVD_30_40m,
      c.inspector.ValueLabels.PAVD_30_40m
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

// RHD metrics.
c.inspector.TitleLabels.RHD = 
  ui.Label(m.metricTypeNames.RHD);

c.inspector.NameLabels.RHD_25to50 = 
  ui.Label(m.metricNames.RHD_25to50 + ":");
c.inspector.ValueLabels.RHD_25to50 = 
  ui.Label();
c.inspector.MetricPanels.RHD_25to50 = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.RHD_25to50,
      c.inspector.ValueLabels.RHD_25to50
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.RHD_50to75 = 
  ui.Label(m.metricNames.RHD_50to75 + ":");
c.inspector.ValueLabels.RHD_50to75 = 
  ui.Label();
c.inspector.MetricPanels.RHD_50to75 = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.RHD_50to75,
      c.inspector.ValueLabels.RHD_50to75
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.NameLabels.RHD_75to98 = 
  ui.Label(m.metricNames.RHD_75to98 + ":");
c.inspector.ValueLabels.RHD_75to98 = 
  ui.Label();
c.inspector.MetricPanels.RHD_75to98 = 
  ui.Panel({
    widgets: [
      c.inspector.NameLabels.RHD_75to98,
      c.inspector.ValueLabels.RHD_75to98
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

// PAVD chart.
c.inspector.ChartPanels.PAVD = ui.Panel();
c.inspector.ChartPanels.RHD = ui.Panel();

// Compose the panel of each metric type.
c.inspector.MetricTypePanels.footprint = 
  ui.Panel([
    c.inspector.TitleLabels.footprint,
    c.inspector.MetricPanels.rh98,
    c.inspector.MetricPanels.cover,
    c.inspector.MetricPanels.pai,
    c.inspector.MetricPanels.fhd_normal,
  ]);

c.inspector.MetricTypePanels.PAVD = 
  ui.Panel([
    c.inspector.TitleLabels.PAVD,
    ui.Panel({
      widgets: [
        ui.Panel([
          c.inspector.MetricPanels.PAVD_30_40m,
          c.inspector.MetricPanels.PAVD_20_30m,
          c.inspector.MetricPanels.PAVD_10_20m,
          c.inspector.MetricPanels.PAVD_0_10m
        ]),
        c.inspector.ChartPanels.PAVD
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

c.inspector.MetricTypePanels.RHD = 
  ui.Panel([
    c.inspector.TitleLabels.RHD,
    ui.Panel({
      widgets: [
        ui.Panel([
          c.inspector.MetricPanels.RHD_75to98,
          c.inspector.MetricPanels.RHD_50to75,
          c.inspector.MetricPanels.RHD_25to50
        ]),
        c.inspector.ChartPanels.RHD
      ],
      layout: ui.Panel.Layout.flow("horizontal")
    })
  ]);

// Compose the inspector panel.
c.inspector.inspectorContainerPanel = 
  ui.Panel({
    widgets: [
      c.inspector.MetricTypePanels.footprint,
      c.inspector.MetricTypePanels.PAVD,
      c.inspector.MetricTypePanels.RHD
    ],
    layout: ui.Panel.Layout.flow("horizontal")
  });

c.inspector.inspectorPanel = 
  ui.Panel([
    c.inspector.shownButton, 
    c.inspector.inspectorContainerPanel
  ]);


/*******************************************************************************
 * Composition *
 ******************************************************************************/

// Control panel.
c.controlPanel.add(c.info.panel);
c.controlPanel.add(c.dividers.divider1);
c.controlPanel.add(c.metricPanels.footprint);
c.controlPanel.add(c.dividers.divider2);
c.controlPanel.add(c.metricPanels.PAVD);
c.controlPanel.add(c.dividers.divider3);
c.controlPanel.add(c.metricPanels.RHD);
c.controlPanel.add(c.dividers.divider4);

// Map panel.
c.map.add(c.inspector.inspectorPanel);

ui.root.clear();
ui.root.add(c.controlPanel);
ui.root.add(c.map);


/*******************************************************************************
 * Styling *
 ******************************************************************************/

// Define CSS-like class style properties for widgets; reusable styles.
var s = {};

// Margin.
s.bigTopMargin = {
  margin: "24px 8px 8px 8px"
};

s.smallTopBottomMargin = {
  margin: "4px 8px"
};

s.noMargin = {
  margin: "0px"
};

// Text.
s.generalText = {
  fontSize: "13px",
  color: m.themeColors.darkGray
};

s.widgetTitle = {
  fontSize: "15px",
  fontWeight: "bold",
  margin: "8px 8px 4px 8px",
  color: m.themeColors.navyBlue
};

s.inspectorTitle = {
  fontSize: "14px",
  fontWeight: "bold",
  color: m.themeColors.navyBlue
};

s.boldText = {
  fontWeight: "bold"
};

s.colorText = {
  color: m.themeColors.navyBlue
};

// Stretch.
s.stretchHorizontal = {
  stretch: "horizontal"
};

// Background color.
s.opacityWhiteMed = {
  backgroundColor: "rgba(255, 255, 255, 0.5)"
};

s.divider = {
  backgroundColor: m.themeColors.lightGray,
  height: "4px",
  margin: "20px 0px"
};

// Chart.
s.styleChartAxis = {
  italic: false,
  bold: true
};

s.styleChartArea = {
  width: "150px",
  height: "200px",
  margin: "0px",
  padding: "0px"
}; 

// Set the styles of widgets in the control panel.
c.controlPanel.style()
  .set({
    width: "30%",
    padding: "0px"
  });

// Information panel.
c.info.titleLabel.style()
  .set({
    fontSize: "20px",
    fontWeight: "bold",
    color: m.themeColors.navyBlue
  })
  .set(s.bigTopMargin);

c.info.linkPanel.style()
  .set(s.generalText);

// Loop through setting the styles of 
//  introduction texts and web links.
Object.keys(c.info.introTitles)
  .forEach(function(key) {
    c.info.introTitles[key].style()
      .set({
        fontWeight: "bold"
      })
      .set(s.generalText)
      .set(s.smallTopBottomMargin);
  });

Object.keys(c.info.introLabels)
  .forEach(function(key) {
    c.info.introLabels[key].style()
      .set(s.generalText)
      .set(s.smallTopBottomMargin);
  });

Object.keys(c.info.webLinks)
  .forEach(function(key) {
    c.info.webLinks[key].style()
      .set(s.stretchHorizontal);
  });

// Metric selection labels.
Object.keys(c.metricTypeLabels)
  .forEach(function(key) {
    c.metricTypeLabels[key].style()
      .set(s.widgetTitle);
  });

// Checkboxes.
Object.keys(c.checkboxes)
  .forEach(function(key) {
    c.checkboxes[key].style()
      .set(s.stretchHorizontal)
      .set(s.generalText);
  });

c.checkboxes.allFootprint.style().set(s.boldText);
c.checkboxes.allPAVD.style().set(s.boldText);
c.checkboxes.allRHD.style().set(s.boldText);

// Legend color bars.
c.legendColorbars.footprint.setParams({
  bbox: [0, 0, 1, 0.15],
  dimensions: "100x15",
  format: "png",
  min: 0,
  max: 1,
  palette: m.visPalettes.NDVI
}).style().set({
  stretch: "horizontal",
  margin: "10px 8px 8px 8px",
  maxHeight: "20px"
});

c.legendColorbars.PAVD.setParams({
  bbox: [0, 0, 1, 0.15],
  dimensions: "100x15",
  format: "png",
  min: 0,
  max: 1,
  palette: m.visPalettes.viridis
}).style().set({
  stretch: "horizontal",
  margin: "10px 8px 8px 8px",
  maxHeight: "20px"
});

c.legendColorbars.RHD.setParams({
  bbox: [0, 0, 1, 0.15],
  dimensions: "100x15",
  format: "png",
  min: 0,
  max: 1,
  palette: m.visPalettes.magma
}).style().set({
  stretch: "horizontal",
  margin: "10px 8px 8px 8px",
  maxHeight: "20px"
});

// Legend labels.
Object.keys(c.legendLabels.min)
  .forEach(function(key) {
    c.legendLabels.min[key].style()
      .set(s.stretchHorizontal)
      .set(s.generalText)
      .set(s.boldText)
      .set({
        margin: "8px 0px",
        textAlign: "left"
      });
  });

Object.keys(c.legendLabels.max)
  .forEach(function(key) {
    c.legendLabels.max[key].style()
      .set(s.stretchHorizontal)
      .set(s.generalText)
      .set(s.boldText)
      .set({
        margin: "8px 0px",
        textAlign: "right"
      });
  });

// Loop through setting divider style.
Object.keys(c.dividers).forEach(function(key) {
  c.dividers[key].style()
    .set(s.divider);
});

// Set the style of the map panel.
c.map.style()
  .set({
    cursor: "crosshair"
  });

c.map.setOptions("hybrid");

c.map.setCenter(-75.843, 42.52, 5);

c.map.setControlVisibility({
  layerList: false,
  zoomControl: false,
  mapTypeControl: false, 
  fullscreenControl: false
});

// Point metric inspector style.
c.inspector.inspectorPanel.style()
  .set({
    position: "top-right" // Show the inspector panel (only the button).
  })
  .set(s.opacityWhiteMed);

c.inspector.inspectorContainerPanel.style()
  .set({shown: false}) // Hide the container panel.
  .set(s.noMargin);

c.inspector.shownButton.style()
  .set(s.noMargin)
  .set(s.generalText)
  .set(s.boldText);

// Chart panels.
Object.keys(c.inspector.ChartPanels)
  .forEach(function(key) {
    c.inspector.ChartPanels[key].style()
      .set({
        margin: "0px 0px 8px 0px",
      });
  });

// Loop through setting the styles of 
//  inspector titles, labels, and values.
Object.keys(c.inspector.TitleLabels)
  .forEach(function(key) {
    c.inspector.TitleLabels[key].style()
      .set(s.stretchHorizontal)
      .set(s.inspectorTitle);
  });

Object.keys(c.inspector.NameLabels)
  .forEach(function(key) {
    c.inspector.NameLabels[key].style()
      .set(s.generalText)
      .set(s.boldText);
  });

Object.keys(c.inspector.ValueLabels)
  .forEach(function(key) {
    c.inspector.ValueLabels[key].style()
      .set(s.generalText)
      .set(s.colorText);
  });


/*******************************************************************************
 * Behaviors *
 ******************************************************************************/

// Handles updating the map visualization of each footprint-level metric.
function UpdateDisplay_height() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.rh98.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.rh98, 
    {
      min: c.metricExtremes.min.rh98,
      max: c.metricExtremes.max.rh98,
      palette: m.visPalettes.NDVI
    }, 
    "Canopy height"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(0, mapLayer);
}

function UpdateDisplay_cover() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.cover.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.cover, 
    {
      min: c.metricExtremes.min.cover,
      max: c.metricExtremes.max.cover,
      palette: m.visPalettes.NDVI
    }, 
    "Canopy cover"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(1, mapLayer);
}

function UpdateDisplay_pai() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.pai.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.pai, 
    {
      min: c.metricExtremes.min.pai,
      max: c.metricExtremes.max.pai,
      palette: m.visPalettes.NDVI
    }, 
    "Total plant area index"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(2, mapLayer);
}

function UpdateDisplay_fhd() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.fhd_normal.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.fhd_normal, 
    {
      min: c.metricExtremes.min.fhd_normal,
      max: c.metricExtremes.max.fhd_normal,
      palette: m.visPalettes.NDVI
    }, 
    "Foliage height diversity"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(3, mapLayer);
}

// Handles updating the map visualization of each PAVD metric.
function UpdateDisplay_PAVD_0_10m() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.PAVD_0_10m.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.PAVD_0_10m, 
    {
      min: c.metricExtremes.min.PAVD,
      max: c.metricExtremes.max.PAVD,
      palette: m.visPalettes.viridis
    }, 
    "PAVD (0m ~ 10m)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(4, mapLayer);
}

function UpdateDisplay_PAVD_10_20m() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.PAVD_10_20m.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.PAVD_10_20m, 
    {
      min: c.metricExtremes.min.PAVD,
      max: c.metricExtremes.max.PAVD,
      palette: m.visPalettes.viridis
    }, 
    "PAVD (10m ~ 20m)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(5, mapLayer);
}

function UpdateDisplay_PAVD_20_30m() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.PAVD_20_30m.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.PAVD_20_30m, 
    {
      min: c.metricExtremes.min.PAVD,
      max: c.metricExtremes.max.PAVD,
      palette: m.visPalettes.viridis
    }, 
    "PAVD (20m ~ 30m)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(6, mapLayer);
}

function UpdateDisplay_PAVD_30_40m() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.PAVD_30_40m.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.PAVD_30_40m, 
    {
      min: c.metricExtremes.min.PAVD,
      max: c.metricExtremes.max.PAVD,
      palette: m.visPalettes.viridis
    }, 
    "PAVD (30m ~ 40m)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(7, mapLayer);
}

// Handles updating the map visualization of each RHD metric.
function UpdateDisplay_RHD_25to50() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.RHD_25to50.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.RHD_25to50, 
    {
      min: c.metricExtremes.min.RHD,
      max: c.metricExtremes.max.RHD,
      palette: m.visPalettes.magma
    }, 
    "RHD (25% ~ 50%)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(8, mapLayer);
}

function UpdateDisplay_RHD_50to75() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.RHD_50to75.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.RHD_50to75, 
    {
      min: c.metricExtremes.min.RHD,
      max: c.metricExtremes.max.RHD,
      palette: m.visPalettes.magma
    }, 
    "RHD (50% ~ 75%)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(9, mapLayer);
}

function UpdateDisplay_RHD_75to98() {
  
  // Get the state of the checkbox.
  var metricChecked = c.checkboxes.RHD_75to98.getValue();
  
  // Create a map layer.
  var mapLayer = ui.Map.Layer(
    m.metricImages.RHD_75to98, 
    {
      min: c.metricExtremes.min.RHD,
      max: c.metricExtremes.max.RHD,
      palette: m.visPalettes.magma
    }, 
    "RHD (75% ~ 98%)"
  ).setShown(metricChecked);
  
  // Update the map layer.
  c.map.layers().set(10, mapLayer);
}

// Handle the "all" display of each type of metrics.
function UpdateDisplay_allFootprint() {
  
  // Get the state of the "all" checkbox.
  var metricChecked = c.checkboxes.allFootprint.getValue();
  
  // Update the state of each metric checkbox.
  c.checkboxes.rh98.setValue(metricChecked);
  c.checkboxes.cover.setValue(metricChecked);
  c.checkboxes.pai.setValue(metricChecked);
  c.checkboxes.fhd_normal.setValue(metricChecked);
}

function UpdateDisplay_allPAVD() {
  
  // Get the state of the "all" checkbox.
  var metricChecked = c.checkboxes.allPAVD.getValue();
  
  // Update the state of each metric checkbox.
  c.checkboxes.PAVD_0_10m.setValue(metricChecked);
  c.checkboxes.PAVD_10_20m.setValue(metricChecked);
  c.checkboxes.PAVD_20_30m.setValue(metricChecked);
  c.checkboxes.PAVD_30_40m.setValue(metricChecked);
}

function UpdateDisplay_allRHD() {
  
  // Get the state of the "all" checkbox.
  var metricChecked = c.checkboxes.allRHD.getValue();
  
  // Update the state of each metric checkbox.
  c.checkboxes.RHD_25to50.setValue(metricChecked);
  c.checkboxes.RHD_50to75.setValue(metricChecked);
  c.checkboxes.RHD_75to98.setValue(metricChecked);
}

// Round a number.
function Round_Number(numberToRound_Num) {
  
  // Determine if the number is NULL.
  numberToRound_Num = ee.Algorithms.If(
    numberToRound_Num,
    numberToRound_Num, // Not NULL.
    0 // Is NULL.
  );
  
  // Round the number.
  var roundedNumber_Num = ee.Number(numberToRound_Num)
    .multiply(m.scalar)
    .round()
    .divide(m.scalar);
  
  return roundedNumber_Num;
}

// Handles map clicks for metric inspecting.
function Inspect_Point(coords) {
  // Get out if call to "Inspect_Point" did not come from map click 
  //   and the inspector has not been created previously.
  if (!coords.lon) {
    return null;
  }
  
  // Create a point Geometry.
  var point_Geom = ee.Geometry.Point([coords.lon, coords.lat]);
  
  // Show the inspector panel if this is the first time 
  //   a point is clicked.
  if (!c.inspector.inspectorPanel.style().get("shown")) {
    c.inspector.inspectorPanel.style()
      .set("shown", true);
  }
  
  // Show the inspector if hidden; assuming user wants to 
  //   update the inspector container.
  if (c.inspector.shownButton.getLabel() == "Show inspector") {
    c.inspector.inspectorContainerPanel.style()
      .set({shown: true});
    c.inspector.shownButton.setLabel("Hide inspector");
  }

  // Add the clicked point to map.
  var mapLayer = ui.Map.Layer(
    point_Geom, {color: m.themeColors.blue}, "Clicked point");
  c.map.layers().set(11, mapLayer);
  
  // Collect the metric values at the clicked point.
  var clickedMetricValues_Dict = m.metricImages.allMetrics
    .reduceRegion({
      reducer: ee.Reducer.first(), 
      geometry: point_Geom, 
      scale: 30, 
      crs: "EPSG:4326"
    });
  
  // Update the metric values in the inspector panel.
  Object.keys(m.metricNames).forEach(function(key) {
    
    // Extract the metric value.
    var metricValues_Num = Round_Number(
      clickedMetricValues_Dict.get(key)
    );
    
    // Update the metric label.
    c.inspector.ValueLabels[key].setValue(metricValues_Num.getInfo());
  });
  
  // Create a new PAVD chart.
  var y_PAVD_List = ee.List([5, 15, 25, 35]);
  
  var x_PAVD_List = ee.List([
    Round_Number(clickedMetricValues_Dict.get("PAVD_0_10m")),
    Round_Number(clickedMetricValues_Dict.get("PAVD_10_20m")),
    Round_Number(clickedMetricValues_Dict.get("PAVD_20_30m")),
    Round_Number(clickedMetricValues_Dict.get("PAVD_30_40m"))
  ]);
  
  var PAVD_Chart = ui.Chart.array.values({
    array: y_PAVD_List, 
    axis: 0, 
    xLabels: x_PAVD_List
  }).setOptions({
    titlePosition: "none",
    colors: ["287D8E"],
    hAxis: {
      title: m.metricTypeNames.PAVD,
      titleTextStyle: s.styleChartAxis
    },
    vAxis: {
      title: "Height interval (m)",
      titleTextStyle: s.styleChartAxis
    },
    lineSize: 4,
    pointSize: 6,
    legend: {position: "none"},
  });
  
  PAVD_Chart.style().set(s.styleChartArea);
  
  // Create a new RHD chart.
  var y_RHD_List = ee.List([37.5, 62.5, 87.5]);
  
  var x_RHD_List = ee.List([
    Round_Number(clickedMetricValues_Dict.get("RHD_25to50")),
    Round_Number(clickedMetricValues_Dict.get("RHD_50to75")),
    Round_Number(clickedMetricValues_Dict.get("RHD_75to98"))
  ]);
  
  var RHD_Chart = ui.Chart.array.values({
    array: y_RHD_List, 
    axis: 0, 
    xLabels: x_RHD_List
  }).setOptions({
    titlePosition: "none",
    colors: ["942C80"],
    hAxis: {
      title: m.metricTypeNames.RHD,
      titleTextStyle: s.styleChartAxis
    },
    vAxis: {
      title: "Vertical percentile (%)",
      titleTextStyle: s.styleChartAxis,
      viewWindow: {
        min: 25,
        max: 100
      }
    },
    lineSize: 4,
    pointSize: 6,
    legend: {position: "none"},
  });
  
  RHD_Chart.style().set(s.styleChartArea);
  
  // Draw the charts.
  c.inspector.ChartPanels.PAVD.widgets().reset([PAVD_Chart]);
  c.inspector.ChartPanels.RHD.widgets().reset([RHD_Chart]);
}

// Handles showing/hiding the inspector container panel.
function ShowHide_InspectorContainer() {
  
  var shown_Bool = true;
  
  var label_Str = "Hide inspector";
  
  if (c.inspector.shownButton.getLabel() == label_Str) {
    shown_Bool = false;
    
    label_Str = "Show inspector";
  }
  
  c.inspector.inspectorContainerPanel.style()
    .set({shown: shown_Bool});
  
  c.inspector.shownButton.setLabel(label_Str);
}

// Handles updating the clicked point coordinates
//   in the page's URL fragment.
function UpdateURLparam_ClickedPoint(newClickParams) {
  ui.url.set("click_lon", newClickParams.lon);
  ui.url.set("click_lat", newClickParams.lat);
}

// When any metric checkbox changes.
c.checkboxes.rh98.onChange(UpdateDisplay_height);
c.checkboxes.cover.onChange(UpdateDisplay_cover);
c.checkboxes.pai.onChange(UpdateDisplay_pai);
c.checkboxes.fhd_normal.onChange(UpdateDisplay_fhd);

c.checkboxes.PAVD_0_10m.onChange(UpdateDisplay_PAVD_0_10m);
c.checkboxes.PAVD_10_20m.onChange(UpdateDisplay_PAVD_10_20m);
c.checkboxes.PAVD_20_30m.onChange(UpdateDisplay_PAVD_20_30m);
c.checkboxes.PAVD_30_40m.onChange(UpdateDisplay_PAVD_30_40m);

c.checkboxes.RHD_25to50.onChange(UpdateDisplay_RHD_25to50);
c.checkboxes.RHD_50to75.onChange(UpdateDisplay_RHD_50to75);
c.checkboxes.RHD_75to98.onChange(UpdateDisplay_RHD_75to98);

// When the "all" checkboxes change.
c.checkboxes.allFootprint.onChange(UpdateDisplay_allFootprint);
c.checkboxes.allPAVD.onChange(UpdateDisplay_allPAVD);
c.checkboxes.allRHD.onChange(UpdateDisplay_allRHD);

// Map panel.
c.map.onClick(Inspect_Point);
c.map.onClick(UpdateURLparam_ClickedPoint);

// Inspector.
c.inspector.shownButton.onClick(ShowHide_InspectorContainer);


/*******************************************************************************
 * Initialize *
 ******************************************************************************/

// Map layers.
UpdateDisplay_height();
UpdateDisplay_cover();
UpdateDisplay_pai();
UpdateDisplay_fhd();

UpdateDisplay_PAVD_0_10m();
UpdateDisplay_PAVD_10_20m();
UpdateDisplay_PAVD_20_30m();
UpdateDisplay_PAVD_30_40m();

UpdateDisplay_RHD_25to50();
UpdateDisplay_RHD_50to75();
UpdateDisplay_RHD_75to98();

// Inspect a local if applicable 
//   (coordinates exist as URL parameters).
Inspect_Point({
  lon: ui.url.get("click_lon"), 
  lat: ui.url.get("click_lat")
});

