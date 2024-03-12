# ##############################################################################
# Introduction:
#   1) Spatio-temporally sub-sample the eBird observations.
# 
# Last updated: 3/11/2024.
# ##############################################################################


# 1) Setup ----------------------------------------------------------------

# Load packages.
library(sf)
library(tidyverse)
library(ebirdst) # Data sub-sampling.
library(ggspatial)
library(gridExtra)

# Set the theme of plots.
theme_set(theme_bw())

# Set the working directory.
setwd("C:/Postdoc/NSF_LiDAR-Birds/LiDAR-Birds")


# 2) Dataset loading ------------------------------------------------------

# Read the pre-processed eBird data of all the selected species.
gpkg_FilePath <- "Results/Forest_Species_CA_NV.gpkg"

allSpecies_sf <- st_read(
  dsn = gpkg_FilePath,
  layer = "zerofilled_AllSpecies",
  stringsAsFactors = TRUE)

glimpse(allSpecies_sf)
summary(allSpecies_sf)

# Load the study area.
studyArea <- st_read(
  dsn = file.path(
    "Data",
    "Study_Sites",
    "Sierra_Nevada_US_GMBAv2_Standard",
    "Sierra_Nevada_US_GMBAv2_Standard.shp"
  ),
  stringsAsFactors = TRUE
)

glimpse(studyArea)

# Transform the CRS of the study area.
studyArea_Transformed <- studyArea |> 
  st_transform(crs = st_crs(allSpecies_sf))

st_crs(allSpecies_sf)
st_crs(studyArea_Transformed)


# 3) Data sub-sampling ----------------------------------------------------

## 3.1 Data conversion.
# Convert the sf object to a regular data frame.
allSpecies_df <- allSpecies_sf |> 
  st_drop_geometry()

# Add the coordinates back.
checklistCoords <- allSpecies_sf |> 
  st_coordinates() |> 
  as.data.frame()

allSpecies_df <- allSpecies_df |> 
  mutate(
    longitude = checklistCoords$X,
    latitude = checklistCoords$Y
  )


## 3.2 Spatio-temporal sub-sampling by species

# Sample one checklist per 3km x 3km x 1 week grid for each year.
#   (Sample detection/non-detection independently.)
allSpecies_SubSampled <- grid_sample_stratified(
  allSpecies_df,
  obs_column = "species_observed",
  sample_by = "scientific_name")

# Compare the sample sizes before and after sub-sampling.
nrow(allSpecies_SubSampled) / nrow(allSpecies_df) # 0.08583193.

allSpecies_SubSampled |> 
  group_by(scientific_name) |> 
  summarise(new_N = n()) |> 
  cbind(
    allSpecies_df |> 
      group_by(scientific_name) |> 
      summarise(n = n()) |> 
      select(n)
  ) |> 
  mutate(
    ratio = new_N / n
  )

# Check the prevalence of detections.
allSpecies_df |> 
  count(species_observed) |> 
  mutate(percent = n / sum(n)) # True: 19.3%.

allSpecies_SubSampled |> 
  count(species_observed) |> 
  mutate(percent = n / sum(n)) # True: 22.8%.


## 3.3 Result output
# Convert the dataset to point features.
glimpse(allSpecies_SubSampled)

allSpecies_SubSampled_sf <- allSpecies_SubSampled |> 
  st_as_sf(coords = c("longitude", "latitude"),
           crs = 4326)

# Save the point features.
st_write(obj = allSpecies_SubSampled_sf,
         dsn = gpkg_FilePath,
         layer = "allSpecies_SubSampled",
         delete_layer = TRUE)

# Save the point features as a shapefile.
if (!dir.exists("Results/allSpecies_SubSampled")) {
  dir.create("Results/allSpecies_SubSampled")
}

st_write(obj = allSpecies_SubSampled_sf,
         dsn = "Results/allSpecies_SubSampled/allSpecies_SubSampled.shp",
         delete_layer = TRUE)


# 4) Visualization --------------------------------------------------------

# Before sub-sampling.
allObs_BySpecies <- 
  ggplot() +
  # Add a base map.
  annotation_map_tile(type = "cartolight",
                      zoom = 7) +
  # Study area.
  geom_sf(data = studyArea_Transformed, 
          fill = "transparent", 
          color = "black", 
          size = 1) +
  # Non-detection.
  geom_sf(data = allSpecies_sf |> 
            filter(!species_observed),
          alpha = 0.1,
          color = "#555555",
          size = 0.1, 
          shape = 19) + 
  # Detection.
  geom_sf(data = allSpecies_sf |> 
            filter(species_observed),
          aes(color = scientific_name),
          alpha = 0.1,
          size = 0.1, 
          shape = 19) +
  facet_wrap(~ scientific_name,
             nrow = 1) +
  labs(title = "eBird Observations During 2019-2022",
       subtitle = "(Before sub-sampling)") +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    axis.text = element_text(size = 6)
  ) +
  coord_sf(crs = 4326) # Ensure proper aspect ratio.

# After sub-sampling.
subSampled_BySpecies <- 
  ggplot() +
  # Add a base map.
  annotation_map_tile(type = "cartolight",
                      zoom = 7) +
  # Study area.
  geom_sf(data = studyArea_Transformed, 
          fill = "transparent", 
          color = "black", 
          size = 1) +
  # Non-detection.
  geom_sf(data = allSpecies_SubSampled_sf |> 
            filter(!species_observed),
          alpha = 0.1,
          color = "#555555",
          size = 0.1, 
          shape = 19) + 
  # Detection.
  geom_sf(data = allSpecies_SubSampled_sf |> 
            filter(species_observed),
          aes(color = scientific_name),
          alpha = 0.1,
          size = 0.1, 
          shape = 19) +
  facet_wrap(~ scientific_name,
             nrow = 1) +
  labs(title = "eBird Observations During 2019-2022",
       subtitle = "(After sub-sampling)") +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    plot.subtitle = element_text(hjust = 0.5),
    legend.position = "none",
    axis.text = element_text(size = 6)
  ) +
  coord_sf(crs = 4326) # Ensure proper aspect ratio.

# Output the figures.
png(filename = "Results/Figures/subSampling_BySpecies.png", 
    width = 2000, height = 2000, 
    units = "px", res = 200)

grid.arrange(allObs_BySpecies, 
             subSampled_BySpecies,
             nrow = 2)

dev.off()

